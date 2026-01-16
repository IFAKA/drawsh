const toggleBtn = document.getElementById('toggleBtn');

function updateButton(isActive) {
  if (isActive) {
    toggleBtn.textContent = 'Stop Drawing';
    toggleBtn.classList.add('active');
  } else {
    toggleBtn.textContent = 'Start Drawing';
    toggleBtn.classList.remove('active');
  }
}

// Check if we can run on this page and get current state
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    toggleBtn.textContent = 'Not available here';
    toggleBtn.disabled = true;
    return;
  }

  chrome.storage.local.get(['drawshActive'], (result) => {
    updateButton(result.drawshActive || false);
  });
});

// Toggle on click
toggleBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we can run on this page
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    toggleBtn.textContent = 'Not available on this page';
    toggleBtn.disabled = true;
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: 'toggle' }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script not loaded - reload the page
      toggleBtn.textContent = 'Reload page first';
      toggleBtn.disabled = true;
      return;
    }
    if (response) {
      updateButton(response.active);
    }
  });
});
