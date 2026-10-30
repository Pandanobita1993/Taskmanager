// Content Script for TaskFlow BHXH Helper
(function () {
  document.documentElement.dataset.bhxhExtensionReady = 'true';

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'taskflow-bhxh-app') return;

    const { id, action, payload } = event.data;

    if (action === 'PING') {
      window.postMessage({
        source: 'taskflow-bhxh-ext',
        id,
        success: true,
        version: '1.0.0'
      }, '*');
      return;
    }

    chrome.runtime.sendMessage({ action, payload }, (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage({
          source: 'taskflow-bhxh-ext',
          id,
          success: false,
          error: chrome.runtime.lastError.message
        }, '*');
      } else {
        window.postMessage({
          source: 'taskflow-bhxh-ext',
          id,
          ...response
        }, '*');
      }
    });
  });

  // Notify page that extension is ready
  window.postMessage({ source: 'taskflow-bhxh-ext', action: 'READY' }, '*');
})();
