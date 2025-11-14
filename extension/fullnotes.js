document.addEventListener("DOMContentLoaded", () => {
  const notesContainer = document.getElementById("notesContainer");
  const groupTabs = document.getElementById("groupTabs");
  const manageGroupsBtn = document.getElementById("manageGroupsBtn");
  const groupModal = document.getElementById("groupModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const createGroupBtn = document.getElementById("createGroupBtn");
  const newGroupName = document.getElementById("newGroupName");
  const groupList = document.getElementById("groupList");
  const toast = document.getElementById("toast");

  const editModal = document.getElementById("editModal");
  const editCommentTextarea = document.getElementById("editCommentTextarea");
  const saveEditBtn = document.getElementById("saveEditBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  const moveModal = document.getElementById("moveModal");
  const moveGroupSelect = document.getElementById("moveGroupSelect");
  const moveConfirmBtn = document.getElementById("moveConfirmBtn");
  const moveCancelBtn = document.getElementById("moveCancelBtn");

  let notes = [];
  let groups = [];
  let activeGroup = "all";
  let editingNoteIndex = null;
  let movingNoteIndex = null;

  // Toast helper
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  }

  // Load notes & groups from storage
  function loadData() {
    chrome.storage.local.get(["notes", "groups"], data => {
      notes = data.notes || [];
      groups = data.groups || [];
      renderTabs();
      renderNotes();
    });
  }

  // Save notes & groups
  function saveData() {
    chrome.storage.local.set({ notes, groups });
  }

  // Render group tabs
  function renderTabs() {
    groupTabs.innerHTML = `<button class="tab ${activeGroup === "all" ? "active" : ""}" data-group="all">All</button>`;
    groups.forEach(g => {
      const btn = document.createElement("button");
      btn.className = `tab ${activeGroup === g ? "active" : ""}`;
      btn.dataset.group = g;
      btn.textContent = g;
      groupTabs.appendChild(btn);
    });
  }

  // Render notes filtered by activeGroup
  function renderNotes() {
    notesContainer.innerHTML = "";
    const filtered = activeGroup === "all" ? notes : notes.filter(n => n.group === activeGroup);

    if (filtered.length === 0) {
      notesContainer.innerHTML = `<p style="text-align:center;color:#94a3b8;font-size:16px;padding:60px 20px;grid-column:1/-1;">No notes in this group yet.</p>`;
      return;
    }

    filtered.forEach((note, i) => {
      const card = document.createElement("div");
      card.className = "note-card";

      card.innerHTML = `
        <p>${note.quote}</p>
        <a href="#" class="note-link">🔗 Open Source</a>
        <p class="comment">💬 ${note.comment || ''}</p>
        <button class="note-menu-btn" title="Options">⋮</button>
      `;

      // Open source link with highlight via content script
      const link = card.querySelector(".note-link");
      link.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.storage.local.set({ highlightText: note.quote }, () => {
          // Open the saved URL (may already include a Text Fragment)
          window.open(note.url, "_blank", "noopener,noreferrer");
        });
      });

      const menuBtn = card.querySelector(".note-menu-btn");
      menuBtn.addEventListener("click", e => {
        e.stopPropagation();
        openNoteMenu(e, i, card);
      });

      notesContainer.appendChild(card);
    });
  }

  // Note menu popup (edit, move, delete)
  function openNoteMenu(event, noteIndex, card) {
    closeAllMenus();

    const menu = document.createElement("div");
    menu.className = "menu-popup";
    menu.style.top = event.clientY + "px";
    menu.style.left = event.clientX + "px";

    menu.innerHTML = `
      <button class="edit-comment-btn">✏️ Edit Comment</button>
      <button class="move-note-btn">📦 Move to Group</button>
      <button class="delete-note-btn" style="color:#ff6b6b;">🗑️ Delete Note</button>
    `;

    document.body.appendChild(menu);

    menu.querySelector(".edit-comment-btn").addEventListener("click", () => {
      editingNoteIndex = noteIndex;
      editCommentTextarea.value = notes[noteIndex].comment || "";
      openModal(editModal);
      menu.remove();
    });

    menu.querySelector(".move-note-btn").addEventListener("click", () => {
      movingNoteIndex = noteIndex;
      populateMoveGroups();
      openModal(moveModal);
      menu.remove();
    });

    menu.querySelector(".delete-note-btn").addEventListener("click", () => {
      if (confirm("Delete this note?")) {
        notes.splice(noteIndex, 1);
        saveData();
        renderNotes();
        showToast("Note deleted");
      }
      menu.remove();
    });

    document.addEventListener("click", closeAllMenus, { once: true });

    function closeAllMenus() {
      document.querySelectorAll(".menu-popup").forEach(m => m.remove());
    }
  }

  // Populate move modal group select
  function populateMoveGroups() {
    moveGroupSelect.innerHTML = "";
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      moveGroupSelect.appendChild(opt);
    });
  }

  // Modal helpers
  function openModal(modal) {
    modal.style.display = "flex";
  }
  function closeModal(modal) {
    modal.style.display = "none";
  }

  // Manage groups modal events
  manageGroupsBtn.addEventListener("click", () => {
    renderGroupList();
    openModal(groupModal);
  });
  closeModalBtn.addEventListener("click", () => closeModal(groupModal));
  createGroupBtn.addEventListener("click", () => {
    const val = newGroupName.value.trim();
    if (!val) return showToast("Enter group name");
    if (groups.includes(val)) return showToast("Group already exists");
    groups.push(val);
    saveData();
    renderTabs();
    renderGroupList();
    newGroupName.value = "";
    showToast("Group created");
  });

  // Render groups inside manage groups modal
  function renderGroupList() {
    groupList.innerHTML = "";
    if (groups.length === 0) {
      groupList.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;font-size:14px;">No groups created yet.</p>`;
      return;
    }
    groups.forEach(g => {
      const div = document.createElement("div");
      div.className = "group-item";
      div.innerHTML = `
        <span>${g}</span>
        <button style="background:linear-gradient(135deg, #00d4ff 0%, #06b6d4 100%);color:#0f172a;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,212,255,0.3);">Delete</button>
      `;
      div.querySelector("button").addEventListener("click", () => {
        if (confirm(`Delete group "${g}" and all its notes?`)) {
          groups = groups.filter(grp => grp !== g);
          notes = notes.filter(n => n.group !== g);
          saveData();
          renderTabs();
          renderNotes();
          renderGroupList();
          showToast("Group deleted");
        }
      });
      groupList.appendChild(div);
    });
  }

  // Edit comment modal events
  const editModalSaveHandler = () => {
    const newComment = editCommentTextarea.value.trim();
    if (editingNoteIndex === null) return;
    notes[editingNoteIndex].comment = newComment;
    saveData();
    renderNotes();
    closeModal(editModal);
    showToast("Comment updated");
  };

  cancelEditBtn.addEventListener("click", () => closeModal(editModal));
  saveEditBtn.addEventListener("click", editModalSaveHandler);

  // Move note modal events
  moveCancelBtn.addEventListener("click", () => closeModal(moveModal));
  moveConfirmBtn.addEventListener("click", () => {
    if (movingNoteIndex === null) return;
    const selectedGroup = moveGroupSelect.value;
    if (!selectedGroup) {
      alert("Select a group");
      return;
    }
    notes[movingNoteIndex].group = selectedGroup;
    saveData();
    renderNotes();
    closeModal(moveModal);
    showToast("Note moved");
  });

  // Group tabs click
  groupTabs.addEventListener("click", e => {
    if (e.target.classList.contains("tab")) {
      activeGroup = e.target.dataset.group;
      renderTabs();
      renderNotes();
    }
  });

  // Highlight jump code on page load
  function highlightQuoteFromURL() {
    const hash = window.location.hash;
    if (!hash.startsWith("#highlight=")) return;

    try {
      const quote = decodeURIComponent(hash.split("highlight=")[1]);
      if (!quote) return;

      // Simple text search and highlight on page:
      // You might want to improve this to handle multiple occurrences or partial matches.
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        const node = walk.currentNode;
        const idx = node.textContent.indexOf(quote);
        if (idx !== -1) {
          const span = document.createElement("span");
          span.style.backgroundColor = "#ffea0040";
          span.style.transition = "background-color 2s ease";
          span.textContent = quote;

          const after = node.splitText(idx);
          after.textContent = after.textContent.substring(quote.length);
          node.parentNode.insertBefore(span, after);

          // Scroll smoothly to highlighted text
          span.scrollIntoView({ behavior: "smooth", block: "center" });

          // Remove highlight after 3 seconds
          setTimeout(() => {
            span.style.backgroundColor = "transparent";
          }, 3000);

          break;
        }
      }
    } catch (e) {
      // invalid URI or error - fail silently
    }
  }

  // Run highlight on load
  highlightQuoteFromURL();

  // Initial load
  loadData();
});
