// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToStudySnip",
    title: "Save to StudySnip",
    contexts: ["selection"]
  });
});

// When user right-clicks and selects “Save to StudySnip”
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToStudySnip" && info.selectionText) {
    const selectedText = info.selectionText.replace(/\s+/g, " ").trim();
    const shortFragment = encodeURIComponent(selectedText.slice(0, 60));
    const highlightUrl = `${info.pageUrl}#:~:text=${shortFragment}`;

    const note = {
      quote: selectedText,
      url: highlightUrl,
      comment: "Add a note...",
      group: "default"
    };

    // Save locally
    chrome.storage.local.get({ notes: [] }, data => {
      const updatedNotes = [...data.notes, note];
      chrome.storage.local.set({ notes: updatedNotes }, () => {
        console.log("Note saved successfully!");
      });
    });
  }
});
