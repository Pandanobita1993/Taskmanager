// Content Script for TaskFlow BHXH Helper
(function () {
  function isContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  if (!isContextValid()) return;

  if (document.documentElement) {
    document.documentElement.dataset.bhxhExtensionReady = 'true';
  }

  function onWindowMessage(event) {
    if (event.source !== window || !event.data || event.data.source !== 'taskflow-bhxh-app') return;

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
          version: '1.1.1'
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
              ...response
            },
            '*'
          );
        }
      });
    } catch {
      // Context invalidated mid-call: detach silently so new content script or fallback handles it
      window.removeEventListener('message', onWindowMessage);
    }
  }

  window.addEventListener('message', onWindowMessage);
  window.postMessage({ source: 'taskflow-bhxh-ext', action: 'READY', version: '1.1.1' }, '*');
})();
