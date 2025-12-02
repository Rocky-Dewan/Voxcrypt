# VoxCrypt - Complete Setup Guide

## Quick Start (TL;DR)

```bash
# 1. Extract and navigate
unzip voxcrypt.zip
cd voxcrypt

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev

# 4. Open browser
# Visit: http://localhost:3000
```

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **pnpm** (v10 or higher)
   - Install globally:
     ```bash
     npm install -g pnpm
     ```
   - Verify installation:
     ```bash
     pnpm --version
     ```

### System Requirements

- **OS**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended for large file processing)
- **Disk Space**: 2GB free space
- **Browser**: Modern browser with Web Crypto API support

## Step-by-Step Installation

### Step 1: Extract the Project

**Windows (Command Prompt):**
```cmd
# Navigate to your desired directory
cd C:\Users\YourUsername\Documents

# Extract the ZIP file
tar -xf voxcrypt.zip

# Navigate into the project
cd voxcrypt
```

**macOS/Linux (Terminal):**
```bash
# Navigate to your desired directory
cd ~/Documents

# Extract the ZIP file
unzip voxcrypt.zip

# Navigate into the project
cd voxcrypt
```

### Step 2: Verify Project Structure

```bash
# List project contents
ls -la

# Expected output should show:
# - client/          (Frontend React application)
# - server/          (Express server)
# - package.json     (Dependencies)
# - README.md        (Documentation)
# - vite.config.ts   (Build configuration)
```

### Step 3: Install Dependencies

```bash
# Install all npm packages
pnpm install

# This will:
# - Download all dependencies listed in package.json
# - Create node_modules/ directory
# - Generate pnpm-lock.yaml file
# - Take 2-5 minutes depending on internet speed
```

**Troubleshooting Installation:**

If installation fails:

```bash
# Clear pnpm cache
pnpm store prune

# Remove lock file and reinstall
rm pnpm-lock.yaml
pnpm install

# If still failing, try npm
npm install
```

### Step 4: Start Development Server

```bash
# Start the development server
pnpm dev

# Expected output:
# ➜  Local:   http://localhost:3000/
# ➜  Network: http://192.168.x.x:3000/
```

### Step 5: Access the Application

Open your browser and visit:
- **Local**: http://localhost:3000/
- **Network**: http://{your-ip}:3000/ (for accessing from other devices)

## Git Commands Reference

### Initialize Git Repository (Optional)

If you want to use Git version control:

```bash
# Initialize a new git repository
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: VoxCrypt"

# View commit history
git log --oneline
```

### Common Git Workflows

**Check Status:**
```bash
git status
```

**View Changes:**
```bash
git diff
```

**Commit Changes:**
```bash
git add .
git commit -m "Your commit message"
```

**View History:**
```bash
git log --oneline -10
```

## Development Workflow

### Making Changes

1. **Edit Files**: Modify files in `client/src/`
2. **Auto-Reload**: Changes automatically reload in browser
3. **Check Errors**: TypeScript errors show in terminal
4. **Test**: Verify changes in browser

### File Locations for Modifications

```
client/src/
├── pages/Home.tsx          # Main UI and logic
├── lib/encryption.ts       # Encryption functions
├── index.css              # Styles and animations
└── components/            # Reusable components
```

### TypeScript Checking

```bash
# Check for TypeScript errors (without building)
pnpm check
```

### Code Formatting

```bash
# Format all code with Prettier
pnpm format
```

## Building for Production

### Create Production Build

```bash
# Build the application
pnpm build

# This generates:
# - dist/public/          (Static files for browser)
# - dist/index.js         (Server code)
```

### Run Production Build

```bash
# Start production server
pnpm start

# The app will run on http://localhost:3000/
```

### Preview Production Build

```bash
# Preview the production build locally
pnpm preview
```

## Deployment Options

### Option 1: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts to connect your project
```

### Option 2: Deploy to Netlify

```bash
# Build the project
pnpm build

# Deploy the dist/public folder to Netlify
# Via: https://app.netlify.com/drop
```

### Option 3: Self-Hosted Server

```bash
# Build the project
pnpm build

# Copy to your server
scp -r dist/ user@your-server:/path/to/app/

# On server, install Node.js and run
node dist/index.js
```

## Troubleshooting Guide

### Problem: "pnpm: command not found"

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

### Problem: Port 3000 already in use

**Solution (Windows):**
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use a different port
set PORT=3001 && pnpm dev
```

**Solution (macOS/Linux):**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

### Problem: "Cannot find module" errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Problem: Build fails

**Solution:**
```bash
# Clear Vite cache
rm -rf dist .vite

# Rebuild
pnpm build
```

### Problem: Encryption/Decryption not working

**Solution:**
1. Ensure browser supports Web Crypto API (all modern browsers do)
2. Check browser console for errors (F12 → Console tab)
3. Try a smaller file first
4. Clear browser cache and reload

### Problem: Large files are slow

**Solution:**
- This is normal - encryption is CPU-intensive
- Use WAV format for audio (faster than MP3)
- Use PNG for images (faster than JPG)
- Close other applications to free up RAM

## Environment Variables

The application works without environment variables, but you can customize:

**Optional Configuration:**
- Create a `.env` file in the project root
- Variables are optional for this static application

## Performance Optimization

### For Development

```bash
# Use faster build with source maps
pnpm dev
```

### For Production

```bash
# Create optimized build
pnpm build

# The build includes:
# - Code minification
# - Asset optimization
# - Tree shaking
# - Gzip compression
```

## Monitoring & Logs

### Development Server Logs

Logs appear in the terminal where you ran `pnpm dev`:
- Green checkmarks indicate successful compilation
- Red errors indicate issues
- Blue info messages show server status

### Production Server Logs

```bash
# Run with logging
NODE_DEBUG=* node dist/index.js

# Or redirect to file
node dist/index.js > server.log 2>&1
```

## Stopping the Server

### Development Server

Press `Ctrl+C` in the terminal where `pnpm dev` is running

### Production Server

```bash
# Find the process
ps aux | grep node

# Kill the process
kill <PID>
```

## Advanced Configuration

### Change Port

**Development:**
```bash
# macOS/Linux
PORT=3001 pnpm dev

# Windows (Command Prompt)
set PORT=3001 && pnpm dev

# Windows (PowerShell)
$env:PORT=3001; pnpm dev
```

**Production:**
```bash
PORT=3001 pnpm start
```

### Enable Source Maps for Debugging

Edit `vite.config.ts`:
```typescript
export default {
  build: {
    sourcemap: true,
  }
}
```

## Useful Resources

- **React Documentation**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **Vite**: https://vitejs.dev/
- **TypeScript**: https://www.typescriptlang.org/

## Support & Help

### Getting Help

1. **Check the README.md** for feature documentation
2. **Check browser console** (F12) for error messages
3. **Review terminal output** for build/runtime errors
4. **Check TypeScript errors** with `pnpm check`

### Common Issues Checklist

- [ ] Node.js version is 18+
- [ ] pnpm is installed globally
- [ ] Dependencies are installed (`pnpm install`)
- [ ] Port 3000 is not in use
- [ ] Browser supports Web Crypto API
- [ ] File sizes are within limits (1GB max)

## Next Steps

1. ✅ Install and run the application
2. 📝 Read the README.md for feature documentation
3. 🎨 Explore the UI and test encryption/decryption
4. 🔧 Modify code in `client/src/` as needed
5. 🚀 Build and deploy to production

---

**Happy coding! 🚀**
