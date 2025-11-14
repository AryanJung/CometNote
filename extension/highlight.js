// highlight.js

function normalizeWhitespace(str) {
  return (str || "").replace(/\s+/g, " ").trim();
}

function surroundCurrentSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0).cloneRange();

  const mark = document.createElement("mark");
  mark.style.backgroundColor = "yellow";
  mark.style.padding = "2px";
  mark.style.borderRadius = "3px";
  mark.style.fontWeight = "bold";

  try {
    range.surroundContents(mark);
    return mark;
  } catch (e) {
    return null;
  }
}

function tryBrowserFind(text) {
  // Use built-in find to locate text across nodes; works on many pages
  // Match case-insensitive disabled, wrap enabled, search in frame
  const found = typeof window.find === "function"
    ? window.find(text, false, false, true, false, false, false)
    : false;
  if (!found) return null;
  return surroundCurrentSelection();
}

function tryTreeWalker(text) {
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  const target = normalizeWhitespace(text);

  while ((node = walk.nextNode())) {
    const raw = node.nodeValue || "";
    // Fast path: direct indexOf
    let idx = raw.indexOf(text);
    if (idx === -1) {
      // Fallback: compare with collapsed whitespace when nodes contain newlines/tabs
      const collapsed = normalizeWhitespace(raw);
      idx = collapsed.indexOf(target);
      if (idx === -1) continue;
      // When whitespace-collapsed match is found, skip to next node as mapping back is messy
      // Rely on window.find in most cases; treeWalker only handles simple cases reliably
      continue;
    }

    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + text.length);

    const mark = document.createElement("mark");
    mark.style.backgroundColor = "yellow";
    mark.style.padding = "2px";
    mark.style.borderRadius = "3px";
    mark.style.fontWeight = "bold";

    try {
      range.surroundContents(mark);
      return mark;
    } catch (e) {
      return null;
    }
  }

  return null;
}

function highlightTextRobust(text) {
  if (!text) return null;
  // Prefer browser native find for better cross-node matching
  let mark = tryBrowserFind(text);
  if (mark) return mark;
  // Fallback to simple tree walker for exact node matches
  mark = tryTreeWalker(text);
  return mark;
}

function scheduleHighlightWithRetries(text) {
  const MAX_ATTEMPTS = 10;
  let attempts = 0;

  function attempt() {
    const mark = highlightTextRobust(text);
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      chrome.storage.local.remove("highlightText");
      return;
    }
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) {
      setTimeout(attempt, 500);
    } else {
      chrome.storage.local.remove("highlightText");
    }
  }

  // Also observe DOM mutations for SPA/content-late-load
  const observer = new MutationObserver(() => {
    const mark = highlightTextRobust(text);
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      chrome.storage.local.remove("highlightText");
      observer.disconnect();
    }
  });
  try {
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  } catch (e) {
    // ignore observer errors
  }

  attempt();
}

function initHighlightListener() {
  chrome.storage.local.get("highlightText", (data) => {
    const text = data && data.highlightText;
    if (!text) return;
    // small delay to allow initial content to render
    setTimeout(() => scheduleHighlightWithRetries(text), 600);
  });
}

// Run on both DOMContentLoaded and load to cover different loading strategies
if (document.readyState === "complete" || document.readyState === "interactive") {
  initHighlightListener();
} else {
  window.addEventListener("DOMContentLoaded", initHighlightListener);
}
window.addEventListener("load", initHighlightListener);
