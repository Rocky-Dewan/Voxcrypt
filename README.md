# 🔒 VoxCrypt — Audio Encryption Studio

> Encrypt audio and video files into pixel-steganographic images. Recover them with your passphrase.
> **Zero servers. Zero tracking. 100% client-side.**

---

## ✨ Features

- **AES-256-GCM** authenticated encryption
- **PBKDF2** key derivation — 100,000 SHA-256 iterations
- **DEFLATE** compression — up to 90% size reduction
- **Pixel Steganography** — data stored in RGB image channels
- **12-character composite passphrase** — letters + digits + special chars
- **No API keys needed** — fully offline capable
- **Zero server storage** — Web Crypto API, all local

---

## 🚀 Quick Start

```bash
npm install
npm run dev       # → http://localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
```

---

## 🔑 Passphrase Format

| Part    | Example | Rules                  |
|---------|---------|------------------------|
| Letters | `abcd`  | Exactly 4 (a-z / A-Z) |
| Digits  | `1234`  | Exactly 4 (0-9)        |
| Special | `!@#$`  | Exactly 4 non-alphanum |

**Full passphrase**: `abcd1234!@#$`

⚠️ There is **no recovery mechanism**. Store your passphrase safely.

---

## 🏗 Architecture

```
Audio File
  → DEFLATE Compress
  → PBKDF2 Key Derivation (salt + 100K iterations)
  → AES-256-GCM Encrypt
  → Pack into PNG pixel RGB channels
  → Download encrypted image
```

---

## 📁 Structure

```
voxcrypt/
├── src/
│   ├── App.jsx          # UI — encrypt & decrypt panels
│   ├── lib/crypto.js    # Encryption engine
│   └── index.css        # Styles & animations
├── index.html
├── vite.config.js
└── package.json
```

---

MIT License — No API keys — No servers — No tracking
