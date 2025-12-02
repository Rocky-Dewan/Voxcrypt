/**
 * Home Page - VoxCrypt with Advanced Security
 * 
 * Security Features:
 * - 12-character composite passphrase (4 letters + 4 digits + 4 special chars)
 * - PBKDF2 key derivation with 100,000 iterations
 * - AES-256-GCM authenticated encryption
 * - DEFLATE compression for 90% file size reduction
 * - Vague error messages for security
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Upload, Download, Music, Image as ImageIcon, Zap, Lock, Eye, EyeOff } from 'lucide-react';
import {
  encryptAudioToImage,
  decryptImageToAudio,
  readFileAsBuffer,
  downloadBlob,
  validatePassphrase,
  combinePassphrase,
} from '@/lib/encryption';
import { toast } from 'sonner';

// Helper function to format time in MM:SS
const formatTime = (seconds: number): string => {
  if (seconds === Infinity || seconds < 0) return 'Calculating...';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
};

// Helper function to calculate ETR
const calculateETR = (startTime: number, processed: number, total: number): string => {
  const elapsed = (Date.now() - startTime) / 1000; // in seconds
  if (processed === 0 || elapsed < 1) return 'Calculating...';

  const speed = processed / elapsed; // bytes per second
  const remaining = total - processed;
  const etrSeconds = remaining / speed;

  return formatTime(etrSeconds);
};

export default function Home() {
  // Audio to Image state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [encryptLetters, setEncryptLetters] = useState('');
  const [encryptDigits, setEncryptDigits] = useState('');
  const [encryptSpecial, setEncryptSpecial] = useState('');
  const [audioProgress, setAudioProgress] = useState(0);
  const [encryptedImageBlob, setEncryptedImageBlob] = useState<Blob | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadController, setDownloadController] = useState<AbortController | null>(null);
  const [downloadStartTime, setDownloadStartTime] = useState<number | null>(null);
  const [downloadETR, setDownloadETR] = useState<string | null>(null);
  const [showEncryptPass, setShowEncryptPass] = useState(false);
  const [encryptController, setEncryptController] = useState<AbortController | null>(null);
  const [encryptStartTime, setEncryptStartTime] = useState<number | null>(null);
  const [encryptETR, setEncryptETR] = useState<string | null>(null);

  // Image to Audio state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [decryptLetters, setDecryptLetters] = useState('');
  const [decryptDigits, setDecryptDigits] = useState('');
  const [decryptSpecial, setDecryptSpecial] = useState('');
  const [imageProgress, setImageProgress] = useState(0);
  const [decryptedAudioBlob, setDecryptedAudioBlob] = useState<Blob | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [downloadAudioProgress, setDownloadAudioProgress] = useState(0);
  const [downloadAudioController, setDownloadAudioController] = useState<AbortController | null>(null);
  const [downloadAudioStartTime, setDownloadAudioStartTime] = useState<number | null>(null);
  const [downloadAudioETR, setDownloadAudioETR] = useState<string | null>(null);
  const [showDecryptPass, setShowDecryptPass] = useState(false);
  const [decryptController, setDecryptController] = useState<AbortController | null>(null);
  const [decryptStartTime, setDecryptStartTime] = useState<number | null>(null);
  const [decryptETR, setDecryptETR] = useState<string | null>(null);

  // File input refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Audio to Image handlers
  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 1GB.');
        return;
      }
      setAudioFile(file);
      setEncryptedImageBlob(null);
      setAudioProgress(0);
    }
  };

  const handleEncryptAudio = async () => {
    if (!audioFile) {
      toast.error('Please select an audio file.');
      return;
    }

    // Validate passphrase
    const validation = validatePassphrase(encryptLetters, encryptDigits, encryptSpecial);
    if (!validation.valid) {
      toast.error('Invalid passphrase format. Please check your input.');
      return;
    }

    try {
      const controller = new AbortController();
      setEncryptController(controller);
      const startTime = Date.now();
      setEncryptStartTime(startTime);
      setEncryptETR(null);
      setIsEncrypting(true);
      setAudioProgress(0);

      // Read file
      const buffer = await readFileAsBuffer(audioFile, (progress: number) => {
        setAudioProgress(progress * 0.3);
        const etr = calculateETR(startTime, audioFile.size * (progress * 0.3) / 100, audioFile.size);
        setEncryptETR(etr);
      });

      // Combine passphrase
      const passphrase = combinePassphrase(encryptLetters, encryptDigits, encryptSpecial);

      // Encrypt and convert to image
      const imageBlob = await encryptAudioToImage(buffer, passphrase, controller.signal, (progress: number) => {
        setAudioProgress(30 + progress * 0.7);
        const etr = calculateETR(startTime, audioFile.size * (30 + progress * 0.7) / 100, audioFile.size);
        setEncryptETR(etr);
      });

      setEncryptedImageBlob(imageBlob);
      setAudioProgress(100);
      toast.success('Audio encrypted successfully! File size reduced by ~90%.');
    } catch (error) {
      console.error('Encryption error:', error);
      toast.error('Failed to process audio. Please try again.');
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleCancelEncrypt = () => {
    encryptController?.abort();
    toast.info('Encryption cancelled.');
    setEncryptController(null);
    setEncryptStartTime(null);
    setEncryptETR(null);
    setIsEncrypting(false);
    setAudioProgress(0);
  };

  const handleCancelDownloadImage = () => {
    downloadController?.abort();
    toast.info('Image download cancelled.');
    setDownloadController(null);
    setDownloadStartTime(null);
    setDownloadETR(null);
    setDownloadProgress(0);
  };

  const handleDownloadImage = (format: 'png' | 'jpg' | 'jpeg') => {
    if (!encryptedImageBlob) {
      toast.error('No encrypted image available.');
      return;
    }

    const controller = new AbortController();
    setDownloadController(controller);
    const startTime = Date.now();
    setDownloadStartTime(startTime);
    setDownloadETR(null);

    setDownloadProgress(0);
    const filename = `encrypted-audio.${format}`;
    const totalBytes = encryptedImageBlob.size;

    downloadBlob(encryptedImageBlob, filename, controller.signal, (processed, total) => {
      const progressPercent = (processed / total) * 100;
      setDownloadProgress(progressPercent);

      const etr = calculateETR(startTime, processed, total);
      setDownloadETR(etr);

      if (processed === total) {
        setDownloadController(null);
        setDownloadStartTime(null);
        setDownloadETR(null);
        toast.success('Encrypted image downloaded successfully.');
      }
    });
  };

  // Image to Audio handlers
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file.');
        return;
      }
      setImageFile(file);
      setDecryptedAudioBlob(null);
      setImageProgress(0);
    }
  };

  const handleDecryptImage = async () => {
    if (!imageFile) {
      toast.error('Please select an encrypted image.');
      return;
    }

    // Validate passphrase
    const validation = validatePassphrase(decryptLetters, decryptDigits, decryptSpecial);
    if (!validation.valid) {
      toast.error('Invalid passphrase format. Please check your input.');
      return;
    }

    try {
      const controller = new AbortController();
      setDecryptController(controller);
      const startTime = Date.now();
      setDecryptStartTime(startTime);
      setDecryptETR(null);
      setIsDecrypting(true);
      setImageProgress(0);

      // Read file
      const buffer = await readFileAsBuffer(imageFile, (progress: number) => {
        setImageProgress(progress * 0.3);
        const etr = calculateETR(startTime, imageFile.size * (progress * 0.3) / 100, imageFile.size);
        setDecryptETR(etr);
      });

      // Combine passphrase
      const passphrase = combinePassphrase(decryptLetters, decryptDigits, decryptSpecial);

      // Decrypt
      const audioBuffer = await decryptImageToAudio(buffer, passphrase, controller.signal, (progress: number) => {
        setImageProgress(30 + progress * 0.7);
        const etr = calculateETR(startTime, imageFile.size * (30 + progress * 0.7) / 100, imageFile.size);
        setDecryptETR(etr);
      });

      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      setDecryptedAudioBlob(audioBlob);
      setImageProgress(100);
      toast.success('Image decrypted successfully!');
    } catch (error) {
      console.error('Decryption error:', error);
      toast.error('Unable to decrypt. Please verify your passphrase and try again.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCancelDecrypt = () => {
    decryptController?.abort();
    toast.info('Decryption cancelled.');
    setDecryptController(null);
    setDecryptStartTime(null);
    setDecryptETR(null);
    setIsDecrypting(false);
    setImageProgress(0);
  };

  const handleCancelDownloadAudio = () => {
    downloadAudioController?.abort();
    toast.info('Audio download cancelled.');
    setDownloadAudioController(null);
    setDownloadAudioStartTime(null);
    setDownloadAudioETR(null);
    setDownloadAudioProgress(0);
  };

  const handleDownloadAudio = (format: 'mp3' | 'wav') => {
    if (!decryptedAudioBlob) {
      toast.error('No decrypted audio available.');
      return;
    }

    const controller = new AbortController();
    setDownloadAudioController(controller);
    const startTime = Date.now();
    setDownloadAudioStartTime(startTime);
    setDownloadAudioETR(null);

    setDownloadAudioProgress(0);
    const filename = `decrypted-audio.${format}`;
    const totalBytes = decryptedAudioBlob.size;

    downloadBlob(decryptedAudioBlob, filename, controller.signal, (processed, total) => {
      const progressPercent = (processed / total) * 100;
      setDownloadAudioProgress(progressPercent);

      const etr = calculateETR(startTime, processed, total);
      setDownloadAudioETR(etr);

      if (processed === total) {
        setDownloadAudioController(null);
        setDownloadAudioStartTime(null);
        setDownloadAudioETR(null);
        toast.success('Decrypted audio downloaded successfully.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-md bg-slate-900/50 sticky top-0 z-20">
          <div className="container py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    VoxCrypt
                  </h1>
                  <p className="text-xs text-slate-400">A Secure System</p>
                  {/* encryption with 12-character passphrase */}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 container py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Audio to Image Section */}
            <div className="animate-slide-in-left">
              <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl transition-all duration-300 hover:bg-slate-800/80 hover:border-cyan-500/50 hover:shadow-2xl p-8 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Music className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Audio to Image</h2>
                    <p className="text-sm text-slate-400">Encrypt & compress</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-6">
                  {/* File upload area */}
                  <div
                    className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500/60 transition-colors"
                    onClick={() => audioInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                    <p className="text-white font-medium mb-1">
                      {audioFile ? audioFile.name : 'Click to upload audio'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {audioFile
                        ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`
                        : 'Max 1GB • MP3, WAV, etc.'}
                    </p>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Passphrase inputs */}
                  <div className="space-y-3 bg-slate-800/50 p-4 rounded-lg border border-cyan-500/20">
                    <p className="text-sm font-semibold text-cyan-300">Encryption Passphrase</p>
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={showEncryptPass ? 'text' : 'password'}
                          placeholder="4 letters (a-z, A-Z)"
                          value={encryptLetters}
                          onChange={(e) => setEncryptLetters(e.target.value.slice(0, 4).replace(/[^a-zA-Z]/g, ''))}
                          maxLength={4}
                          className="bg-slate-700/50 border-cyan-500/30 text-white placeholder-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {encryptLetters.length}/4
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type={showEncryptPass ? 'text' : 'password'}
                          placeholder="4 digits (0-9)"
                          value={encryptDigits}
                          onChange={(e) => setEncryptDigits(e.target.value.slice(0, 4).replace(/[^0-9]/g, ''))}
                          maxLength={4}
                          className="bg-slate-700/50 border-cyan-500/30 text-white placeholder-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {encryptDigits.length}/4
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type={showEncryptPass ? 'text' : 'password'}
                          placeholder="4 special chars (!@#$%^&*...)"
                          value={encryptSpecial}
                          onChange={(e) => setEncryptSpecial(e.target.value.slice(0, 4).replace(/[^!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, ''))}
                          maxLength={4}
                          className="bg-slate-700/50 border-cyan-500/30 text-white placeholder-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {encryptSpecial.length}/4
                        </span>
                      </div>
                      <button
                        onClick={() => setShowEncryptPass(!showEncryptPass)}
                        className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {showEncryptPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showEncryptPass ? 'Hide' : 'Show'} passphrase
                      </button>
                    </div>
                  </div>

                  {/* Encryption progress */}
                  {isEncrypting && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-300">Encrypting & compressing...</p>
                        <p className="text-sm font-mono text-cyan-400">{Math.round(audioProgress)}%</p>
                      </div>
                      <Progress value={audioProgress} className="h-2" />
                    </div>
                  )}

                  {/* Download progress */}
                  {downloadProgress > 0 && downloadProgress < 100 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-300">Downloading...</p>
                        <p className="text-sm font-mono text-cyan-400">{Math.round(downloadProgress)}%</p>
                      </div>
                      <Progress value={downloadProgress} className="h-2" />
                    </div>
                  )}

                  {/* Preview */}
                  {encryptedImageBlob && (
                    <div className="rounded-lg overflow-hidden border border-cyan-500/30 bg-slate-800/50">
                      <img
                        src={URL.createObjectURL(encryptedImageBlob)}
                        alt="Encrypted"
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3 bg-slate-800/70 border-t border-cyan-500/20">
                        <p className="text-xs text-slate-300">
                          Original: {((audioFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-cyan-400 font-semibold">
                          Encrypted: {(encryptedImageBlob.size / 1024).toFixed(2)} KB (~{Math.round(100 - (encryptedImageBlob.size / (audioFile?.size || 1)) * 100)}% reduction)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="space-y-3 mt-auto">
                    {isEncrypting ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleCancelEncrypt}
                          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                        >
                          <Zap className="w-4 h-4 mr-2" /> Cancel Encryption
                        </Button>
                        {encryptETR && (
                          <p className="text-sm text-center text-slate-400">
                            ETR: <span className="font-mono text-cyan-400">{encryptETR}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={handleEncryptAudio}
                        disabled={!audioFile || isEncrypting || !encryptLetters || !encryptDigits || !encryptSpecial}
                        className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold disabled:opacity-50"
                      >
                        Encrypt Audio
                      </Button>
                    )}

                    {downloadController ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleCancelDownloadImage}
                          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                        >
                          <Download className="w-4 h-4 mr-2" /> Cancel Download
                        </Button>
                        {downloadETR && (
                          <p className="text-sm text-center text-slate-400">
                            ETR: <span className="font-mono text-cyan-400">{downloadETR}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      encryptedImageBlob && (
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => handleDownloadImage('png')}
                            variant="outline"
                            className="text-xs border-cyan-500/30 hover:bg-cyan-500/10"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PNG
                          </Button>
                          <Button
                            onClick={() => handleDownloadImage('jpg')}
                            variant="outline"
                            className="text-xs border-cyan-500/30 hover:bg-cyan-500/10"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            JPG
                          </Button>
                          <Button
                            onClick={() => handleDownloadImage('jpeg')}
                            variant="outline"
                            className="text-xs border-cyan-500/30 hover:bg-cyan-500/10"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            JPEG
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Image to Audio Section */}
            <div className="animate-slide-in-right">
              <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl transition-all duration-300 hover:bg-slate-800/80 hover:border-purple-500/50 hover:shadow-2xl p-8 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <ImageIcon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Image to Audio</h2>
                    <p className="text-sm text-slate-400">Decrypt & decompress</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-6">
                  {/* File upload area */}
                  <div
                    className="border-2 border-dashed border-purple-500/30 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500/60 transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <p className="text-white font-medium mb-1">
                      {imageFile ? imageFile.name : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {imageFile
                        ? `${(imageFile.size / 1024).toFixed(2)} KB`
                        : 'PNG, JPG, JPEG • Encrypted image'}
                    </p>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Passphrase inputs */}
                  <div className="space-y-3 bg-slate-800/50 p-4 rounded-lg border border-purple-500/20">
                    <p className="text-sm font-semibold text-purple-300">Decryption Passphrase</p>
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={showDecryptPass ? 'text' : 'password'}
                          placeholder="4 letters (a-z, A-Z)"
                          value={decryptLetters}
                          onChange={(e) => setDecryptLetters(e.target.value.slice(0, 4).replace(/[^a-zA-Z]/g, ''))}
                          maxLength={4}
                          className="bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {decryptLetters.length}/4
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type={showDecryptPass ? 'text' : 'password'}
                          placeholder="4 digits (0-9)"
                          value={decryptDigits}
                          onChange={(e) => setDecryptDigits(e.target.value.slice(0, 4).replace(/[^0-9]/g, ''))}
                          maxLength={4}
                          className="bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {decryptDigits.length}/4
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type={showDecryptPass ? 'text' : 'password'}
                          placeholder="4 special chars (!@#$%^&*...)"
                          value={decryptSpecial}
                          onChange={(e) => setDecryptSpecial(e.target.value.slice(0, 4).replace(/[^!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, ''))}
                          maxLength={4}
                          className="bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {decryptSpecial.length}/4
                        </span>
                      </div>
                      <button
                        onClick={() => setShowDecryptPass(!showDecryptPass)}
                        className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {showDecryptPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showDecryptPass ? 'Hide' : 'Show'} passphrase
                      </button>
                    </div>
                  </div>

                  {/* Decryption progress */}
                  {isDecrypting && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-300">Decrypting & decompressing...</p>
                        <p className="text-sm font-mono text-purple-400">{Math.round(imageProgress)}%</p>
                      </div>
                      <Progress value={imageProgress} className="h-2" />
                    </div>
                  )}

                  {/* Download progress */}
                  {downloadAudioProgress > 0 && downloadAudioProgress < 100 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-300">Downloading...</p>
                        <p className="text-sm font-mono text-purple-400">{Math.round(downloadAudioProgress)}%</p>
                      </div>
                      <Progress value={downloadAudioProgress} className="h-2" />
                    </div>
                  )}

                  {/* Audio player */}
                  {decryptedAudioBlob && (
                    <div className="rounded-lg border border-purple-500/30 bg-slate-800/50 p-4">
                      <audio
                        controls
                        src={URL.createObjectURL(decryptedAudioBlob)}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="space-y-3 mt-auto">
                    {isDecrypting ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleCancelDecrypt}
                          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                        >
                          <Zap className="w-4 h-4 mr-2" /> Cancel Decryption
                        </Button>
                        {decryptETR && (
                          <p className="text-sm text-center text-slate-400">
                            ETR: <span className="font-mono text-purple-400">{decryptETR}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={handleDecryptImage}
                        disabled={!imageFile || isDecrypting || !decryptLetters || !decryptDigits || !decryptSpecial}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold disabled:opacity-50"
                      >
                        Decrypt Image
                      </Button>
                    )}

                    {downloadAudioController ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleCancelDownloadAudio}
                          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                        >
                          <Download className="w-4 h-4 mr-2" /> Cancel Download
                        </Button>
                        {downloadAudioETR && (
                          <p className="text-sm text-center text-slate-400">
                            ETR: <span className="font-mono text-purple-400">{downloadAudioETR}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      decryptedAudioBlob && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => handleDownloadAudio('mp3')}
                            variant="outline"
                            className="text-xs border-purple-500/30 hover:bg-purple-500/10"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            MP3
                          </Button>
                          <Button
                            onClick={() => handleDownloadAudio('wav')}
                            variant="outline"
                            className="text-xs border-purple-500/30 hover:bg-purple-500/10"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            WAV
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 backdrop-blur-md bg-slate-900/50">
          <div className="container py-6 text-center">
            <p className="text-sm text-slate-400">
              <Lock className="w-4 h-4 inline mr-2" />
              Secure client-side encryption. PBKDF2 + AES-256-GCM. No data stored on servers.
            </p>
            <p className="text-sm text-slate-400">
              Developed by
              <a href="https://github.com/Rocky-Dewan" className="text-blue-600 hover:text-blue-800 underline ml-1">
                Rocky Dewan
              </a>
            </p>

          </div>
        </footer>
      </div>
    </div>
  );
}
