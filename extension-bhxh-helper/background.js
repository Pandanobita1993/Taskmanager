// Background Service Worker for TaskFlow BHXH Helper
const ORIGIN = 'https://baohiemxahoi.gov.vn';
const REFERER = `${ORIGIN}/tracuu/pages/don-vi-tham-gia-bhxh.aspx`;

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

async function fetchRetry(url, init, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (i + 1 < retries) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function syncBhxhHeaders() {
  const cookies = await chrome.cookies.getAll({ domain: 'baohiemxahoi.gov.vn' });
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const requestHeaders = [
    { header: 'Origin', operation: 'set', value: ORIGIN },
    { header: 'Referer', operation: 'set', value: REFERER }
  ];
  if (cookieHeader) {
    requestHeaders.push({ header: 'Cookie', operation: 'set', value: cookieHeader });
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders
        },
        condition: {
          urlFilter: '||baohiemxahoi.gov.vn/',
          resourceTypes: ['xmlhttprequest', 'other', 'image']
        }
      }
    ]
  });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const { action, payload } = request;

  if (action === 'CAPTCHA') {
    (async () => {
      try {
        await syncBhxhHeaders();
        const url = `${ORIGIN}/UserControls/CaptchaImageHandler.ashx?t=${Date.now()}`;
        const res = await fetchRetry(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store'
        });

        if (!res.ok) {
          sendResponse({ success: false, error: `Cổng BHXH phản hồi lỗi ${res.status}` });
          return;
        }

        const buffer = await res.arrayBuffer();
        await syncBhxhHeaders();
        const base64 = bufferToBase64(buffer);
        const mime = (res.headers.get('content-type') || 'image/png').split(';')[0];
        sendResponse({ success: true, captcha: `data:${mime};base64,${base64}` });
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Lỗi khi tải ảnh mã xác nhận từ BHXH' });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (action === 'SEARCH' || action === 'PAGE' || action === 'BHYT_SEARCH') {
    (async () => {
      try {
        await syncBhxhHeaders();
        const body = new URLSearchParams();
        let url = `${ORIGIN}/UserControls/Publishing/TraCuuDonViThamGia/pListDonViThamGia.aspx`;

        if (action === 'BHYT_SEARCH') {
          url = `${ORIGIN}/UserControls/BHXH/BaoHiemYTe/TheBHYT/pListTheBHYTThe.aspx`;
          body.append('txtMaThe', payload?.txtMaThe || '');
          body.append('txtHoTen', payload?.txtHoTen || '');
          body.append('txtNgaySinh', payload?.txtNgaySinh || '');
          body.append('tokenRecaptch', payload?.tokenRecaptch || '');
        } else {
          body.append('MaBHXH', payload?.MaBHXH || '');
          body.append('MaSoThue', payload?.MaSoThue || '');
          body.append('MaDonVi', '');
          body.append('TenDonVi', '');

          if (action === 'PAGE') {
            body.append('docheck', '1');
            body.append('page', String(payload?.page || 1));
          } else {
            body.append('tokenRecaptch', payload?.tokenRecaptch || '');
          }
        }

        const res = await fetchRetry(url, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body.toString()
        });

        if (!res.ok) {
          sendResponse({ success: false, error: `Cổng BHXH phản hồi lỗi ${res.status}` });
          return;
        }

        const text = await res.text();
        if (/Request Rejected/i.test(text)) {
          sendResponse({ success: false, error: 'Yêu cầu bị tường lửa BHXH từ chối. Vui lòng bấm Đổi mã và thử lại.' });
          return;
        }

        try {
          const json = JSON.parse(text);
          if (json.Error) {
            sendResponse({ success: false, error: json.Title || 'Mã xác nhận không chính xác.' });
            return;
          }
        } catch {
          // Normal HTML table response
        }

        sendResponse({ success: true, html: text });
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Lỗi kết nối tra cứu tới BHXH' });
      }
    })();
    return true;
  }
});
