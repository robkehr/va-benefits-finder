const form = document.querySelector("#listing-form");
const urlInput = document.querySelector("#listing-url");
const errorMessage = document.querySelector("#url-error");
const results = document.querySelector("#results");
const details = document.querySelector("#watch-model");
const sellerName = document.querySelector("#seller-name");
const webSearchStatus = document.querySelector("#web-search-status");
const webSearchMessage = document.querySelector("#web-search-message");
const webResults = document.querySelector("#web-results");
let latestScan = 0;

const marketplaceDomains = [
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
];

function isMarketplaceHost(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getListingInfo(rawValue) {
  const value = rawValue.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let url;

  try {
    url = new URL(withProtocol);
  } catch {
    return { error: "Enter a complete Chrono24 or eBay listing link." };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { error: "Use a web link that starts with https:// or http://." };
  }
  const expectedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== expectedPort) {
    return { error: "Custom ports are not supported for marketplace links." };
  }
  if (url.username || url.password) {
    return { error: "Links with embedded usernames or passwords are not supported." };
  }

  const domain = marketplaceDomains.find((candidate) => isMarketplaceHost(url.hostname.toLowerCase(), candidate));
  if (!domain) {
    return { error: "For this first version, paste a direct link from Chrono24 or eBay." };
  }

  const isChrono24 = domain === "chrono24.com";
  const path = url.pathname;
  const ebayItemMatch = path.match(/\/itm\/(?:[^/]+\/)?(\d{9,15})(?:\/|$)/i)
    || path.match(/\/itm\/(\d{9,15})(?:\/|$)/i);
  const chronoIdMatch = path.match(/(?:^|\/)[^/]*?id(\d{5,})(?:\.|\/|$)/i);
  const listingId = isChrono24
    ? chronoIdMatch?.[1] ?? null
    : ebayItemMatch?.[1] ?? null;
  const usesHttps = url.protocol === "https:";
  const hasTracking = [...url.searchParams.keys()].some((key) => /^(utm_|mkcid$|mkevt$|toolid$|campid$|customid$)/i.test(key));

  return {
    url,
    domain,
    marketplace: isChrono24 ? "Chrono24" : "eBay",
    listingId,
    usesHttps,
    hasTracking,
    isDirectListing: isChrono24
      ? Boolean(listingId)
      : /\/itm\//i.test(path) && Boolean(listingId),
  };
}

function setError(message) {
  results.hidden = true;
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  urlInput.setAttribute("aria-invalid", "true");
  urlInput.focus();
}

function addSignal(label, value, neutral = false) {
  const row = document.createElement("div");
  row.className = "signal-row";

  const name = document.createElement("span");
  name.textContent = label;
  const result = document.createElement("span");
  result.className = neutral ? "signal-value neutral" : "signal-value";
  result.textContent = value;
  row.append(name, result);
  document.querySelector("#signal-list").append(row);
}

function makeSearchLink(label, query) {
  const link = document.createElement("a");
  link.className = "research-link";
  link.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const text = document.createElement("span");
  text.textContent = label;
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  link.append(text, arrow);
  return link;
}

function buildResearch(info) {
  const list = document.querySelector("#research-list");
  list.replaceChildren();

  const listingQuery = info.listingId
    ? `site:${info.domain} "${info.listingId}"`
    : `site:${info.domain} "${info.url.pathname}"`;
  list.append(makeSearchLink("Search for this exact listing", listingQuery));

  const seller = sellerName.value.trim();
  if (seller) {
    list.append(makeSearchLink("Search seller name and feedback", `"${seller}" ${info.marketplace} seller reviews`));
  } else {
    list.append(makeSearchLink(`Search seller reports on ${info.marketplace}`, `"${info.marketplace}" watch seller scam complaints`));
  }

  const watch = details.value.trim();
  if (watch) {
    list.append(makeSearchLink("Look up this model and reference", `"${watch}" watch buying guide authenticity`));
  } else {
    list.append(makeSearchLink("Search this listing path for copied text", `site:${info.domain} "${info.url.pathname}" watch listing`));
  }
  list.append(makeSearchLink("Search for common watch-buying red flags", `${info.marketplace} watch buying scam red flags off-platform payment`));
}

function setWebSearchStatus(state, message) {
  webSearchStatus.className = `web-search-status ${state}`;
  webSearchMessage.textContent = message;
}

function renderWebResults(report) {
  webResults.replaceChildren();
  for (const query of report.queries) {
    const section = document.createElement("section");
    section.className = "web-query";
    const heading = document.createElement("div");
    heading.className = "web-query-heading";
    const title = document.createElement("h4");
    title.textContent = query.label;
    const count = document.createElement("span");
    count.className = "web-query-count";

    if (query.error) {
      count.textContent = "SEARCH FAILED";
      const error = document.createElement("p");
      error.className = "web-query-error";
      error.textContent = query.error;
      heading.append(title, count);
      section.append(heading, error);
      webResults.append(section);
      continue;
    }

    const found = Array.isArray(query.results) ? query.results : [];
    count.textContent = `${found.length} ${found.length === 1 ? "result" : "results"}`;
    const queryText = document.createElement("p");
    queryText.className = "web-query-text";
    queryText.textContent = query.query;
    heading.append(title, count);
    section.append(heading, queryText);

    if (!found.length) {
      const empty = document.createElement("p");
      empty.className = "web-query-empty";
      empty.textContent = "No results were returned for this search.";
      section.append(empty);
    } else {
      const list = document.createElement("div");
      list.className = "web-result-list";
      for (const result of found) {
        let resultUrl;
        try {
          resultUrl = new URL(result.url);
        } catch {
          continue;
        }
        if (!["http:", "https:"].includes(resultUrl.protocol)) continue;

        const item = document.createElement("article");
        item.className = "web-result";
        const link = document.createElement("a");
        link.className = "web-result-link";
        link.href = resultUrl.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = result.title;
        const host = document.createElement("span");
        host.className = "web-result-host";
        host.textContent = resultUrl.hostname;
        const description = document.createElement("p");
        description.className = "web-result-description";
        description.textContent = result.description || "No description was provided.";
        item.append(link, host, description);
        list.append(item);
      }
      section.append(list);
    }
    webResults.append(section);
  }
}

async function runWebSearch(info) {
  const scanId = ++latestScan;
  webResults.replaceChildren();
  setWebSearchStatus("loading", "Running three Brave searches for listing references, seller reputation, and model warnings…");

  const listingUrl = new URL(info.url.href);
  listingUrl.search = "";
  listingUrl.hash = "";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingUrl: listingUrl.href,
        sellerName: sellerName.value.trim(),
        watchModel: details.value.trim(),
      }),
    });
    let report;
    try {
      report = await response.json();
    } catch {
      throw new Error("The local server returned an unreadable response.");
    }
    if (!response.ok) throw new Error(report.error || `The search request failed (HTTP ${response.status}).`);
    if (scanId !== latestScan) return;

    renderWebResults(report);
    const outcome = report.status === "partial" ? "Partial web search" : "Web search complete";
    const resultWord = report.resultCount === 1 ? "result" : "results";
    setWebSearchStatus(
      report.status === "partial" ? "error" : "complete",
      `${outcome}: ${report.successfulSearches} of 3 searches returned ${report.resultCount} ${resultWord}. Review each source; this is not a verdict about the listing.`,
    );
  } catch (error) {
    if (scanId !== latestScan) return;
    const message = window.location.protocol === "file:"
      ? "Automated search needs the local server. Run `python server.py` and open http://127.0.0.1:8000."
      : error.message || "Could not complete the web search.";
    setWebSearchStatus("error", message);
  }
}

function updateAssessment() {
  const assessment = document.querySelector("#assessment");
  const text = document.querySelector("#assessment-text");
  const selectedFlags = [...document.querySelectorAll("[data-flag]:checked")].map((checkbox) => checkbox.dataset.flag);
  const verified = [...document.querySelectorAll("[data-verified]:checked")].length;
  assessment.className = "assessment";

  if (selectedFlags.includes("offsite") || selectedFlags.includes("pressure")) {
    assessment.classList.add("urgent");
    text.textContent = "Pause before proceeding. Off-platform payment requests or pressure are strong reasons to stop and contact the marketplace.";
  } else if (selectedFlags.length) {
    assessment.classList.add("concern");
    text.textContent = "You noted a potential warning sign. Investigate it independently and do not pay until your concerns are resolved.";
  } else if (verified === 4) {
    assessment.classList.add("progress");
    text.textContent = "You marked all four checks as verified. This is useful due diligence, but it does not authenticate the watch or guarantee a safe transaction.";
  } else if (verified) {
    assessment.classList.add("progress");
    text.textContent = `${verified} of 4 checks marked verified. Keep reviewing the remaining details; these self-checks are not a safety verdict.`;
  } else {
    text.textContent = "Not enough evidence yet. A supported link is not a safety verdict.";
  }
}

function showResults(info) {
  document.querySelector("#signal-list").replaceChildren();
  document.querySelectorAll("[data-verified], [data-flag]").forEach((checkbox) => {
    checkbox.checked = false;
  });
  const title = document.querySelector("#summary-title");
  const description = document.querySelector("#summary-description");
  const icon = document.querySelector("#summary-icon");
  const summaryKicker = document.querySelector("#summary-kicker");
  const signals = document.querySelector("#signal-list");

  if (info.isDirectListing) {
    summaryKicker.textContent = "LINK FORMAT";
    title.textContent = "This looks like a supported listing link.";
    description.textContent = `${info.marketplace} link structure recognized. This does not tell us if the seller or watch is legitimate.`;
    icon.className = "summary-icon";
    addSignal("Marketplace domain", info.marketplace);
    addSignal("Listing identifier", info.listingId);
  } else {
    summaryKicker.textContent = "LINK FORMAT";
    title.textContent = `This appears to be a ${info.marketplace} link, but may not be a direct listing.`;
    description.textContent = "Check that the link opens the exact item you are considering before relying on any research.";
    icon.className = "summary-icon";
    addSignal("Marketplace domain", info.marketplace);
    addSignal("Listing identifier", "Not recognized", true);
  }

  addSignal("Connection", info.usesHttps ? "HTTPS" : "HTTP — less secure", !info.usesHttps);
  addSignal("Tracking parameters", info.hasTracking ? "Removed from search links" : "None detected", !info.hasTracking);

  const source = document.querySelector("#source-link");
  source.href = info.url.href;
  buildResearch(info);
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
  updateAssessment();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  urlInput.removeAttribute("aria-invalid");

  if (!urlInput.value.trim()) {
    setError("Paste a Chrono24 or eBay listing link to get started.");
    return;
  }

  const info = getListingInfo(urlInput.value);
  if (info.error) {
    setError(info.error);
    return;
  }

  if (!info.usesHttps) {
    info.url.port = "";
    info.url.protocol = "https:";
  }

  showResults(info);
  void runWebSearch(info);
});

urlInput.addEventListener("input", () => {
  errorMessage.hidden = true;
  urlInput.removeAttribute("aria-invalid");
});

document.querySelector("#paste-button").addEventListener("click", async () => {
  if (!navigator.clipboard?.readText) {
    urlInput.focus();
    errorMessage.textContent = "Clipboard access is unavailable here. Paste your link into the field.";
    errorMessage.hidden = false;
    return;
  }

  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText) {
      urlInput.value = clipboardText.trim();
      errorMessage.hidden = true;
      urlInput.focus();
    }
  } catch {
    errorMessage.textContent = "Clipboard permission was not granted. Paste your link into the field instead.";
    errorMessage.hidden = false;
  }
});

document.querySelectorAll("[data-verified], [data-flag]").forEach((checkbox) => {
  checkbox.addEventListener("change", updateAssessment);
});
