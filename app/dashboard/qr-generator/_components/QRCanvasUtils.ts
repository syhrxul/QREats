import QRCode from 'qrcode';

export interface TableDB {
  id: number;
  name: string;
  token: string;
  is_active: boolean;
}

export function parseTableName(tableName: string) {
  const numberMatch = tableName.match(/\d+$/);
  const number = numberMatch ? numberMatch[0] : '';
  const namePrefix = tableName.replace(/[-_ ]*\d+$/, '').trim();
  return { namePrefix, number };
}

export async function downloadSinglePNG(
  table: TableDB, 
  selectedTemplate: string, 
  shopName: string, 
  appDomain: string
) {
  const canvas = document.createElement('canvas');
  canvas.width = 800; // High resolution
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const url = `${appDomain}/order/${encodeURIComponent(table.token)}`;
  const { namePrefix, number } = parseTableName(table.name);

  if (selectedTemplate === 'vintage') {
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

    ctx.fillStyle = '#5C4033';
    ctx.textAlign = 'center';
    ctx.font = 'italic bold 28px Georgia, serif';
    ctx.fillText('WELCOME TO', canvas.width / 2, 120);

    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText((shopName || 'QREats Cafe').toUpperCase(), canvas.width / 2, 180);

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 100, 210);
    ctx.lineTo(canvas.width / 2 + 100, 210);
    ctx.strokeStyle = '#5C4033';
    ctx.stroke();

    const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10 });
    const img = new Image();
    img.src = qrImage;
    await new Promise((resolve) => (img.onload = resolve));
    ctx.drawImage(img, canvas.width / 2 - 180, 280, 360, 360);

    ctx.font = 'italic 36px Georgia, serif';
    ctx.fillText(namePrefix || 'Table', canvas.width / 2, 750);
    ctx.font = 'bold 80px Georgia, serif';
    ctx.fillText(number ? `No. ${number}` : 'Meja', canvas.width / 2, 850);

    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('ORDER & PAY FROM TABLE', canvas.width / 2, 950);

  } else if (selectedTemplate === 'dark') {
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('PREMIUM SELF ORDER', canvas.width / 2, 130);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'extrabold 48px sans-serif';
    ctx.fillText((shopName || 'QREats Venue').toUpperCase(), canvas.width / 2, 195);

    const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10, color: { dark: '#1A1A1A', light: '#FFFFFF' } });
    const img = new Image();
    img.src = qrImage;
    await new Promise((resolve) => (img.onload = resolve));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(canvas.width / 2 - 200, 270, 400, 400);
    ctx.drawImage(img, canvas.width / 2 - 180, 290, 360, 360);

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(namePrefix || 'Table', canvas.width / 2, 770);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'extrabold 90px sans-serif';
    ctx.fillText(number ? `#${number}` : 'Meja', canvas.width / 2, 875);

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('SCAN TO ORDER & PAY', canvas.width / 2, 970);

  } else if (selectedTemplate === 'tent') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.beginPath();
    ctx.setLineDash([15, 15]);
    ctx.moveTo(20, canvas.height / 2);
    ctx.lineTo(canvas.width - 20, canvas.height / 2);
    ctx.strokeStyle = '#CCCCCC';
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 4);
    ctx.rotate(Math.PI);
    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText((shopName || 'QREats Cafe').toUpperCase(), 0, -60);
    ctx.fillStyle = '#888888';
    ctx.font = 'normal 20px sans-serif';
    ctx.fillText('Selamat datang! Silakan scan QR code di sisi', 0, 0);
    ctx.fillText('sebaliknya untuk memesan mandiri dari meja Anda.', 0, 35);
    ctx.restore();

    const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10 });
    const img = new Image();
    img.src = qrImage;
    await new Promise((resolve) => (img.onload = resolve));
    ctx.drawImage(img, canvas.width / 2 - 140, canvas.height / 2 + 60, 280, 280);

    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(namePrefix || 'Table', canvas.width / 2, canvas.height / 2 + 390);
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(number ? `Meja ${number}` : 'Meja', canvas.width / 2, canvas.height / 2 + 460);

  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('SELF ORDER QR', canvas.width / 2, 130);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText((shopName || 'QREats Merchant').toUpperCase(), canvas.width / 2, 190);

    const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10 });
    const img = new Image();
    img.src = qrImage;
    await new Promise((resolve) => (img.onload = resolve));
    ctx.drawImage(img, canvas.width / 2 - 180, 270, 360, 360);

    ctx.fillStyle = '#666666';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(namePrefix || 'Meja', canvas.width / 2, 750);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText(number ? `No. ${number}` : 'Meja', canvas.width / 2, 850);

    ctx.fillStyle = '#888888';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('SCAN TO ORDER & PAY', canvas.width / 2, 950);
  }

  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `QR-${table.name}-${selectedTemplate}.png`;
  link.href = dataURL;
  link.click();
}
