// Content Script for TaskFlow BHXH Helper (Chrome, Cốc Cốc, Edge & Firefox)
(function () {
  const extApi = typeof browser !== 'undefined' ? browser : typeof chrome !== 'undefined' ? chrome : null;

  function isContextValid() {
    try {
      return Boolean(extApi && extApi.runtime && extApi.runtime.id);
    } catch {
      return false;
    }
  }

  if (!isContextValid()) return;

  if (document.documentElement) {
    document.documentElement.dataset.bhxhExtensionReady = 'true';
  }

  function onWindowMessage(event) {
    if (!event.data || event.data.source !== 'taskflow-bhxh-app') return;

    // If extension was reloaded, detach this orphaned content script silently
    if (!isContextValid()) {
      window.removeEventListener('message', onWindowMessage);
      return;
    }

    const { id, action, payload } = event.data;

    if (action === 'PING') {
      window.postMessage(
        {
          source: 'taskflow-bhxh-ext',
          id,
          success: true,
          version: '1.1.2'
        },
        '*'
      );
      return;
    }

    try {
      chrome.runtime.sendMessage({ action, payload }, (response) => {
        const lastErr = chrome.runtime && chrome.runtime.lastError;
        if (lastErr) {
          if (/Extension context invalidated/i.test(lastErr.message || '')) {
            window.removeEventListener('message', onWindowMessage);
            return;
          }
          window.postMessage(
            {
              source: 'taskflow-bhxh-ext',
              id,
              success: false,
              error: lastErr.message
            },
            '*'
          );
        } else {
          window.postMessage(
            {
              source: 'taskflow-bhxh-ext',
              id,
              ...(response || {})
            },
            '*'
          );
        }
      });
    } catch {
      // Context invalidated mid-call: detach silently
      window.removeEventListener('message', onWindowMessage);
    }
  }

  window.addEventListener('message', onWindowMessage);
  window.postMessage({ source: 'taskflow-bhxh-ext', action: 'READY', version: '1.1.2' }, '*');
})();
