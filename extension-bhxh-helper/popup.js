document.getElementById('test-btn').addEventListener('click', () => {
  const container = document.getElementById('captcha-container');
  const btn = document.getElementById('test-btn');
  container.innerHTML = '<span style="font-size: 12px; color: #6b7280;">Đang kết nối cổng BHXH...</span>';
  btn.disabled = true;

  chrome.runtime.sendMessage({ action: 'CAPTCHA' }, (response) => {
    btn.disabled = false;
    if (chrome.runtime.lastError) {
      container.innerHTML = `<span style="font-size: 12px; color: #dc2626;">Lỗi: ${chrome.runtime.lastError.message}</span>`;
      return;
    }
    if (response && response.success && response.captcha) {
      container.innerHTML = `
        <div style="font-size: 11px; color: #166534; font-weight: 600; margin-bottom: 4px;">✓ Kết nối thành công!</div>
        <img class="captcha-img" src="${response.captcha}" alt="Mã xác nhận" />
      `;
    } else {
      container.innerHTML = `<span style="font-size: 12px; color: #dc2626;">Lỗi: ${response?.error || 'Không tải được ảnh'}</span>`;
    }
  });
});
