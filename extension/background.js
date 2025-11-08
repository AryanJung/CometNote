// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToStudySnip",
    title: "Save to StudySnip",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "saveToStudySnip") return;

  const note = {
    quote: info.selectionText || '',
    url: info.pageUrl || (tab && tab.url) || '',
    comment: ''
  };

  chrome.storage.local.get({ notes: [] }, (data) => {
    const notes = data.notes || [];
    notes.unshift(note); // newest first
    chrome.storage.local.set({ notes });
  });
});
