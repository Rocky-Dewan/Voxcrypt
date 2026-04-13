// VoxCrypt - Advanced Encryption Engine
// AES-256-GCM + PBKDF2 + DEFLATE compression

// ─── COMPRESSION ─────────────────────────────────────────────────
function compress(data) {
  return new Promise((resolve) => {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      const reader = cs.readable.getReader();
      const chunks = [];
      reader.read().then(function process({ done, value }) {
        if (done) {
          const total = chunks.reduce((a, c) => a + c.length, 0);
          const result = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) { result.set(c, off); off += c.length; }
          resolve(result);
          return;
        }
        chunks.push(value);
        return reader.read().then(process);
      });
      writer.write(data).then(() => writer.close());
    } catch { resolve(data); }
  });
}

function decompress(data) {
  return new Promise((resolve, reject) => {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      const chunks = [];
      reader.read().then(function process({ done, value }) {
        if (done) {
          const total = chunks.reduce((a, c) => a + c.length, 0);
          const result = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) { result.set(c, off); off += c.length; }
          resolve(result);
          return;
        }
        chunks.push(value);
        return reader.read().then(process);
      });
      writer.write(data).then(() => writer.close()).catch(reject);
    } catch { resolve(data); }
  });
}

// ─── KEY DERIVATION ──────────────────────────────────────────────
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── IMAGE PIXEL ENCODING ─────────────────────────────────────────
function dataToCanvas(data, onProgress) {
  const header = new Uint8Array(8);
  const dv = new DataView(header.buffer);
  dv.setUint32(0, Math.floor(data.length / 0x100000000), false);
  dv.setUint32(4, data.length >>> 0, false);

  const totalBytes = 8 + data.length;
  const pixCount = Math.ceil(totalBytes / 3);
  const side = Math.ceil(Math.sqrt(pixCount));

  const canvas = document.createElement('canvas');
  canvas.width = side; canvas.height = side;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(side, side);
  const px = imgData.data;

  const combined = new Uint8Array(totalBytes);
  combined.set(header, 0);
  combined.set(data, 8);

  let bi = 0;
  for (let i = 0; i < px.length; i += 4) {
    px[i]   = bi < combined.length ? combined[bi++] : 0;
    px[i+1] = bi < combined.length ? combined[bi++] : 0;
    px[i+2] = bi < combined.length ? combined[bi++] : 0;
    px[i+3] = 255;
    if (onProgress && bi % 60000 === 0) onProgress(bi / combined.length * 100);
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function canvasToData(canvas, onProgress) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imgData.data;

  // Read 8-byte header from first RGB channels
  const hdr = new Uint8Array(8);
  let bi = 0;
  for (let i = 0; i < px.length && bi < 8; i += 4) {
    if (bi < 8) hdr[bi++] = px[i];
    if (bi < 8) hdr[bi++] = px[i+1];
    if (bi < 8) hdr[bi++] = px[i+2];
  }

  const dv = new DataView(hdr.buffer);
  const hi = dv.getUint32(0, false);
  const lo = dv.getUint32(4, false);
  const dataLen = hi * 0x100000000 + lo;

  if (dataLen <= 0 || dataLen > 600 * 1024 * 1024) {
    throw new Error('Invalid image data');
  }

  const result = new Uint8Array(dataLen);
  let ri = 0;
  bi = 0;
  for (let i = 0; i < px.length && ri < dataLen; i += 4) {
    if (bi++ >= 8 && ri < dataLen) result[ri++] = px[i];
    if (bi++ >= 8 && ri < dataLen) result[ri++] = px[i+1]; // already incremented
    if (bi++ >= 8 && ri < dataLen) result[ri++] = px[i+2];
    if (onProgress && ri % 60000 === 0) onProgress(ri / dataLen * 100);
  }
  return result;
}

// ─── PUBLIC API ───────────────────────────────────────────────────
export async function encryptAudioToImage(audioFile, passphrase, onProgress) {
  onProgress?.({ stage: 'reading', pct: 5 });
  const audioBytes = new Uint8Array(await audioFile.arrayBuffer());

  onProgress?.({ stage: 'compressing', pct: 15 });
  const compressed = await compress(audioBytes);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));

  onProgress?.({ stage: 'deriving', pct: 35 });
  const key = await deriveKey(passphrase, salt);

  onProgress?.({ stage: 'encrypting', pct: 50 });
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed)
  );

  // nameBytes: 60 bytes for filename
  const nameBytes = new Uint8Array(60);
  const nameEncoded = new TextEncoder().encode(audioFile.name.slice(0, 60));
  nameBytes.set(nameEncoded);

  // Bundle: [salt(16) | iv(12) | name(60) | encrypted]
  const bundle = new Uint8Array(88 + encrypted.length);
  bundle.set(salt, 0);
  bundle.set(iv, 16);
  bundle.set(nameBytes, 28);
  bundle.set(encrypted, 88);

  onProgress?.({ stage: 'encoding', pct: 65 });
  const canvas = dataToCanvas(bundle, (p) => onProgress?.({ stage: 'encoding', pct: 65 + p * 0.25 }));

  onProgress?.({ stage: 'done', pct: 100 });
  return {
    canvas,
    originalSize: audioBytes.length,
    compressedSize: compressed.length,
    encryptedSize: bundle.length,
  };
}

export async function decryptImageToAudio(imageFile, passphrase, onProgress) {
  onProgress?.({ stage: 'reading', pct: 5 });

  const canvas = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });

  onProgress?.({ stage: 'extracting', pct: 20 });

  let bundle;
  try {
    bundle = canvasToData(canvas, (p) => onProgress?.({ stage: 'extracting', pct: 20 + p * 0.2 }));
  } catch {
    throw new Error('Unable to decrypt. Please verify your passphrase and try again.');
  }

  const salt      = bundle.slice(0, 16);
  const iv        = bundle.slice(16, 28);
  const nameBytes = bundle.slice(28, 88);
  const encrypted = bundle.slice(88);
  const originalName = new TextDecoder().decode(nameBytes).replace(/\0+$/, '') || 'decrypted_audio.mp3';

  onProgress?.({ stage: 'deriving', pct: 45 });
  let key;
  try {
    key = await deriveKey(passphrase, salt);
  } catch {
    throw new Error('Unable to decrypt. Please verify your passphrase and try again.');
  }

  onProgress?.({ stage: 'decrypting', pct: 60 });
  let decrypted;
  try {
    decrypted = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
    );
  } catch {
    throw new Error('Unable to decrypt. Please verify your passphrase and try again.');
  }

  onProgress?.({ stage: 'decompressing', pct: 80 });
  let audioBytes;
  try { audioBytes = await decompress(decrypted); }
  catch { audioBytes = decrypted; }

  onProgress?.({ stage: 'done', pct: 100 });
  return { audioBytes, originalName, size: audioBytes.length };
}

export function canvasToBlob(canvas, format = 'image/png') {
  return new Promise((res) => canvas.toBlob(res, format, 0.98));
}

export function validatePassphrase(letters, digits, special) {
  const errors = [];
  if (!/^[a-zA-Z]{4}$/.test(letters)) errors.push('Letters: exactly 4 alphabetic characters (a-z, A-Z)');
  if (!/^\d{4}$/.test(digits))         errors.push('Digits: exactly 4 numbers (0-9)');
  if (special.length !== 4 || /[a-zA-Z0-9]/.test(special)) errors.push('Special: exactly 4 non-alphanumeric characters');
  return errors;
}

export function buildPassphrase(l, d, s) { return l + d + s; }
