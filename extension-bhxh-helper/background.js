// Background Service Worker for TaskFlow BHXH Helper
const ORIGIN = 'https://baohiemxahoi.gov.vn';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const { action, payload } = request;

  if (action === 'CAPTCHA') {
    (async () => {
      try {
        const url = `${ORIGIN}/UserControls/CaptchaImageHandler.ashx?t=${Date.now()}`;
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Referer': `${ORIGIN}/tracuu/pages/don-vi-tham-gia-bhxh.aspx`,
            'User-Agent': navigator.userAgent
          }
        });

        if (!res.ok) {
          sendResponse({ success: false, error: `Cổng BHXH phản hồi lỗi ${res.status}` });
          return;
        }

        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
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
        body.append('MaBHXH', payload.MaBHXH || '');
        body.append('MaSoThue', payload.MaSoThue || '');
        body.append('MaDonVi', '');
        body.append('TenDonVi', '');

        if (action === 'PAGE') {
          body.append('docheck', '1');
          body.append('page', String(payload.page || 1));
        } else {
          body.append('tokenRecaptch', payload.tokenRecaptch || '');
        }

        const url = `${ORIGIN}/UserControls/Publishing/TraCuuDonViThamGia/pListDonViThamGia.aspx`;
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `${ORIGIN}/tracuu/pages/don-vi-tham-gia-bhxh.aspx`,
            'User-Agent': navigator.userAgent
          },
          body: body.toString()
        });

        if (!res.ok) {
          sendResponse({ success: false, error: `Cổng BHXH phản hồi lỗi ${res.status}` });
          return;
        }

        const text = await res.text();
        // Check if BHXH returned JSON error (e.g. {"Error":true,"Title":"Mã xác thực không chính xác"})
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
