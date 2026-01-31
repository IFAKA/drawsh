chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-drawsh') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      }
    });
  }
});
