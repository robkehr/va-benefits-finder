import json
import os
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import Mock, patch

import server


class ListingValidationTests(unittest.TestCase):
    def test_extracts_chrono24_listing_identifier(self):
        listing = server.parse_listing(
            {"listingUrl": "https://www.chrono24.com/rolex-watch--id12345678.htm?utm_source=mail"}
        )
        self.assertEqual(listing["marketplace"], "Chrono24")
        self.assertEqual(listing["listing_id"], "12345678")
        self.assertTrue(listing["direct"])

    def test_extracts_regional_ebay_listing_identifier(self):
        listing = server.parse_listing({"listingUrl": "www.ebay.co.uk/itm/watch-name/123456789012"})
        self.assertEqual(listing["marketplace"], "eBay")
        self.assertEqual(listing["listing_id"], "123456789012")

    def test_rejects_spoofed_host_and_embedded_credentials(self):
        for value in (
            "https://www.ebay.com.attacker.example/itm/123456789012",
            "https://user:pass@www.ebay.com/itm/123456789012",
            "https://www.ebay.com:444/itm/123456789012",
        ):
            with self.subTest(value=value), self.assertRaises(server.AppError):
                server.parse_listing({"listingUrl": value})

    def test_sanitizes_optional_search_terms(self):
        seller = server.clean_search_phrase('Seller" OR site:attacker.example', "Seller name", 120)
        model = server.clean_search_phrase("Omega\nSpeedmaster", "Watch model", 180)
        self.assertNotIn('"', seller)
        self.assertNotIn("\n", model)
        self.assertEqual(model, "Omega Speedmaster")


class ResearchTests(unittest.TestCase):
    def test_builds_listing_seller_and_model_searches(self):
        listing = server.parse_listing(
            {"listingUrl": "https://www.ebay.com/itm/123456789012"}
        )
        queries = server.build_queries(listing, "Rob's Watches", "Omega Speedmaster")
        self.assertEqual(len(queries), 3)
        self.assertIn('"123456789012"', queries[0]["query"])
        self.assertIn("Rob's Watches", queries[1]["query"])
        self.assertIn("Omega Speedmaster", queries[2]["query"])

    def test_returns_cited_results_and_explicit_partial_failures(self):
        listing = server.parse_listing(
            {"listingUrl": "https://www.ebay.com/itm/123456789012"}
        )

        def partial_search(query, api_key):
            if query.startswith("eBay watch seller"):
                raise server.SearchProviderError("Seller search failed.")
            return [{"title": "A result", "url": "https://example.com/source", "description": "A snippet"}]

        report = server.run_research(listing, "", "", "test-key", partial_search)
        self.assertEqual(report["status"], "partial")
        self.assertEqual(report["successfulSearches"], 2)
        self.assertEqual(report["resultCount"], 2)
        self.assertEqual(report["queries"][1]["error"], "Seller search failed.")
        self.assertEqual(report["queries"][0]["results"][0]["url"], "https://example.com/source")

    def test_rejects_missing_api_key_before_searching(self):
        listing = server.parse_listing({"listingUrl": "https://www.ebay.com/itm/123456789012"})
        with self.assertRaises(server.AppError) as error:
            server.run_research(listing, "", "", "")
        self.assertEqual(error.exception.status, 503)

    def test_sends_api_key_in_header_and_parses_results(self):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = json.dumps(
            {"web": {"results": [{"title": "Listing", "url": "https://example.com/item", "description": "Watch"}]}}
        ).encode()

        with patch("server.urlopen", return_value=response) as open_url:
            results = server.search_brave("site:ebay.com 123456789012", "local-test-key")

        request = open_url.call_args.args[0]
        self.assertEqual(request.get_header("X-subscription-token"), "local-test-key")
        self.assertEqual(results[0]["title"], "Listing")
        self.assertEqual(results[0]["url"], "https://example.com/item")


class HttpHandlerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.DialCheckHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.httpd.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.thread.join()
        cls.httpd.server_close()

    def post(self, content_type="application/json", origin=None):
        headers = {"Content-Type": content_type}
        if origin:
            headers["Origin"] = origin
        request = Request(
            f"{self.base_url}/api/analyze",
            data=json.dumps({"listingUrl": "https://www.ebay.com/itm/123456789012"}).encode(),
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(request) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_api_allows_local_origin_and_reports_missing_key(self):
        origin = self.base_url
        with patch.dict(os.environ, {"BRAVE_SEARCH_API_KEY": ""}):
            status, body = self.post(origin=origin)
        self.assertEqual(status, 503)
        self.assertIn("BRAVE_SEARCH_API_KEY", body["error"])

    def test_api_rejects_cross_origin_and_non_json_requests(self):
        status, _ = self.post(origin="https://attacker.example")
        self.assertEqual(status, 403)
        status, _ = self.post(content_type="application/x-www-form-urlencoded")
        self.assertEqual(status, 415)


if __name__ == "__main__":
    unittest.main()
