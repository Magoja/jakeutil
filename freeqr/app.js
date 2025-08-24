const urlInput = document.getElementById('urlInput');
const generateBtn = document.getElementById('generateBtn');
const qrcodeDiv = document.getElementById('qrcode');
const downloadBtn = document.getElementById('downloadBtn');
let qrCodeInstance = null;

urlInput.addEventListener('input', () => {
  generateBtn.disabled = urlInput.value.trim() === '';
});

generateBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) {
    alert('Please enter a URL.');
    return;
  }
  // Clear previous QR code
  qrcodeDiv.innerHTML = '';
  downloadBtn.style.display = 'none';
  // Generate QR code
  qrCodeInstance = new QRCode(qrcodeDiv, {
    text: url,
    width: 220,
    height: 220,
    colorDark: '#222',
    colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.H
  });
  setTimeout(() => {
    // Show download button
    downloadBtn.style.display = 'block';
  }, 300);
});

downloadBtn.addEventListener('click', () => {
  if (!qrcodeDiv.firstChild) return;
  let img = qrcodeDiv.querySelector('img');
  if (!img) {
    // fallback for canvas
    const canvas = qrcodeDiv.querySelector('canvas');
    if (canvas) {
      img = new Image();
      img.src = canvas.toDataURL('image/png');
    }
  }
  if (img && img.src) {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = 'qrcode.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
});
