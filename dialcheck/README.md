# DialCheck

DialCheck is a local browser app for researching Chrono24 and eBay watch listings. It checks the listing URL format, runs three targeted Brave web searches, presents cited results, and provides a buyer-controlled verification checklist.

## Run it

Python 3.9 or newer is required. No packages need to be installed.

From the workspace root, open PowerShell and start DialCheck in its subfolder:

```powershell
Set-Location .\dialcheck
$env:BRAVE_SEARCH_API_KEY = "your-brave-search-api-key"
python server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The server binds to localhost only. To change the port, set `PORT` before starting it.

Get an API key from the [Brave Search API](https://brave.com/search/api/). Each listing review makes three search requests, subject to your provider plan and limits. Keep the key in the terminal environment; do not put it in frontend files or commit it.

## Privacy

The browser sends the marketplace URL without its query parameters or fragment to your local server. That server sends Brave a query containing the marketplace, listing ID or path, and any optional seller name or watch model you entered. The app does not save listings or search results. Manual search links are also available.

## What the results mean

The app shows search-result titles, snippets, and source links; it does not crawl listing pages, inspect images, authenticate a watch, verify a seller, estimate market value, or produce a fraud verdict. Search results may be incomplete, stale, or about a different seller or watch. Review the cited sources and keep payment and communication on-platform.

## Tests

From `dialcheck\`, run the backend unit tests with:

```powershell
python -m unittest -v test_server
```
