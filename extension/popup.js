// popup.js
// Minimal popup: shows local notes (full text) and a single "See Full Notes" button.
// Clicking URL opens page with text-fragment highlight.

const noteList = document.getElementById('noteList');
const fullNotesBtn = document.getElementById('fullNotesBtn');

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSnippet(text) {
  if (!text) return '';
  let s = text.replace(/\s+/g, ' ').trim();
  if (s.length > 240) s = s.slice(0, 240);
  return s;
}

function buildTextFragmentUrl(originalUrl, quote) {
  const snippet = normalizeSnippet(quote);
  if (!originalUrl) return '#';
  try {
    const u = new URL(originalUrl);
    const baseHash = u.hash ? u.hash.slice(1) : '';
    const cleanedBaseHash = baseHash.replace(/:?~:text=[^&]*/g, '').replace(/(^&|&&)/g, '');
    const tf = `:~:text=${encodeURIComponent(snippet)}`;
    const newHash = cleanedBaseHash ? `${cleanedBaseHash}&${tf}` : tf;
    u.hash = newHash;
    return u.toString();
  } catch (e) {
    return originalUrl.split('#')[0] + '#:~:text=' + encodeURIComponent(snippet);
  }
}

function renderLocalNotes() {
  chrome.storage.local.get({ notes: [] }, (data) => {
    const notes = data.notes || [];
    noteList.innerHTML = '';
    if (!notes.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No local notes yet. Highlight text on a page and use "Save to StudySnip".';
      noteList.appendChild(li);
      return;
    }

    notes.forEach((note, i) => {
      const li = document.createElement('li');
      li.className = 'popup-note';

      const urlSafe = escapeHtml(note.url || '');
      const quoteSafe = escapeHtml(note.quote || '');
      const commentSafe = escapeHtml(note.comment || '');

      const fragUrl = buildTextFragmentUrl(note.url || '', note.quote || '');

      li.innerHTML = `
        <div class="popup-quote">"${quoteSafe}"</div>
        <a class="popup-link" href="${fragUrl}" target="_blank" rel="noopener noreferrer">${urlSafe}</a>
        <div class="popup-comment">${commentSafe || '<i>No comment</i>'}</div>
      `;
      noteList.appendChild(li);
    });
  });
}

fullNotesBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fullnotes.html') });
});

document.addEventListener('DOMContentLoaded', renderLocalNotes);
