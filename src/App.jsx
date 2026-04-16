import React, { useState, useRef, useCallback } from 'react';
import { encryptMediaToFile, decryptFileToMedia, validatePassphrase, buildPassphrase } from './lib/crypto.js';

// ── LIMITS ───────────────────────────────────────────────────────
const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

// ── MEDIA HELPERS ────────────────────────────────────────────────
const VIDEO_EXTS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'm4v'];
const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'];

function getExt(name) { return (name || '').split('.').pop().toLowerCase(); }
function isVideoExt(ext) { return VIDEO_EXTS.includes(ext); }

// Mime type for playback — we never transcode, bytes are served as-is
function mimeForExt(ext) {
  const map = {
    mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/mp4',
    mkv: 'video/x-matroska', avi: 'video/x-msvideo', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
    aac: 'audio/aac', ogg: 'audio/ogg', m4a: 'audio/mp4', opus: 'audio/ogg',
  };
  return map[ext] || 'application/octet-stream';
}

// ── ICONS ────────────────────────────────────────────────────────
const Icon = {
  lock: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="8" rx="1.5"/>
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>
    </svg>
  ),
  unlock: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="8" rx="1.5"/>
      <path d="M5.5 7V5a2.5 2.5 0 015 0"/>
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
  github: () => (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
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

const STAGE_LABEL = {
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

// ── FORMAT TOGGLE ────────────────────────────────────────────────
function FormatToggle({ label, options, value, onChange, color }) {
  return (
    <div>
      <div className="sec-label">{label}</div>
      <div className="file-type-toggle">
        {options.map(([val, display]) => (
          <button
            key={val}
            className={`toggle-btn ${value === val ? `active-${color}` : ''}`}
            onClick={() => onChange(val)}
          >
            {display}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PASSPHRASE FIELDS ────────────────────────────────────────────
function PassFields({ letters, digits, special, onChange, show, onToggle }) {
  const lOk = /^[a-zA-Z]{4}$/.test(letters);
  const dOk = /^\d{4}$/.test(digits);
  const sOk = special.length === 4 && !/[a-zA-Z0-9]/.test(special);

  const fields = [
    { key: 'letters', val: letters, ph: '4 letters (a-z, A-Z)',         ok: lOk },
    { key: 'digits',  val: digits,  ph: '4 digits (0-9)',                ok: dOk },
    { key: 'special', val: special, ph: '4 special chars (!@#$%^&*...)', ok: sOk },
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

  const filledCls = file ? (side === 'blue' ? 'filled-b' : 'filled-p') : '';
  const FileIcon = fileType === 'video' ? Icon.video : (side === 'purple' ? Icon.image : Icon.audio);

  return (
    <div>
      <div className="sec-label">{side === 'blue' ? 'Media file' : 'Encrypted image'}</div>
      <div
        className={`drop-zone ${drag ? 'drag' : ''} ${filledCls}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onClick={() => !file && ref.current.click()}
        style={{ cursor: file ? 'default' : 'pointer' }}
      >
        <input
          ref={ref} type="file" accept={accept} style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        />
        {file ? (
          <div className="file-row">
            <div className={`file-row-icon ${side}`}><FileIcon /></div>
            <div className="file-row-info">
              <div className="file-row-name">{file.name}</div>
              <div className="file-row-size">{fmtBytes(file.size)}</div>
            </div>
            <button
              className="cancel-btn"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              title="Remove file"
            >
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
  const [file,    setFile]  = useState(null);
  const [letters, setL]     = useState('');
  const [digits,  setD]     = useState('');
  const [special, setS]     = useState('');
  const [show,    setShow]  = useState(false);
  const [running, setRun]   = useState(false);
  const [pct,     setPct]   = useState(null);
  const [stage,   setStg]   = useState('');
  const [err,     setErr]   = useState('');
  const [stats,   setStats] = useState(null);

  const onChange = (k, v) => {
    if (k === 'letters') setL(v);
    if (k === 'digits')  setD(v);
    if (k === 'special') setS(v);
  };

  const lOk = /^[a-zA-Z]{4}$/.test(letters);
  const dOk = /^\d{4}$/.test(digits);
  const sOk = special.length === 4 && !/[a-zA-Z0-9]/.test(special);
  const canGo = file && lOk && dOk && sOk && !running;

  const accept = fileType === 'audio'
    ? 'audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.opus'
    : 'video/*,.mp4,.mkv,.webm,.avi,.mov,.m4v';

  const handleFile = (f) => {
    if (f.size > MAX_FILE_BYTES) {
      setErr(`File too large. Max supported size is 500 MB. Your file: ${fmtBytes(f.size)}`);
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
      const res = await encryptMediaToFile(file, pp, ({ stage: s, pct: p }) => {
        setStg(s); setPct(p);
      });
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^.]+$/, '') + '_encrypted' + res.ext;
      a.click();
      URL.revokeObjectURL(url);
      const reduction = ((1 - res.outputSize / res.originalSize) * 100).toFixed(1);
      setStats({
        orig: fmtBytes(res.originalSize),
        enc:  fmtBytes(res.outputSize),
        saved: reduction + '%',
        fmt: res.ext === '.vxc' ? 'VXC' : 'PNG',
        compressed: res.wasCompressed,
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
            <div className="panel-title">Media to Image</div>
            <div className="panel-sub">Encrypt &amp; compress</div>
          </div>
        </div>
      </div>

      <div className="panel-body">
        {/* File type */}
        <FormatToggle
          label="File type"
          options={[['audio','Audio'],['video','Video']]}
          value={fileType}
          onChange={(v) => { setFileType(v); setFile(null); setErr(''); setStats(null); }}
          color="blue"
        />

        {/* Drop zone */}
        <DropZone
          file={file} onFile={handleFile}
          onCancel={() => { setFile(null); setErr(''); setStats(null); }}
          accept={accept}
          label={`Click to upload ${fileType}`}
          sub={fileType === 'audio'
            ? 'MP3, WAV, FLAC, AAC, OGG · max 500 MB'
            : 'MP4, MKV, WebM, MOV · max 500 MB'}
          side="blue"
          fileType={fileType}
        />

        {/* Passphrase */}
        <PassFields
          letters={letters} digits={digits} special={special}
          onChange={onChange} show={show} onToggle={() => setShow(v => !v)}
        />

        {err && <div className="notif error"><Icon.alert /><span>{err}</span></div>}

        {running && pct !== null && (
          <div className="progress-wrap">
            <div className="progress-top">
              <span className="progress-stage">{STAGE_LABEL[stage] || '…'}</span>
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
              <div className="stat-cell"><div className="stat-val">{stats.enc}</div><div className="stat-key">Output</div></div>
              <div className="stat-cell"><div className="stat-val" style={{color: parseFloat(stats.saved) > 0 ? 'var(--green)' : 'var(--red)'}}>{stats.saved}</div><div className="stat-key">Reduced</div></div>
            </div>
            <div className="notif success" style={{ margin: 0 }}>
              <Icon.check />
              <span>
                Saved as <strong>.{stats.fmt.toLowerCase()}</strong> file.
                {stats.compressed ? ' Gzip compressed + AES-256-GCM encrypted.' : ' AES-256-GCM encrypted (media already compressed).'}
              </span>
            </div>
          </div>
        )}

        <button className="action-btn blue" onClick={run} disabled={!canGo}>
          {running ? <><div className="spinner" />Encrypting…</> : 'Encrypt'}
        </button>
      </div>
    </div>
  );
}

// ── DECRYPT PANEL ────────────────────────────────────────────────
function DecryptPanel() {
  const [imgFile, setImg]    = useState(null);
  const [letters, setL]      = useState('');
  const [digits,  setD]      = useState('');
  const [special, setS]      = useState('');
  const [show,    setShow]   = useState(false);
  const [running, setRun]    = useState(false);
  const [pct,     setPct]    = useState(null);
  const [stage,   setStg]    = useState('');
  const [err,     setErr]    = useState('');
  // recovered holds raw bytes + original name before format selection
  const [recovered, setRecovered] = useState(null);
  // outFmt is the chosen output format string (e.g. 'mp3','wav','mp4','webm')
  const [outFmt, setOutFmt]  = useState(null);

  const onChange = (k, v) => {
    if (k === 'letters') setL(v);
    if (k === 'digits')  setD(v);
    if (k === 'special') setS(v);
  };

  const lOk = /^[a-zA-Z]{4}$/.test(letters);
  const dOk = /^\d{4}$/.test(digits);
  const sOk = special.length === 4 && !/[a-zA-Z0-9]/.test(special);
  const canGo = imgFile && lOk && dOk && sOk && !running;

  const run = async () => {
    setErr(''); setRecovered(null); setOutFmt(null);
    const errs = validatePassphrase(letters, digits, special);
    if (errs.length) { setErr(errs[0]); return; }
    setRun(true);
    try {
      const pp = buildPassphrase(letters, digits, special);
      const res = await decryptFileToMedia(imgFile, pp, ({ stage: s, pct: p }) => {
        setStg(s); setPct(p);
      });

      const origExt = getExt(res.originalName);
      const isVideo = isVideoExt(origExt);

      // Default output format = original format
      setOutFmt(origExt);
      setRecovered({
        bytes: res.mediaBytes,
        originalName: res.originalName,
        origExt,
        isVideo,
        size: res.size,
      });
    } catch (e) {
      setErr(e.message);
    }
    setRun(false);
  };

  // Build a blob URL for the current outFmt selection
  // Note: we serve the raw bytes with the chosen mime type.
  // For audio-only output from a video file, this won't work perfectly
  // in the browser preview (can't demux in JS easily), but the bytes
  // remain intact for download.
  const getBlob = () => {
    if (!recovered || !outFmt) return null;
    const mime = mimeForExt(outFmt);
    return new Blob([recovered.bytes], { type: mime });
  };

  const getDownloadName = () => {
    if (!recovered || !outFmt) return '';
    const base = recovered.originalName.replace(/\.[^.]+$/, '');
    return `${base}.${outFmt}`;
  };

  const download = () => {
    const blob = getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = getDownloadName(); a.click();
    URL.revokeObjectURL(url);
  };

  // Blob URL for preview — regenerate when outFmt changes
  const [previewUrl, setPreviewUrl] = useState(null);
  React.useEffect(() => {
    if (!recovered || !outFmt) { setPreviewUrl(null); return; }
    const blob = getBlob();
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recovered, outFmt]);

  // Format options based on what was decrypted
  const formatOptions = recovered
    ? recovered.isVideo
      ? [['mp4','MP4'],['webm','WebM']]   // video output options
      : [['mp3','MP3'],['wav','WAV'],['ogg','OGG']] // audio output options
    : [];

  const currentIsVideo = outFmt ? isVideoExt(outFmt) : false;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <div className="panel-icon purple"><Icon.unlock /></div>
          <div>
            <div className="panel-title">Image to Media</div>
            <div className="panel-sub">Decrypt &amp; decompress (.vxc / PNG)</div>
          </div>
        </div>
      </div>

      <div className="panel-body">
        <DropZone
          file={imgFile}
          onFile={(f) => { setImg(f); setErr(''); setRecovered(null); setOutFmt(null); }}
          onCancel={() => { setImg(null); setErr(''); setRecovered(null); setOutFmt(null); }}
          accept=".vxc,.png,.jpg,.jpeg,image/*"
          label="Click to upload encrypted file"
          sub="VXC, PNG, JPG · Encrypted file"
          side="purple"
          fileType="image"
        />

        <PassFields
          letters={letters} digits={digits} special={special}
          onChange={onChange} show={show} onToggle={() => setShow(v => !v)}
        />

        {err && <div className="notif error"><Icon.alert /><span>{err}</span></div>}

        {running && pct !== null && (
          <div className="progress-wrap">
            <div className="progress-top">
              <span className="progress-stage">{STAGE_LABEL[stage] || '…'}</span>
              <span className="progress-pct">{Math.round(pct)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar purple" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {recovered && !running && (
          <div className="result-block">
            <div className="stat-row">
              <div className="stat-cell">
                <div className="stat-val">{fmtBytes(recovered.size)}</div>
                <div className="stat-key">Recovered</div>
              </div>
              <div className="stat-cell">
                <div className="stat-val">{recovered.isVideo ? 'Video' : 'Audio'}</div>
                <div className="stat-key">Type</div>
              </div>
              <div className="stat-cell">
                <div className="stat-val">{recovered.origExt.toUpperCase()}</div>
                <div className="stat-key">Original</div>
              </div>
            </div>

            {/* Output format selector — shown after successful decrypt */}
            <div>
              <div className="sec-label" style={{ marginBottom: 6 }}>Output format</div>
              <div className="file-type-toggle">
                {formatOptions.map(([val, display]) => (
                  <button
                    key={val}
                    className={`toggle-btn ${outFmt === val ? 'active-purple' : ''}`}
                    onClick={() => setOutFmt(val)}
                  >
                    {display}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              currentIsVideo ? (
                <video
                  key={previewUrl}
                  controls
                  src={previewUrl}
                  style={{ width: '100%', borderRadius: 6, maxHeight: 160, background: '#000' }}
                />
              ) : (
                <audio key={previewUrl} controls src={previewUrl} style={{ width: '100%' }} />
              )
            )}

            <button className="dl-btn" onClick={download}>
              <Icon.download /> Download {getDownloadName()}
            </button>
          </div>
        )}

        <button className="action-btn purple" onClick={run} disabled={!canGo}>
          {running ? <><div className="spinner" />Decrypting…</> : 'Decrypt Image'}
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
            <svg viewBox="0 0 16 16" fill="#fff">
              <path d="M8 1L2 4v4c0 3.3 2.6 5.7 6 6.5C11.4 13.7 14 11.3 14 8V4L8 1z"/>
            </svg>
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
          &nbsp;·&nbsp; Large files → .vxc binary container · Small files → PNG · Max: <strong style={{ color: 'var(--text-2)', marginLeft: 3 }}>500 MB</strong>
        </div>
        <div className="footer-r">
          Developed by&nbsp;
          <a
            href="https://github.com/Rocky-Dewan"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Icon.github /> Rocky Dewan
          </a>
        </div>
      </footer>
    </div>
  );
}
