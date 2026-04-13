import React, { useState, useRef, useCallback } from 'react';
import { encryptAudioToImage, decryptImageToAudio, canvasToBlob, validatePassphrase, buildPassphrase } from './lib/crypto.js';

// ── LIMITS ──────────────────────────────────────────────────────
// Browser canvas pixel limit: ~268 MP (16384×16384 on most browsers).
// At 3 bytes/pixel + 8-byte header, max storable = ~805 MB raw.
// After AES-GCM overhead (~16 B tag) and DEFLATE expansion worst-case,
// practical safe limit is 500 MB input. RAM is the real bottleneck.
const MAX_FILE_GB = 0.5; // 500 MB
const MAX_FILE_BYTES = MAX_FILE_GB * 1024 * 1024 * 1024;

// ── ICONS ────────────────────────────────────────────────────────
const Icon = {
  lock: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="8" rx="1.5"/>
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>
    </svg>
  ),
  upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4"/>
    </svg>
  ),
  audio: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  video: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="15" height="14" rx="2"/>
      <path d="M17 9l5-3v12l-5-3V9z"/>
    </svg>
  ),
  image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 1l10 10M11 1L1 11"/>
    </svg>
  ),
  eye: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
      <circle cx="8" cy="8" r="2"/>
    </svg>
  ),
  eyeOff: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 2l12 12M6.7 6.8A2 2 0 0010 10M4.2 4.4C2.6 5.5 1 8 1 8s2.5 5 7 5a7 7 0 003.8-1.2M7 3.1A7 7 0 0115 8s-.9 1.8-2.4 3.1"/>
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 6l3.5 3.5L11 2"/>
    </svg>
  ),
  alert: () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="5"/><path d="M6 4v3M6 8.5v.5"/>
    </svg>
  ),
  download: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v8M5 7l3 3 3-3M2 13h12"/>
    </svg>
  ),
  shield: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 1.5L2 4v4c0 3.3 2.6 5.7 6 6.5 3.4-.8 6-3.2 6-6.5V4L8 1.5z"/>
    </svg>
  ),
  keyIcon: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="7" r="4"/>
      <path d="M9 9.5l5 3.5M12 11l1.5 1"/>
    </svg>
  ),
};

// ── HELPERS ──────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
}

const STAGE = {
  reading:       'Reading file…',
  compressing:   'Compressing…',
  deriving:      'Deriving key (PBKDF2)…',
  encrypting:    'Encrypting (AES-256-GCM)…',
  encoding:      'Encoding to pixels…',
  extracting:    'Extracting pixels…',
  decrypting:    'Decrypting…',
  decompressing: 'Decompressing…',
  done:          'Complete',
};

// ── PASSPHRASE FIELDS ────────────────────────────────────────────
function PassFields({ letters, digits, special, onChange, show, onToggle, color }) {
  const lOk = /^[a-zA-Z]{4}$/.test(letters);
  const dOk = /^\d{4}$/.test(digits);
  const sOk = special.length === 4 && !/[a-zA-Z0-9]/.test(special);

  const fields = [
    { key: 'letters', val: letters, ph: '4 letters (a-z, A-Z)',          ok: lOk },
    { key: 'digits',  val: digits,  ph: '4 digits (0-9)',                 ok: dOk },
    { key: 'special', val: special, ph: '4 special chars (!@#$%^&*...)',  ok: sOk },
  ];

  return (
    <div>
      <div className="sec-label">Passphrase</div>
      <div className="pass-fields">
        {fields.map(({ key, val, ph, ok }) => (
          <div key={key} className="pass-row">
            <input
              className={`pass-input ${val.length === 4 ? (ok ? 'ok' : 'err') : ''}`}
              type={show ? 'text' : 'password'}
              value={val}
              maxLength={4}
              placeholder={ph}
              onChange={(e) => onChange(key, e.target.value)}
            />
            <span className={`pass-count ${val.length === 4 && ok ? 'ok' : ''}`}>
              {val.length}/4
            </span>
          </div>
        ))}
      </div>
      <button className="show-pass" onClick={onToggle}>
        {show ? <Icon.eyeOff /> : <Icon.eye />}
        {show ? 'Hide passphrase' : 'Show passphrase'}
      </button>
    </div>
  );
}

// ── DROP ZONE ────────────────────────────────────────────────────
function DropZone({ file, onFile, onCancel, accept, label, sub, side, fileType }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  const filledClass = file ? (side === 'blue' ? 'filled-b' : 'filled-p') : '';
  const MediaIcon = fileType === 'video' ? Icon.video : (side === 'blue' ? Icon.audio : Icon.image);

  return (
    <div>
      <div className="sec-label">{side === 'blue' ? 'Media file' : 'Encrypted image'}</div>
      <div
        className={`drop-zone ${drag ? 'drag' : ''} ${filledClass}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onClick={() => !file && ref.current.click()}
        style={{ cursor: file ? 'default' : 'pointer' }}
      >
        <input
          ref={ref} type="file" accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        />
        {file ? (
          <div className="file-row">
            <div className={`file-row-icon ${side}`}>
              <MediaIcon />
            </div>
            <div className="file-row-info">
              <div className="file-row-name">{file.name}</div>
              <div className="file-row-size">{fmtBytes(file.size)}</div>
            </div>
            <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); onCancel(); }} title="Remove file">
              <Icon.x />
            </button>
          </div>
        ) : (
          <>
            <div className="drop-icon"><Icon.upload /></div>
            <div className="drop-label">{label}</div>
            <div className="drop-sub">{sub}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── ENCRYPT PANEL ────────────────────────────────────────────────
function EncryptPanel() {
  const [fileType, setFileType] = useState('audio');
  const [file, setFile]     = useState(null);
  const [letters, setL]     = useState('');
  const [digits,  setD]     = useState('');
  const [special, setS]     = useState('');
  const [show,    setShow]  = useState(false);
  const [running, setRun]   = useState(false);
  const [pct,     setPct]   = useState(null);
  const [stage,   setStg]   = useState('');
  const [err,     setErr]   = useState('');
  const [stats,   setStats] = useState(null);
  const [outFmt,  setOutFmt]= useState('image/png');

  const onChange = (k, v) => {
    if (k === 'letters') setL(v);
    if (k === 'digits')  setD(v);
    if (k === 'special') setS(v);
  };

  const lOk = /^[a-zA-Z]{4}$/.test(letters);
  const dOk = /^\d{4}$/.test(digits);
  const sOk = special.length === 4 && !/[a-zA-Z0-9]/.test(special);
  const canGo = file && lOk && dOk && sOk;

  const accept = fileType === 'audio'
    ? 'audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.opus'
    : 'video/*,.mp4,.mkv,.webm,.avi,.mov,.m4v';

  const handleFile = (f) => {
    if (f.size > MAX_FILE_BYTES) {
      setErr(`File too large. Maximum supported size is 500 MB. (Your file: ${fmtBytes(f.size)})`);
      return;
    }
    setErr(''); setStats(null);
    setFile(f);
  };

  const run = async () => {
    setErr(''); setStats(null);
    const errs = validatePassphrase(letters, digits, special);
    if (errs.length) { setErr(errs[0]); return; }
    setRun(true);
    try {
      const pp = buildPassphrase(letters, digits, special);
      const res = await encryptAudioToImage(file, pp, ({ stage: s, pct: p }) => {
        setStg(s); setPct(p);
      });
      const ext = outFmt === 'image/png' ? '.png' : '.jpg';
      const blob = await canvasToBlob(res.canvas, outFmt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name.replace(/\.[^.]+$/, '') + '_encrypted' + ext;
      a.click(); URL.revokeObjectURL(url);
      setStats({
        orig: fmtBytes(res.originalSize),
        enc:  fmtBytes(blob.size),
        pct:  ((1 - blob.size / res.originalSize) * 100).toFixed(1) + '%',
      });
    } catch (e) {
      setErr(e.message || 'Encryption failed.');
    }
    setRun(false);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <div className="panel-icon blue"><Icon.lock /></div>
          <div>
            <div className="panel-title">Audio to Image</div>
            <div className="panel-sub">Encrypt &amp; compress</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['image/png','PNG'],['image/jpeg','JPG']].map(([v,l]) => (
            <button key={v} onClick={() => setOutFmt(v)} className="toggle-btn" style={{
              padding: '4px 10px',
              borderRadius: 5,
              border: `1px solid ${outFmt === v ? 'rgba(35,139,230,0.4)' : 'var(--border)'}`,
              background: outFmt === v ? 'rgba(35,139,230,0.1)' : 'transparent',
              color: outFmt === v ? '#58a6ff' : 'var(--text-3)',
              fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="panel-body">
        {/* File type toggle */}
        <div>
          <div className="sec-label">File type</div>
          <div className="file-type-toggle">
            {[['audio','Audio'],['video','Video']].map(([v,l]) => (
              <button key={v} className={`toggle-btn ${fileType === v ? 'active-blue' : ''}`}
                onClick={() => { setFileType(v); setFile(null); setErr(''); setStats(null); }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <DropZone
          file={file} onFile={handleFile} onCancel={() => { setFile(null); setErr(''); setStats(null); }}
          accept={accept}
          label={`Click to upload ${fileType}`}
          sub={fileType === 'audio' ? 'MP3, WAV, FLAC, AAC, OGG · max 500 MB' : 'MP4, MKV, WebM, MOV · max 500 MB'}
          side="blue"
          fileType={fileType}
        />

        <PassFields letters={letters} digits={digits} special={special}
          onChange={onChange} show={show} onToggle={() => setShow(v => !v)} color="blue" />

        {err && (
          <div className="notif error"><Icon.alert /><span>{err}</span></div>
        )}

        {running && pct !== null && (
          <div className="progress-wrap">
            <div className="progress-top">
              <span className="progress-stage">{STAGE[stage] || '…'}</span>
              <span className="progress-pct">{Math.round(pct)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar blue" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {stats && !running && (
          <div className="result-block">
            <div className="stat-row">
              <div className="stat-cell"><div className="stat-val">{stats.orig}</div><div className="stat-key">Original</div></div>
              <div className="stat-cell"><div className="stat-val">{stats.enc}</div><div className="stat-key">Encrypted</div></div>
              <div className="stat-cell"><div className="stat-val">{stats.pct}</div><div className="stat-key">Reduced</div></div>
            </div>
            <div className="notif success" style={{ margin: 0 }}>
              <Icon.check /><span>Encrypted image saved to your downloads.</span>
            </div>
          </div>
        )}

        <button className="action-btn blue" onClick={run} disabled={!canGo || running}>
          {running ? <><div className="spinner" /> Encrypting…</> : 'Encrypt'}
        </button>
      </div>
    </div>
  );
}

// ── DECRYPT PANEL ────────────────────────────────────────────────
function DecryptPanel() {
  const [imgFile, setImg]   = useState(null);
  const [letters, setL]     = useState('');
  const [digits,  setD]     = useState('');
  const [special, setS]     = useState('');
  const [show,    setShow]  = useState(false);
  const [running, setRun]   = useState(false);
  const [pct,     setPct]   = useState(null);
  const [stage,   setStg]   = useState('');
  const [err,     setErr]   = useState('');
  const [result,  setResult]= useState(null);
  const [outFmt,  setOut]   = useState('original');

  const onChange = (k, v) => {
    if (k === 'letters') setL(v);
    if (k === 'digits')  setD(v);
    if (k === 'special') setS(v);
  };

  const lOk = /^[a-zA-Z]{4}$/.test(letters);
  const dOk = /^\d{4}$/.test(digits);
  const sOk = special.length === 4 && !/[a-zA-Z0-9]/.test(special);
  const canGo = imgFile && lOk && dOk && sOk;

  const run = async () => {
    setErr(''); setResult(null);
    const errs = validatePassphrase(letters, digits, special);
    if (errs.length) { setErr(errs[0]); return; }
    setRun(true);
    try {
      const pp = buildPassphrase(letters, digits, special);
      const res = await decryptImageToAudio(imgFile, pp, ({ stage: s, pct: p }) => {
        setStg(s); setPct(p);
      });

      // Detect media type from original name
      const ext = res.originalName.split('.').pop()?.toLowerCase() || '';
      const videoExts = ['mp4','mkv','webm','avi','mov','m4v'];
      const isVideo = videoExts.includes(ext);
      const mimeType = isVideo
        ? (ext === 'webm' ? 'video/webm' : ext === 'mkv' ? 'video/x-matroska' : 'video/mp4')
        : (ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg');

      const blob = new Blob([res.audioBytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setResult({ url, name: res.originalName, size: res.size, isVideo, mimeType });
    } catch (e) {
      setErr(e.message);
    }
    setRun(false);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url; a.download = result.name; a.click();
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <div className="panel-icon purple"><Icon.keyIcon /></div>
          <div>
            <div className="panel-title">Image to Audio</div>
            <div className="panel-sub">Decrypt &amp; decompress</div>
          </div>
        </div>
      </div>

      <div className="panel-body">
        <DropZone
          file={imgFile} onFile={setImg} onCancel={() => { setImg(null); setErr(''); setResult(null); }}
          accept="image/*,.png,.jpg,.jpeg"
          label="Click to upload image"
          sub="PNG, JPG, JPEG · Encrypted image"
          side="purple"
          fileType="image"
        />

        <PassFields letters={letters} digits={digits} special={special}
          onChange={onChange} show={show} onToggle={() => setShow(v => !v)} color="purple" />

        {err && (
          <div className="notif error"><Icon.alert /><span>{err}</span></div>
        )}

        {running && pct !== null && (
          <div className="progress-wrap">
            <div className="progress-top">
              <span className="progress-stage">{STAGE[stage] || '…'}</span>
              <span className="progress-pct">{Math.round(pct)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar purple" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {result && !running && (
          <div className="result-block">
            <div className="stat-row">
              <div className="stat-cell"><div className="stat-val">{fmtBytes(result.size)}</div><div className="stat-key">Recovered</div></div>
              <div className="stat-cell"><div className="stat-val">{result.isVideo ? 'Video' : 'Audio'}</div><div className="stat-key">Type</div></div>
              <div className="stat-cell"><div className="stat-val">{result.name.split('.').pop()?.toUpperCase()}</div><div className="stat-key">Format</div></div>
            </div>
            {result.isVideo ? (
              <video controls src={result.url} style={{ width: '100%', borderRadius: 6, maxHeight: 160 }} />
            ) : (
              <audio controls src={result.url} />
            )}
            <button className="dl-btn" onClick={download}>
              <Icon.download /> Download {result.name}
            </button>
          </div>
        )}

        <button className="action-btn purple" onClick={run} disabled={!canGo || running}>
          {running ? <><div className="spinner" /> Decrypting…</> : 'Decrypt Image'}
        </button>
      </div>
    </div>
  );
}

// ── APP ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <div className="app-wrap">
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 16 16"><path d="M8 1L2 4v4c0 3.3 2.6 5.7 6 6.5C11.4 13.7 14 11.3 14 8V4L8 1z"/></svg>
          </div>
          <div>
            <div className="logo-name">VoxCrypt</div>
            <div className="logo-tag">A Secure System</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="chip">AES-256-GCM</span>
          <span className="chip">PBKDF2</span>
          <span className="chip">Client-side only</span>
        </div>
      </header>

      <main className="panels">
        <EncryptPanel />
        <DecryptPanel />
      </main>

      <footer className="footer">
        <div className="footer-l">
          <Icon.shield />
          Secure client-side encryption. PBKDF2 + AES-256-GCM. No data stored on servers.
        </div>
        <div className="footer-r">
          Max file size: <strong style={{ color: 'var(--text-2)' }}>500 MB</strong>
        </div>
      </footer>
    </div>
  );
}
