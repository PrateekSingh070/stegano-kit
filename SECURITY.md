# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in stegano-kit, please report it responsibly:

1. **Do NOT open a public GitHub issue.**
2. Email **prateeksingh7652000017@gmail.com** with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive an acknowledgment within 48 hours.
4. A fix will be developed and released as soon as possible.

## Security Considerations

stegano-kit's encryption feature uses:
- **AES-256-GCM** via the Web Crypto API (`SubtleCrypto`)
- **PBKDF2** key derivation with 100,000 iterations and SHA-256
- Random 16-byte salt and 12-byte IV per encryption

> **Note:** Steganography provides *obscurity*, not *security*. The optional encryption layer adds real cryptographic protection on top. For sensitive data, always use the `password` option.
