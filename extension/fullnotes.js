// fullnotes.js with group filter dropdown added

const cardsContainer = document.getElementById('cardsContainer');
const addGroupBtn = document.getElementById('addGroupBtn');
const groupModal = document.getElementById('groupModal');
const groupNameInput = document.getElementById('groupNameInput');
const groupTokenInput = document.getElementById('groupTokenInput');
const createGroupConfirm = document.getElementById('createGroupConfirm');
const createGroupCancel = document.getElementById('createGroupCancel');

const moveModal = document.getElementById('moveModal');
const moveGroupSelect = document.getElementById('moveGroupSelect');
const moveConfirm = document.getElementById('moveConfirm');
const moveCancel = document.getElementById('moveCancel');

const editModal = document.getElementById('editModal');
const editCommentTextarea = document.getElementById('editCommentTextarea');
const editSaveBtn = document.getElementById('editSaveBtn');
const editCancelBtn = document.getElementById('editCancelBtn');

const refreshBtn = document.getElementById('refreshBtn');

const groupFilterSelect = document.getElementById('groupFilterSelect');

let notes = [];
let savedGroupTokens = {}; // { name: token }
let noteIndexBeingEdited = null;
let noteIndexToMove = null;
let currentGroupFilter = ''; // '' = show all

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateRandomToken(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < len; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
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

function loadAll() {
  chrome.storage.local.get({ notes: [], savedGroupTokens: {} }, (data) => {
    notes = data.notes || [];
    savedGroupTokens = data.savedGroupTokens || {};
    renderGroupFilterOptions();
    renderCards();
  });
}

function saveNotes() {
  chrome.storage.local.set({ notes });
}

function saveGroups() {
  chrome.storage.local.set({ savedGroupTokens });
}

function renderGroupFilterOptions() {
  groupFilterSelect.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = 'All Notes';
  groupFilterSelect.appendChild(allOpt);

  for (const name in savedGroupTokens) {
    const opt = document.createElement('option');
    opt.value = savedGroupTokens[name];
    opt.textContent = name;
    groupFilterSelect.appendChild(opt);
  }

  groupFilterSelect.value = currentGroupFilter;
}

function renderCards() {
  cardsContainer.innerHTML = '';
  let filteredNotes = notes;
  if (currentGroupFilter) {
    filteredNotes = notes.filter(n => n.groupToken === currentGroupFilter);
  }

  if (!filteredNotes.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = currentGroupFilter ? 'No notes in this group.' : 'No notes saved yet.';
    cardsContainer.appendChild(empty);
    return;
  }

  filteredNotes.forEach((note, i) => {
    const card = document.createElement('div');
    card.className = 'card';

    const quote = escapeHtml(note.quote || '');
    const urlSafe = escapeHtml(note.url || '');
    const comment = escapeHtml(note.comment || '');
    const groupToken = note.groupToken || '';
    const sharedBy = groupToken ? (Object.keys(savedGroupTokens).find(k => savedGroupTokens[k] === groupToken) || groupToken) : 'Local';

    const link = buildTextFragmentUrl(note.url || '', note.quote || '');

    card.innerHTML = `
      <div class="card-top">
        <div class="card-quote">"${quote}"</div>
        <div class="card-menu">⋮</div>
      </div>
      <a class="card-url" href="${link}" target="_blank" rel="noopener noreferrer">${urlSafe}</a>
      <div class="card-comment"><strong>Comment:</strong> ${comment || '<i>No comment</i>'}</div>
      <div class="card-meta"><strong>Shared by:</strong> ${escapeHtml(sharedBy)}</div>
      <div class="card-actions"></div>
    `;

    const menu = card.querySelector('.card-menu');
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
      showCardMenu(i, card, menu);
    });

    cardsContainer.appendChild(card);
  });
}

function showCardMenu(index, cardElem, menuElem) {
  const existing = document.querySelector('.card-popup-menu');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'card-popup-menu';
  popup.innerHTML = `
    <button class="menu-edit">✏️ Edit Comment</button>
    <button class="menu-move">📦 Move to Group</button>
    <button class="menu-copy">🌐 Copy Link</button>
    <button class="menu-delete">🗑️ Delete</button>
  `;

  const rect = menuElem.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top = (rect.bottom + 6) + 'px';
  popup.style.left = (rect.left - 6) + 'px';
  document.body.appendChild(popup);

  popup.querySelector('.menu-edit').addEventListener('click', () => {
    noteIndexBeingEdited = index;
    editCommentTextarea.value = notes[index].comment || '';
    openModal(editModal);
    popup.remove();
  });

  popup.querySelector('.menu-move').addEventListener('click', () => {
    noteIndexToMove = index;
    populateMoveSelect();
    openModal(moveModal);
    popup.remove();
  });

  popup.querySelector('.menu-copy').addEventListener('click', async () => {
    const note = notes[index];
    const url = buildTextFragmentUrl(note.url || '', note.quote || '');
    try {
      await navigator.clipboard.writeText(url);
      flashToast('Link copied to clipboard');
    } catch (e) {
      alert('Copy failed: ' + e.message);
    }
    popup.remove();
  });

  popup.querySelector('.menu-delete').addEventListener('click', () => {
    if (!confirm('Delete this note?')) { popup.remove(); return; }
    notes.splice(index, 1);
    saveNotes();
    renderCards();
    popup.remove();
  });

  function onDocClick(ev) {
    if (!popup.contains(ev.target)) {
      popup.remove();
      document.removeEventListener('click', onDocClick);
    }
  }
  setTimeout(() => document.addEventListener('click', onDocClick), 10);
}

function openModal(mod) {
  mod.classList.remove('hidden');
}

function closeModal(mod) {
  mod.classList.add('hidden');
}

addGroupBtn.addEventListener('click', () => {
  groupNameInput.value = '';
  groupTokenInput.value = '';
  openModal(groupModal);
});

createGroupCancel.addEventListener('click', () => closeModal(groupModal));

createGroupConfirm.addEventListener('click', () => {
  const name = groupNameInput.value.trim();
  let token = groupTokenInput.value.trim();
  if (!name) return alert('Enter a group name');
  if (!token) token = generateRandomToken(6);
  savedGroupTokens[name] = token;
  saveGroups();
  closeModal(groupModal);
  flashToast(`Group "${name}" created`);
  renderGroupFilterOptions();
  renderCards();
});

function populateMoveSelect() {
  moveGroupSelect.innerHTML = '';
  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '-- select group --';
  moveGroupSelect.appendChild(optNone);

  for (const name in savedGroupTokens) {
    const opt = document.createElement('option');
    opt.value = savedGroupTokens[name];
    opt.textContent = `${name} (${savedGroupTokens[name]})`;
    moveGroupSelect.appendChild(opt);
  }
}

moveCancel.addEventListener('click', () => closeModal(moveModal));

moveConfirm.addEventListener('click', () => {
  const token = moveGroupSelect.value;
  if (!token) return alert('Choose a group');
  if (noteIndexToMove === null) return;
  notes[noteIndexToMove].groupToken = token;
  saveNotes();
  closeModal(moveModal);
  renderCards();
  flashToast('Note moved to group');
});

editCancelBtn.addEventListener('click', () => { noteIndexBeingEdited = null; closeModal(editModal); });

editSaveBtn.addEventListener('click', () => {
  if (noteIndexBeingEdited === null) return;
  notes[noteIndexBeingEdited].comment = editCommentTextarea.value;
  saveNotes();
  noteIndexBeingEdited = null;
  closeModal(editModal);
  renderCards();
  flashToast('Comment saved');
});

function flashToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('visible'), 10);
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 2000);
}

refreshBtn.addEventListener('click', loadAll);

groupFilterSelect.addEventListener('change', () => {
  currentGroupFilter = groupFilterSelect.value;
  renderCards();
});

document.addEventListener('DOMContentLoaded', loadAll);
