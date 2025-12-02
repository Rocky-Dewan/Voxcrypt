# Passphrase Guide - VoxCrypt

## Understanding the 12-Character Passphrase System

This guide explains how the 12-character composite passphrase system works and how to use it effectively.

## What is a Composite Passphrase?

A composite passphrase combines three different character types into a single 12-character security key:

```
[4 Letters] + [4 Digits] + [4 Special Chars] = 12-Character Passphrase
```

### Example Breakdown

**Passphrase**: `abcd1234!@#$`

| Component | Characters | Count | Type |
|-----------|-----------|-------|------|
| Letters | `abcd` | 4 | Alphabetic (a-z, A-Z) |
| Digits | `1234` | 4 | Numeric (0-9) |
| Special | `!@#$` | 4 | Special (!@#$%^&*...) |
| **Total** | `abcd1234!@#$` | **12** | **Mixed** |

## Why Three Separate Parts?

### Security Benefits

1. **Increased Entropy**: Requires attacker to guess from three different character sets
2. **Prevents Dictionary Attacks**: Can't use simple word lists
3. **User-Friendly**: Each part is only 4 characters (easy to remember)
4. **Enforces Complexity**: Guarantees mix of character types

### Entropy Comparison

**Single 12-character passphrase** (any character):
- Possible combinations: 95^12 ≈ 475 quadrillion

**Composite 12-character passphrase** (3 parts):
- Possible combinations: 26^4 × 10^4 × 32^4 ≈ 4.7 quintillion
- **475× more secure** than single character set

## How to Create a Strong Passphrase

### Step 1: Choose 4 Random Letters

**Rules**:
- Must be 4 letters (a-z or A-Z)
- No numbers or special characters
- Can be uppercase, lowercase, or mixed

**Examples**:
- ✅ `abcd` (lowercase)
- ✅ `XYZW` (uppercase)
- ✅ `KmQx` (mixed case)
- ❌ `ab1d` (contains digit)
- ❌ `ab@d` (contains special char)

**Tips for Strong Letters**:
- Use random letters, not words
- Avoid keyboard patterns (qwerty, asdf)
- Mix uppercase and lowercase
- Don't use your name or initials

### Step 2: Choose 4 Random Digits

**Rules**:
- Must be 4 digits (0-9)
- No letters or special characters
- Can be any combination

**Examples**:
- ✅ `1234` (sequential - okay for digits)
- ✅ `7392` (random)
- ✅ `0000` (repeated - okay but weak)
- ❌ `12a4` (contains letter)
- ❌ `12!4` (contains special char)

**Tips for Strong Digits**:
- Use random digits, not birthdates
- Avoid sequential patterns (1234, 5678)
- Avoid repeated digits (1111, 2222)
- Mix different numbers

### Step 3: Choose 4 Random Special Characters

**Allowed Special Characters**:
```
! @ # $ % ^ & * ( ) _ + - = [ ] { } ; ' : " \ | , . < > / ?
```

**Rules**:
- Must be 4 special characters from the list above
- No letters or digits
- Can be any combination

**Examples**:
- ✅ `!@#$` (common symbols)
- ✅ `*&%!` (random mix)
- ✅ `()_+` (keyboard symbols)
- ❌ `!@#a` (contains letter)
- ❌ `!@#1` (contains digit)

**Tips for Strong Special Characters**:
- Use random special characters
- Mix different types (!@#$ vs *&%^)
- Avoid keyboard patterns (!@#$%^&*)
- Don't use only one type (!!!!)

## Creating Your Passphrase - Step by Step

### Method 1: Random Generation (Recommended)

1. **Letters**: Close your eyes and type 4 random letters
   - Example: `kxmq`

2. **Digits**: Think of 4 random numbers
   - Example: `7392`

3. **Special**: Pick 4 random special characters
   - Example: `*&%!`

4. **Combine**: Put them together
   - **Final Passphrase**: `kxmq7392*&%!`

### Method 2: Memorable but Strong

1. **Letters**: First letters of a memorable phrase (not your name)
   - Phrase: "Keep Xeriscape Mowing Quarterly"
   - Letters: `kxmq`

2. **Digits**: Random numbers (not birthdate)
   - Digits: `7392`

3. **Special**: Random special characters
   - Special: `*&%!`

4. **Combine**: Put them together
   - **Final Passphrase**: `kxmq7392*&%!`

### Method 3: Dice/Coin Method (Most Secure)

1. **For Letters**: Roll a die 4 times (1-6 = a-f, 7-12 = g-l, etc.)
2. **For Digits**: Flip a coin and count (heads=0, tails=1) 4 times
3. **For Special**: Use a random special character generator
4. **Combine**: Put them together

## Entering Your Passphrase

### In the Application

The application has three separate input fields:

```
┌─────────────────────────────────────┐
│ Encryption Passphrase               │
├─────────────────────────────────────┤
│ 4 letters (a-z, A-Z)                │
│ [____] 0/4                          │
│                                     │
│ 4 digits (0-9)                      │
│ [____] 0/4                          │
│                                     │
│ 4 special chars (!@#$%^&*...)       │
│ [____] 0/4                          │
│                                     │
│ [👁] Show passphrase                │
└─────────────────────────────────────┘
```

### Step-by-Step Entry

1. **Click Letters Field**: Type your 4 letters
   - Field shows: `kxmq` (1/4)

2. **Click Digits Field**: Type your 4 digits
   - Field shows: `7392` (4/4)

3. **Click Special Field**: Type your 4 special characters
   - Field shows: `*&%!` (4/4)

4. **Verify**: Click "Show passphrase" to verify
   - Shows: `kxmq7392*&%!`

## Using Your Passphrase

### For Encryption

1. Select audio file
2. Enter your 12-character passphrase (3 parts)
3. Click "Encrypt Audio"
4. Download encrypted image

### For Decryption

1. Select encrypted image
2. Enter the SAME 12-character passphrase (3 parts)
3. Click "Decrypt Image"
4. Download audio file

**Important**: The passphrase MUST match exactly (case-sensitive for letters)

## Passphrase Security

### What Makes a Passphrase Secure?

✅ **Secure Passphrases**:
- Random characters from all three types
- No personal information
- No keyboard patterns
- Different from other passphrases
- 12 characters total

❌ **Weak Passphrases**:
- Sequential: `abcd1234!@#$` (predictable)
- Personal: `john1990!@#$` (uses name/birthdate)
- Repeated: `aaaa1111####` (not random)
- Simple: `test1234!@#$` (common word)

### Security Levels

| Passphrase | Security Level | Time to Crack |
|-----------|----------------|---------------|
| `aaaa1111!!!!` | Very Weak | Minutes |
| `abcd1234!@#$` | Weak | Hours |
| `kxmq7392*&%!` | Strong | Years |
| `zT9m3@!&*%^#` | Very Strong | Centuries |

*Note: Time estimates assume 100,000 PBKDF2 iterations and modern hardware*

## Remembering Your Passphrase

### Option 1: Memory Techniques

- **Acronym**: Create a phrase, use first letters
  - Phrase: "Keep Xeriscape Mowing Quarterly, 7392 times, with *&%! passion"
  - Passphrase: `kxmq7392*&%!`

- **Story**: Create a memorable story with the characters
  - Story: "kxmq were 7392 friends who used *&%! symbols"
  - Passphrase: `kxmq7392*&%!`

### Option 2: Password Manager

Use a password manager to securely store your passphrase:
- **Recommended**: Bitwarden, 1Password, KeePass
- **Benefits**: Secure storage, auto-fill, encrypted backup
- **Setup**: Store with description "VoxCrypt"

### Option 3: Secure Written Record

If you write it down:
- Use a secure location (safe, locked drawer)
- Don't store on your computer
- Don't share with others
- Consider splitting it (store parts separately)

## What Happens If You Forget?

⚠️ **Critical**: There is NO recovery mechanism for lost passphrases.

If you forget your passphrase:
- ❌ Cannot decrypt encrypted images
- ❌ Cannot recover original audio
- ❌ No backup or recovery option
- ❌ Encrypted data is permanently inaccessible

**Prevention**:
- Write it down securely
- Use a password manager
- Create backup passphrases
- Test decryption regularly

## Passphrase Best Practices

### DO

✅ Use random characters for all three parts
✅ Store securely (password manager or safe location)
✅ Test your passphrase on a small file first
✅ Create backup copies of encrypted files
✅ Use different passphrases for different files
✅ Keep your passphrase confidential

### DON'T

❌ Use personal information (names, birthdates)
❌ Use keyboard patterns (qwerty, asdf)
❌ Use simple words or dictionary words
❌ Reuse passphrases across different purposes
❌ Share your passphrase with others
❌ Store passphrase in plain text online
❌ Use the same passphrase for everything

## Troubleshooting

### "Invalid passphrase format"

**Problem**: Application rejects your passphrase

**Solutions**:
1. Check letters field: Must be 4 letters only (a-z, A-Z)
2. Check digits field: Must be 4 digits only (0-9)
3. Check special field: Must be 4 special characters only
4. Verify no spaces or extra characters
5. Try clearing and re-entering

### "Unable to decrypt"

**Problem**: Decryption fails even with correct passphrase

**Solutions**:
1. Verify passphrase is EXACTLY the same (case-sensitive)
2. Check that you're using the correct encrypted image
3. Ensure image hasn't been corrupted
4. Try on a different browser
5. Check browser console (F12) for error details

### "Decryption succeeded but audio is corrupted"

**Problem**: Audio plays but sounds wrong

**Solutions**:
1. Verify passphrase is correct
2. Try with original encrypted image
3. Ensure original audio file was valid
4. Check that encryption completed successfully
5. Try a different audio format on download

## Advanced Topics

### Passphrase Entropy

The security of your passphrase depends on its entropy (randomness):

- **4 random letters**: 26^4 = 456,976 combinations
- **4 random digits**: 10^4 = 10,000 combinations
- **4 random special**: 32^4 = 1,048,576 combinations
- **Combined**: 456,976 × 10,000 × 1,048,576 ≈ 4.7 quintillion combinations

### PBKDF2 Key Derivation

Your passphrase is converted to an encryption key using PBKDF2:

1. Passphrase + Random Salt → PBKDF2 (100,000 iterations)
2. Output: 256-bit encryption key
3. Time: ~100ms per operation
4. Result: Brute-force attacks are slow

### Why Case Matters

The application is case-sensitive for letters:

- `abcd` ≠ `ABCD` ≠ `AbCd`
- Each variation is a different passphrase
- Increases security (more combinations)
- Must match exactly for decryption

## Summary

The 12-character composite passphrase system provides:

1. **High Security**: 4.7 quintillion possible combinations
2. **Ease of Use**: Three simple 4-character parts
3. **Brute-Force Resistance**: PBKDF2 with 100,000 iterations
4. **Authentication**: GCM mode detects tampering
5. **User Control**: You control the security level

**Remember**: Your passphrase is the only way to decrypt your audio. Keep it safe!

---

**For more information**, see:
- **README.md**: Feature overview and usage
- **SECURITY.md**: Technical security details
- **SETUP_GUIDE.md**: Installation and setup instructions
