import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
MAX_REQUEST_BYTES = 16_384
MARKETPLACE_DOMAINS = (
    "chrono24.com",
    "ebay.com",
    "ebay.co.uk",
    "ebay.de",
    "ebay.fr",
    "ebay.it",
    "ebay.es",
    "ebay.ca",
    "ebay.com.au",
    "ebay.co.jp",
    "ebay.nl",
    "ebay.ie",
    "ebay.ch",
    "ebay.at",
    "ebay.be",
    "ebay.pl",
    "ebay.com.sg",
    "ebay.com.hk",
    "ebay.in",
    "ebay.com.mx",
)


class AppError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


class SearchProviderError(Exception):
    pass


def marketplace_match(hostname):
    return next(
        (
            domain
            for domain in MARKETPLACE_DOMAINS
            if hostname == domain or hostname.endswith(f".{domain}")
        ),
        None,
    )


def parse_listing(payload):
    if not isinstance(payload, dict):
        raise AppError(400, "The request body must be a JSON object.")

    raw_url = payload.get("listingUrl")
    if not isinstance(raw_url, str) or not raw_url.strip() or len(raw_url) > 2048:
        raise AppError(400, "Provide a listing URL under 2,048 characters.")

    value = raw_url.strip()
    if not re.match(r"^[a-z][a-z\d+.-]*://", value, re.IGNORECASE):
        value = f"https://{value}"

    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as error:
        raise AppError(400, "That listing URL is not valid.") from error

    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise AppError(400, "Use a Chrono24 or eBay web link.")
    if parsed.username or parsed.password:
        raise AppError(400, "Links with embedded usernames or passwords are not supported.")
    expected_port = 80 if parsed.scheme == "http" else 443
    if port not in (None, expected_port):
        raise AppError(400, "Custom ports are not supported for marketplace links.")

    hostname = parsed.hostname.lower()
    domain = marketplace_match(hostname)
    if not domain:
        raise AppError(400, "Only Chrono24 and eBay listing links are supported.")

    marketplace = "Chrono24" if domain == "chrono24.com" else "eBay"
    is_chrono24 = marketplace == "Chrono24"
    ebay_match = re.search(r"/itm/(?:[^/]+/)?(\d{9,15})(?:/|$)", parsed.path, re.IGNORECASE)
    chrono_match = re.search(r"(?:^|/)[^/]*?id(\d{5,})(?:\.|/|$)", parsed.path, re.IGNORECASE)
    listing_id = (chrono_match.group(1) if is_chrono24 and chrono_match else None)
    if not is_chrono24 and ebay_match:
        listing_id = ebay_match.group(1)

    return {
        "domain": domain,
        "marketplace": marketplace,
        "listing_id": listing_id,
        "path": parsed.path or "/",
        "direct": bool(listing_id),
    }


def clean_search_phrase(value, field_name, limit):
    if value is None:
        return ""
    if not isinstance(value, str):
        raise AppError(400, f"{field_name} must be text.")
    phrase = re.sub(r"[\x00-\x1f\x7f\"\\]+", " ", value)
    return " ".join(phrase.split())[:limit]


def build_queries(listing, seller, model):
    listing_term = listing["listing_id"] or listing["path"]
    queries = [
        {
            "label": "Listing references",
            "query": f'site:{listing["domain"]} "{listing_term}"',
        },
        {
            "label": "Seller reputation",
            "query": (
                f'"{seller}" {listing["marketplace"]} watch seller reviews complaints scam'
                if seller
                else f'{listing["marketplace"]} watch seller complaints scam reviews'
            ),
        },
        {
            "label": "Watch model and buyer warnings",
            "query": (
                f'"{model}" watch reference counterfeit scam buyer warnings'
                if model
                else f'{listing["marketplace"]} watch listing red flags payment seller'
            ),
        },
    ]
    return queries


def search_brave(query, api_key):
    request_url = f"{BRAVE_SEARCH_URL}?{urlencode({'q': query, 'count': 5})}"
    request = Request(
        request_url,
        headers={
            "Accept": "application/json",
            "X-Subscription-Token": api_key,
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            data = json.loads(response.read())
    except HTTPError as error:
        if error.code in (401, 403):
            raise SearchProviderError("Brave rejected the API key. Check your local BRAVE_SEARCH_API_KEY setting.") from error
        if error.code == 429:
            raise SearchProviderError("Brave Search rate limit reached. Wait a little before trying again.") from error
        raise SearchProviderError(f"Brave Search returned HTTP {error.code}.") from error
    except (URLError, TimeoutError) as error:
        raise SearchProviderError("Could not connect to Brave Search. Check your internet connection and try again.") from error
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise SearchProviderError("Brave Search returned an unreadable response.") from error

    if not isinstance(data, dict) or not isinstance(data.get("web"), dict):
        raise SearchProviderError("Brave Search returned an unexpected response format.")
    web_results = data["web"].get("results", [])
    if not isinstance(web_results, list):
        raise SearchProviderError("Brave Search returned an unexpected results format.")

    results = []
    for item in web_results[:5]:
        if not isinstance(item, dict):
            continue
        result_url = item.get("url")
        title = item.get("title")
        if not isinstance(result_url, str) or not isinstance(title, str):
            continue
        try:
            result_scheme = urlsplit(result_url).scheme
        except ValueError:
            continue
        if result_scheme not in ("http", "https"):
            continue
        results.append(
            {
                "title": title[:500],
                "url": result_url[:2048],
                "description": str(item.get("description", ""))[:1200],
            }
        )
    return results


def run_research(listing, seller, model, api_key, search_fn=search_brave):
    if not api_key:
        raise AppError(
            503,
            "Brave Search is not configured. Set BRAVE_SEARCH_API_KEY in this terminal and restart the app.",
        )

    queries = build_queries(listing, seller, model)
    completed = [None] * len(queries)
    with ThreadPoolExecutor(max_workers=len(queries)) as executor:
        futures = {
            executor.submit(search_fn, query["query"], api_key): index
            for index, query in enumerate(queries)
        }
        for future in as_completed(futures):
            index = futures[future]
            try:
                completed[index] = {"results": future.result()}
            except SearchProviderError as error:
                completed[index] = {"error": str(error)}

    for index, outcome in enumerate(completed):
        queries[index].update(outcome)

    successful_queries = sum("error" not in query for query in queries)
    if not successful_queries:
        errors = "; ".join(dict.fromkeys(query["error"] for query in queries))
        raise AppError(502, errors or "Brave Search could not complete these searches.")

    result_count = sum(len(query.get("results", [])) for query in queries)
    return {
        "status": "complete" if successful_queries == len(queries) else "partial",
        "searchedAt": datetime.now(timezone.utc).isoformat(),
        "marketplace": listing["marketplace"],
        "listingIdentifierFound": listing["direct"],
        "successfulSearches": successful_queries,
        "resultCount": result_count,
        "queries": queries,
    }


class DialCheckHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; "
            "img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        )
        super().end_headers()

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/analyze":
            self.send_json(404, {"error": "Endpoint not found."})
            return
        allowed_origins = {
            f"http://127.0.0.1:{self.server.server_port}",
            f"http://localhost:{self.server.server_port}",
        }
        origin = self.headers.get("Origin")
        if origin and origin not in allowed_origins:
            self.send_json(403, {"error": "Cross-origin requests are not allowed."})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(415, {"error": "Content-Type must be application/json."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "Invalid request length."})
            return
        if length <= 0 or length > MAX_REQUEST_BYTES:
            self.send_json(413, {"error": "Request must be between 1 byte and 16 KB."})
            return

        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Request body must contain valid JSON."})
            return

        try:
            listing = parse_listing(payload)
            seller = clean_search_phrase(payload.get("sellerName"), "Seller name", 120)
            model = clean_search_phrase(payload.get("watchModel"), "Watch model", 180)
            report = run_research(
                listing,
                seller,
                model,
                os.environ.get("BRAVE_SEARCH_API_KEY", "").strip(),
            )
        except AppError as error:
            self.send_json(error.status, {"error": str(error)})
            return

        self.send_json(200, report)


def main():
    try:
        port = int(os.environ.get("PORT", "8000"))
    except ValueError:
        print("PORT must be a number.", file=sys.stderr)
        return 2
    if not 1 <= port <= 65535:
        print("PORT must be between 1 and 65535.", file=sys.stderr)
        return 2

    server = ThreadingHTTPServer(("127.0.0.1", port), DialCheckHandler)
    print(f"DialCheck is running at http://127.0.0.1:{port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping DialCheck.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
