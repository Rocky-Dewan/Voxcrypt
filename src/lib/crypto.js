// VoxCrypt v2 — Advanced Encryption Engine
// Architecture:
//   Small files (≤ 8 MB)  → PNG pixel-steganography (legacy compatible)
//   Large files (> 8 MB)  → Binary .vxc container (no canvas overhead)
//
// Compression: gzip via CompressionStream (better ratio for binary/media)
// Encryption:  AES-256-GCM
// KDF:         PBKDF2 / SHA-256 / 200 000 iterations
//
// .vxc binary layout:
//   Magic      [4]   "VXC2"
//   Salt       [16]
//   IV         [12]
//   NameLen    [2]   uint16 BE
//   Name       [NameLen]
//   Compressed [1]   0x01 = gzip-compressed, 0x00 = raw
//   DataLen    [8]   uint64 BE (high-u32 + low-u32)
//   Data       [DataLen]   AES-GCM ciphertext (includes 16-byte auth tag)

const PNG_THRESHOLD = 8 * 1024 * 1024; // files ≤ 8 MB → PNG; larger → .vxc
const MAGIC = new Uint8Array([0x56, 0x58, 0x43, 0x32]); // "VXC2"

// ── COMPRESSION ──────────────────────────────────────────────────
async function tryCompress(data, onProgress) {
  onProgress?.({ stage: 'compressing', pct: 10 });
  try {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    const reader = cs.readable.getReader();
    const chunks = [];

    const readAll = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    })();

    await writer.write(data);
    await writer.close();
    await readAll;

    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const compressed = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { compressed.set(c, off); off += c.length; }

    onProgress?.({ stage: 'compressing', pct: 30 });

    if (compressed.length < data.length) {
      return { data: compressed, wasCompressed: true };
    }
    return { data, wasCompressed: false };
  } catch {
    return { data, wasCompressed: false };
  }
}

async function decompressGzip(data) {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  const chunks = [];
  const readAll = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  })();
  await writer.write(data);
  await writer.close();
  await readAll;
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { result.set(c, off); off += c.length; }
  return result;
}

async function decompressDeflateRaw(data) {
  return new Promise((resolve, reject) => {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      const chunks = [];
      const readAll = (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      })();
      writer.write(data).then(() => writer.close());
      readAll.then(() => {
        const total = chunks.reduce((a, c) => a + c.length, 0);
        const result = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { result.set(c, off); off += c.length; }
        resolve(result);
      }).catch(reject);
    } catch (e) { reject(e); }
  });
}

// ── KEY DERIVATION ───────────────────────────────────────────────
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── PNG PIXEL ENCODING (small files only) ────────────────────────
function dataToCanvas(data) {
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
  combined.set(header, 0); combined.set(data, 8);
  let bi = 0;
  for (let i = 0; i < px.length; i += 4) {
    px[i]   = bi < combined.length ? combined[bi++] : 0;
    px[i+1] = bi < combined.length ? combined[bi++] : 0;
    px[i+2] = bi < combined.length ? combined[bi++] : 0;
    px[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function canvasToData(canvas) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imgData.data;
  const hdr = new Uint8Array(8);
  let bi = 0;
  for (let i = 0; i < px.length && bi < 8; i += 4) {
    hdr[bi++] = px[i];
    if (bi < 8) hdr[bi++] = px[i+1];
    if (bi < 8) hdr[bi++] = px[i+2];
  }
  const dv = new DataView(hdr.buffer);
  const hi = dv.getUint32(0, false);
  const lo = dv.getUint32(4, false);
  const dataLen = hi * 0x100000000 + lo;
  if (dataLen <= 0 || dataLen > 600 * 1024 * 1024) throw new Error('Invalid image data');
  const result = new Uint8Array(dataLen);
  let ri = 0; bi = 0;
  for (let i = 0; i < px.length && ri < dataLen; i += 4) {
    if (bi++ >= 8 && ri < dataLen) result[ri++] = px[i];
    if (bi++ >= 8 && ri < dataLen) result[ri++] = px[i+1];
    if (bi++ >= 8 && ri < dataLen) result[ri++] = px[i+2];
  }
  return result;
}

// ── VXC BINARY CONTAINER ─────────────────────────────────────────
function buildVxcBundle(salt, iv, fileName, compressedFlag, ciphertext) {
  const nameArr = new TextEncoder().encode(fileName.slice(0, 65535));
  const nameLenBuf = new Uint8Array(2);
  new DataView(nameLenBuf.buffer).setUint16(0, nameArr.length, false);
  const dataLen = ciphertext.length;
  const dataLenBuf = new Uint8Array(8);
  const dlDv = new DataView(dataLenBuf.buffer);
  dlDv.setUint32(0, Math.floor(dataLen / 0x100000000), false);
  dlDv.setUint32(4, dataLen >>> 0, false);
  const total = 4 + 16 + 12 + 2 + nameArr.length + 1 + 8 + dataLen;
  const buf = new Uint8Array(total);
  let off = 0;
  buf.set(MAGIC, off);       off += 4;
  buf.set(salt, off);        off += 16;
  buf.set(iv, off);          off += 12;
  buf.set(nameLenBuf, off);  off += 2;
  buf.set(nameArr, off);     off += nameArr.length;
  buf[off++] = compressedFlag ? 0x01 : 0x00;
  buf.set(dataLenBuf, off);  off += 8;
  buf.set(ciphertext, off);
  return buf;
}

function parseVxcBundle(buf) {
  let off = 0;
  const magic = buf.slice(0, 4);
  if (String.fromCharCode(...magic) !== 'VXC2') throw new Error('Not a valid VoxCrypt v2 file');
  off = 4;
  const salt = buf.slice(off, off+16); off += 16;
  const iv   = buf.slice(off, off+12); off += 12;
  const nameLen = new DataView(buf.buffer, buf.byteOffset + off, 2).getUint16(0, false); off += 2;
  const nameBytes = buf.slice(off, off+nameLen); off += nameLen;
  const name = new TextDecoder().decode(nameBytes);
  const compressedFlag = buf[off++] === 0x01;
  const dv = new DataView(buf.buffer, buf.byteOffset + off, 8);
  const dataLen = dv.getUint32(0, false) * 0x100000000 + dv.getUint32(4, false);
  off += 8;
  const ciphertext = buf.slice(off, off + dataLen);
  return { salt, iv, name, compressedFlag, ciphertext };
}

// ── PNG BUNDLE HELPERS ────────────────────────────────────────────
function buildPngBundle(salt, iv, fileName, compressedFlag, ciphertext) {
  const nameBytes = new Uint8Array(60);
  const nameEncoded = new TextEncoder().encode(fileName.slice(0, 60));
  nameBytes.set(nameEncoded);
  const bundle = new Uint8Array(16 + 12 + 60 + 1 + ciphertext.length);
  let off = 0;
  bundle.set(salt, off);       off += 16;
  bundle.set(iv, off);         off += 12;
  bundle.set(nameBytes, off);  off += 60;
  bundle[off++] = compressedFlag ? 0x01 : 0x00;
  bundle.set(ciphertext, off);
  return bundle;
}

// ── PUBLIC API ────────────────────────────────────────────────────
export async function encryptMediaToFile(mediaFile, passphrase, onProgress) {
  onProgress?.({ stage: 'reading', pct: 5 });
  const rawBytes = new Uint8Array(await mediaFile.arrayBuffer());
  const usePng = rawBytes.length <= PNG_THRESHOLD;

  const { data: compData, wasCompressed } = await tryCompress(rawBytes, onProgress);
  onProgress?.({ stage: 'compressing', pct: 32 });

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  onProgress?.({ stage: 'deriving', pct: 40 });
  const key = await deriveKey(passphrase, salt);

  onProgress?.({ stage: 'encrypting', pct: 55 });
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compData)
  );
  onProgress?.({ stage: 'encrypting', pct: 70 });

  let outputBlob, outputExt;

  if (usePng) {
    const bundle = buildPngBundle(salt, iv, mediaFile.name, wasCompressed, ciphertext);
    onProgress?.({ stage: 'encoding', pct: 80 });
    const canvas = dataToCanvas(bundle);
    outputBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    outputExt = '.png';
  } else {
    onProgress?.({ stage: 'encoding', pct: 80 });
    const vxcBytes = buildVxcBundle(salt, iv, mediaFile.name, wasCompressed, ciphertext);
    outputBlob = new Blob([vxcBytes], { type: 'application/octet-stream' });
    outputExt = '.vxc';
  }

  onProgress?.({ stage: 'done', pct: 100 });
  return {
    blob: outputBlob,
    ext: outputExt,
    originalSize: rawBytes.length,
    compressedSize: compData.length,
    outputSize: outputBlob.size,
    wasCompressed,
  };
}

export async function decryptFileToMedia(encFile, passphrase, onProgress) {
  onProgress?.({ stage: 'reading', pct: 5 });
  const fileExt = encFile.name.split('.').pop().toLowerCase();

  let salt, iv, name, compressedFlag, ciphertext;
  let isLegacyDeflate = false;

  if (fileExt === 'vxc') {
    const buf = new Uint8Array(await encFile.arrayBuffer());
    onProgress?.({ stage: 'extracting', pct: 20 });
    try {
      ({ salt, iv, name, compressedFlag, ciphertext } = parseVxcBundle(buf));
    } catch (e) {
      throw new Error('Unable to read file. It may be corrupted or not a VoxCrypt file.');
    }
  } else {
    // PNG / legacy image path
    const canvas = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(encFile);
    });
    onProgress?.({ stage: 'extracting', pct: 20 });
    let bundle;
    try { bundle = canvasToData(canvas); }
    catch { throw new Error('Unable to read image. File may be corrupted.'); }

    salt = bundle.slice(0, 16);
    iv   = bundle.slice(16, 28);
    const nameBytes = bundle.slice(28, 88);
    name = new TextDecoder().decode(nameBytes).replace(/\0+$/, '') || 'decrypted_media';
    const b88 = bundle[88];
    if (b88 <= 0x01) {
      // v2 PNG bundle with compFlag byte
      compressedFlag = b88 === 0x01;
      ciphertext = bundle.slice(89);
    } else {
      // Old v1 bundle — always deflate-raw compressed, no compFlag byte
      compressedFlag = true;
      isLegacyDeflate = true;
      ciphertext = bundle.slice(88);
    }
  }

  onProgress?.({ stage: 'deriving', pct: 42 });
  let key;
  try { key = await deriveKey(passphrase, salt); }
  catch { throw new Error('Unable to decrypt. Please verify your passphrase and try again.'); }

  onProgress?.({ stage: 'decrypting', pct: 60 });
  let decrypted;
  try {
    decrypted = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    );
  } catch {
    throw new Error('Wrong passphrase or corrupted file.');
  }

  let mediaBytes;
  if (compressedFlag) {
    onProgress?.({ stage: 'decompressing', pct: 80 });
    try {
      if (isLegacyDeflate) {
        mediaBytes = await decompressDeflateRaw(decrypted);
      } else {
        try {
          mediaBytes = await decompressGzip(decrypted);
        } catch {
          mediaBytes = await decompressDeflateRaw(decrypted);
        }
      }
    } catch {
      mediaBytes = decrypted;
    }
  } else {
    mediaBytes = decrypted;
  }

  onProgress?.({ stage: 'done', pct: 100 });
  return { mediaBytes, originalName: name, size: mediaBytes.length };
}

// ── PASSPHRASE HELPERS ────────────────────────────────────────────
export function validatePassphrase(letters, digits, special) {
  const errors = [];
  if (!/^[a-zA-Z]{4}$/.test(letters)) errors.push('Letters: exactly 4 alphabetic characters (a-z, A-Z)');
  if (!/^\d{4}$/.test(digits))         errors.push('Digits: exactly 4 numbers (0-9)');
  if (special.length !== 4 || /[a-zA-Z0-9]/.test(special)) errors.push('Special: exactly 4 non-alphanumeric characters');
  return errors;
}

export function buildPassphrase(l, d, s) { return l + d + s; }

// Legacy aliases for backward compatibility
export const encryptAudioToImage = encryptMediaToFile;
export async function decryptImageToAudio(f, pp, cb) {
  const r = await decryptFileToMedia(f, pp, cb);
  return { audioBytes: r.mediaBytes, originalName: r.originalName, size: r.size };
}
export function canvasToBlob(canvas, format = 'image/png') {
  return new Promise(res => canvas.toBlob(res, format, 0.98));
}
