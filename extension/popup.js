// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const notesList = document.getElementById("notes");
  const seeFullNotes = document.getElementById("seeFullNotes");

  function loadNotes() {
    chrome.storage.local.get({ notes: [] }, data => {
      notesList.innerHTML = "";
      if (data.notes.length === 0) {
        notesList.innerHTML = "<p style='color:#94a3b8;text-align:center;padding:20px;'>No notes saved yet.</p>";
        return;
      }

      data.notes.forEach((note, index) => {
        const div = document.createElement("div");
        div.className = "noteCard";
        const commentText = note.comment || "Add a note...";
        const isPlaceholder = commentText === "Add a note...";
        
        div.innerHTML = `
          <blockquote style="margin:0 0 8px 0;color:#e0f2fe;font-size:14px;line-height:1.5;">"${note.quote}"</blockquote>
          <p class="comment-text" data-note-index="${index}" style="font-size:12px; color:#94a3b8;margin:0 0 8px 0;opacity:${isPlaceholder ? '0.6' : '0.9'};cursor:pointer;padding:4px;border-radius:4px;transition:all 0.2s;" title="Click to edit comment">${commentText}</p>
          <a href="#" class="openLink" style="color:#00d4ff;text-decoration:none;font-size:13px;font-weight:500;">Open Source</a>
        `;

        // Open link + trigger highlight
        div.querySelector(".openLink").addEventListener("click", (e) => {
          e.preventDefault();
          chrome.storage.local.set({ highlightText: note.quote }, () => {
            chrome.tabs.create({ url: note.url });
          });
        });

        // Make comment editable
        const commentEl = div.querySelector(".comment-text");
        commentEl.addEventListener("click", () => {
          editComment(index, commentText);
        });
        
        commentEl.addEventListener("mouseenter", () => {
          commentEl.style.background = "rgba(0, 212, 255, 0.15)";
        });
        
        commentEl.addEventListener("mouseleave", () => {
          commentEl.style.background = "transparent";
        });

        notesList.appendChild(div);
      });
    });
  }

  // Edit comment function
  function editComment(noteIndex, currentComment) {
    const newComment = prompt("Edit comment:", currentComment === "Add a note..." ? "" : currentComment);
    if (newComment !== null) {
      chrome.storage.local.get({ notes: [] }, (data) => {
        const notes = data.notes;
        if (notes[noteIndex]) {
          notes[noteIndex].comment = newComment.trim() || "";
          chrome.storage.local.set({ notes: notes }, () => {
            loadNotes();
          });
        }
      });
    }
  }

  // Go to full notes page
  seeFullNotes.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("fullnotes.html") });
  });

  loadNotes();
});
