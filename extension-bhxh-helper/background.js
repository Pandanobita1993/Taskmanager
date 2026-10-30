// Background Service Worker for TaskFlow BHXH Helper
const ORIGIN = 'https://baohiemxahoi.gov.vn';

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const { action, payload } = request;

  if (action === 'CAPTCHA') {
    (async () => {
      try {
        const url = `${ORIGIN}/UserControls/CaptchaImageHandler.ashx?t=${Date.now()}`;
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          referrer: `${ORIGIN}/tracuu/pages/don-vi-tham-gia-bhxh.aspx`
        });

        if (!res.ok) {
          sendResponse({ success: false, error: `Cổng BHXH phản hồi lỗi ${res.status}` });
          return;
        }

        const buffer = await res.arrayBuffer();
        const base64 = bufferToBase64(buffer);
        const mime = (res.headers.get('content-type') || 'image/png').split(';')[0];
        sendResponse({ success: true, captcha: `data:${mime};base64,${base64}` });
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Lỗi khi tải ảnh mã xác nhận từ BHXH' });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (action === 'SEARCH' || action === 'PAGE') {
    (async () => {
      try {
        const body = new URLSearchParams();
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

        const url = `${ORIGIN}/UserControls/Publishing/TraCuuDonViThamGia/pListDonViThamGia.aspx`;
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          referrer: `${ORIGIN}/tracuu/pages/don-vi-tham-gia-bhxh.aspx`,
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
