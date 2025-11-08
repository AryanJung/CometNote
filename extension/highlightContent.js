// highlightContent.js
(function () {
  try {
    // Helper to find element that is already highlighted by native text-fragment:
    function nativeHighlightExists(needle) {
      // Many browsers insert a ::target text highlight; detecting reliably is hard.
      // We'll check if any <mark> or elements containing the needle exist in DOM already.
      // If the page was natively highlighted, usually you'll find the exact text in DOM.
      const text = needle.trim();
      if (!text) return false;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      while (walker.nextNode()) {
        const val = walker.currentNode.nodeValue;
        if (val && val.indexOf(text) !== -1) return true;
      }
      return false;
    }

    // Extract text fragment from URL (handles '#:~:text=...' or '#...&:~:text=...')
    function getTextFragmentFromUrl() {
      const href = window.location.href || '';
      const idx = href.indexOf(':~:text=');
      if (idx === -1) return null;
      const frag = href.slice(idx + ':~:text='.length);
      // frag might contain further characters after, try to decode up to end or next '&'
      // When URL includes additional params in hash, browsers keep them; decodeURIComponent fully.
      try {
        // try to decode entire frag (safe)
        const decoded = decodeURIComponent(frag);
        // sometimes decoded contains encoded separators — just trim
        return decoded.split('&')[0];
      } catch (e) {
        // fallback: find raw until next '&'
        return frag.split('&')[0];
      }
    }

    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Try to highlight by finding the first matching text node and wrapping it
    function highlightFallback(needle) {
      if (!needle) return false;
      const text = needle.replace(/\+/g, ' ').trim();
      if (!text) return false;

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      const needleEsc = escapeRegExp(text);
      const regex = new RegExp(needleEsc, 'i'); // case-insensitive to be forgiving

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const val = node.nodeValue;
        if (!val) continue;
        const match = val.match(regex);
        if (match) {
          const start = match.index;
          const end = start + match[0].length;
          // create range and wrap
          try {
            const range = document.createRange();
            range.setStart(node, start);
            range.setEnd(node, end);
            const mark = document.createElement('mark');
            mark.style.backgroundColor = '#ffd54f';
            mark.style.color = '#000';
            mark.style.padding = '2px 4px';
            mark.style.borderRadius = '4px';
            mark.style.boxShadow = '0 0 8px rgba(255,213,79,0.6)';
            range.surroundContents(mark);
            mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // fade effect
            setTimeout(() => { mark.style.boxShadow = '0 0 0 rgba(0,0,0,0)'; }, 1500);
            return true;
          } catch (err) {
            // fallback: split text node
            const before = val.slice(0, start);
            const matched = val.slice(start, end);
            const after = val.slice(end);
            const parent = node.parentNode;
            const beforeNode = document.createTextNode(before);
            const afterNode = document.createTextNode(after);
            const mark = document.createElement('mark');
            mark.textContent = matched;
            mark.style.backgroundColor = '#ffd54f';
            mark.style.color = '#000';
            mark.style.padding = '2px 4px';
            mark.style.borderRadius = '4px';
            mark.style.boxShadow = '0 0 8px rgba(255,213,79,0.6)';
            parent.insertBefore(beforeNode, node);
            parent.insertBefore(mark, node);
            parent.insertBefore(afterNode, node);
            parent.removeChild(node);
            mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { mark.style.boxShadow = '0 0 0 rgba(0,0,0,0)'; }, 1500);
            return true;
          }
        }
      }
      return false;
    }

    // Main runner: get fragment, then either let native do its thing or fallback
    const rawFragment = getTextFragmentFromUrl();
    if (!rawFragment) return;

    // decoded fragment may have prefix/suffix markers like '-'
    let needle;
    try {
      needle = decodeURIComponent(rawFragment);
    } catch (e) {
      needle = rawFragment;
    }
    // clean + strip common markers
    needle = needle.replace(/^[\s"'`-]+|[\s"'`-]+$/g, '').trim();
    if (!needle) return;

    // If native highlight already present, do nothing.
    // Give the browser a short window to apply native text-fragment scrolling/highlight.
    const tryNativeThenFallback = () => {
      // If native highlight detected, we consider success.
      if (nativeHighlightExists(needle)) {
        // nothing to do — but scroll to first occurrence if not already visible
        const found = document.evaluate(`//text()[contains(translate(., '${needle.toUpperCase()}', '${needle.toLowerCase()}'), '${needle.toLowerCase()}')]`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (found && found.snapshotLength > 0) {
          const node = found.snapshotItem(0);
          // create a temporary range to scroll
          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getBoundingClientRect();
          if (rect) window.scrollTo({ top: window.scrollY + rect.top - (window.innerHeight / 3), behavior: 'smooth' });
        }
        return;
      }
      // Fallback: try to find and highlight manually.
      const ok = highlightFallback(needle);
      if (!ok) {
        // Try again after a short delay (useful for SPAs)
        setTimeout(() => {
          highlightFallback(needle);
        }, 800);
      }
    };

    // Wait for load and then try
    if (document.readyState === 'complete') {
      setTimeout(tryNativeThenFallback, 250);
    } else {
      window.addEventListener('load', () => setTimeout(tryNativeThenFallback, 250));
      // also try after DOMContentLoaded for SPAs
      window.addEventListener('DOMContentLoaded', () => setTimeout(tryNativeThenFallback, 500));
    }
  } catch (err) {
    console.error('highlightContent error:', err);
  }
})();
