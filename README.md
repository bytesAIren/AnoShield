<h1 align="center">AnonShield</h1>

<p align="center">
  <strong>Secure, browser-based file anonymization — no uploads, no servers, no APIs.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#supported-file-types">File Types</a> •
  <a href="#getting-started">Get Started</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#pii-detection">PII Detection</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#security">Security</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/100%25-Client--Side-22d3ee?style=for-the-badge&logo=javascript&logoColor=white" alt="100% Client-Side">
  <img src="https://img.shields.io/badge/Zero-Server%20Upload-34d399?style=for-the-badge&logo=lock&logoColor=white" alt="Zero Server Upload">
  <img src="https://img.shields.io/badge/Privacy-First-a855f7?style=for-the-badge&logo=shield&logoColor=white" alt="Privacy First">
</p>

---

## What is AnonShield?

**AnonShield** is a free, open-source web-based **document sanitization and PII redaction** tool that **permanently removes personal and sensitive data** from documents — directly in your browser. Files never leave your machine. No server uploads, no cloud processing, no external API calls. Everything runs 100% locally using JavaScript, ensuring complete **Data Privacy**.

Whether you need to anonymize a contract, redact personal data from a tax document for **GDPR compliance**, or clean sensitive information from spreadsheets before sharing them to meet **CCPA regulations**, AnonShield does it all without compromising data security. 

### 🛡️ Built for Compliance (GDPR, CCPA, HIPAA)
AnonShield is an essential tool for organizations and individuals needing strict adherence to data protection laws:
- **Zero Data Exposure**: Sensitive Personally Identifiable Information (PII) never touches a third-party server.
- **Data Minimization**: Permanent removal of PII ensures you only retain the data you strictly need.
- **Risk Mitigation**: Operating entirely offline within the browser dramatically reduces the risk of data breaches during the anonymization workflow.
- **Privacy by Design**: Built from the ground up prioritizing user privacy, security, and confidentiality over tracking or analytics.

> ⚠️ **Important**: For PDF files, AnonShield uses a **rasterization approach** — pages are rendered as high-resolution images with redaction applied directly on the pixels. This guarantees that redacted data is **permanently destroyed** and cannot be recovered via hidden text layers. A clean, searchable text layer is then reconstructed from the pre-extracted text.

---

## Features

### 🔒 Privacy-First Architecture
- **100% client-side processing** — files never leave your browser
- **Zero network requests** during processing — verifiable via DevTools
- **No cookies, no tracking, no analytics** — complete privacy

### 📄 Multi-Format Support
- **PDF** — Rasterization-based redaction with text layer reconstruction
- **DOCX** — XML-level text manipulation preserving formatting
- **XLSX/XLS** — Cell-by-cell scanning across all sheets
- **TXT/CSV** — Direct text replacement

### 🧠 Intelligent PII Detection
- **600+ Italian first names** and **400+ Italian surnames** built-in dictionary
- **Italian address patterns** (Via, Piazza, Corso, Viale, etc.)
- **International PII**: emails, phones, SSN, IBAN, credit cards, dates, IPs, URLs
- **Italian-specific**: Codice Fiscale, CAP postal codes
- **Custom word lists** — add your own names, companies, or terms to always redact
- **Zero API dependency** — all detection runs locally via regex + dictionary matching

### 🎨 Flexible Redaction Styles
- **████ Black Bars** — solid blocks covering the original text
- **[REDACTED]** — replacement marker text
- **Custom text** — any replacement string you choose
- **Remove** — silently strip the data entirely

### ⚡ Batch Processing
- **Sequential queue** — drop multiple files, processed one at a time
- **Auto-scanning** — PII count shown before processing
- **Individual downloads** — each file downloaded separately with `_anonymized` suffix

### 🎯 PDF-Specific Features
- **300 DPI** output (configurable: 150/200/300)
- **Permanent rasterization** — original text data is destroyed
- **Searchable text layer** — reconstructed from pre-extracted text (not OCR)
- **Metadata stripping** — author, title, subject, keywords removed
- **JPEG compression** — optimized file size

---

## Supported File Types

| Format | Extension | Processing Method | Preserves |
|--------|-----------|-------------------|-----------|
| **PDF** | `.pdf` | Rasterization + text layer | Visual layout, page structure |
| **Word** | `.docx` | XML text node manipulation | Formatting, styles, headers/footers |
| **Excel** | `.xlsx`, `.xls` | Cell-by-cell replacement | Cell formatting, formulas structure |
| **Text** | `.txt`, `.csv` | Direct text replacement | Plain text structure |

---

## Getting Started

### Option 1: Open Directly
Simply open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari). No installation, no build process, no dependencies to install.

```bash
# Clone the repository
git clone https://github.com/yourusername/anonshield.git

# Open in browser
open anonshield/index.html
# or on Windows
start anonshield/index.html
```

### Option 2: Local Server (Recommended)
For the best experience, serve the files via a local HTTP server:

```bash
# Using Python
cd anonshield
python -m http.server 3000

# Using Node.js
npx serve anonshield -p 3000

# Using PHP
php -S localhost:3000 -t anonshield
```

Then navigate to `http://localhost:3000` in your browser.

### Option 3: Host on Any Static Server
AnonShield is a set of static files. Deploy to GitHub Pages, Netlify, Vercel, or any web hosting — no backend required.

---

## How It Works

### PDF Processing Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌─────────────┐
│  Load PDF   │────▶│ Extract text  │────▶│ Detect PII     │────▶│ Render page │
│  (pdf.js)   │     │ + positions   │     │ in each line   │     │ to Canvas   │
└─────────────┘     └──────────────┘     └────────────────┘     │ (300 DPI)   │
                                                                 └──────┬──────┘
                                                                        │
┌─────────────┐     ┌──────────────┐     ┌────────────────┐            │
│  Download   │◀────│ Strip PDF    │◀────│ Add invisible  │◀───────────┘
│  new PDF    │     │ metadata     │     │ text layer     │     Draw black
└─────────────┘     └──────────────┘     │ (from extract) │     rectangles
                                         └────────────────┘     over PII
```

1. **Load**: PDF is loaded using Mozilla's `pdf.js` library
2. **Extract**: Text content is extracted with exact pixel positions
3. **Detect**: PII detector scans concatenated line text for sensitive data
4. **Render**: Each page is rendered to a Canvas at the target DPI (default 300)
5. **Redact**: Opaque rectangles are drawn over PII regions — pixel data is permanently destroyed
6. **Text Layer**: An invisible text layer is added using the pre-extracted text (minus PII) for searchability
7. **Metadata**: Author, title, subject, keywords are stripped from the output
8. **Save**: New PDF is created with `pdf-lib` and downloaded

### DOCX Processing

1. **Unzip**: `.docx` is a ZIP archive — opened with `JSZip`
2. **Parse XML**: `word/document.xml`, headers, and footers are parsed with `DOMParser`
3. **Walk Text Nodes**: All `<w:t>` elements are scanned, with runs concatenated per paragraph
4. **Detect & Replace**: PII is detected in concatenated text and replaced in-place
5. **Strip Properties**: `docProps/core.xml` and `docProps/app.xml` metadata cleared
6. **Re-zip**: Modified XML is re-packaged as a valid `.docx`

### XLSX Processing

1. **Read**: Workbook is loaded with `SheetJS`
2. **Iterate**: Every cell in every sheet is scanned
3. **Detect & Replace**: String cells containing PII are redacted
4. **Strip Metadata**: Workbook properties (author, company, etc.) cleared
5. **Write**: Modified workbook is exported in the original format

---

## PII Detection

### Detection Categories

| Category | Examples | Method |
|----------|----------|--------|
| **Person Names** 🇮🇹 | Mario Rossi, COSTA Pier Luigi | Dictionary (600+ first names, 400+ surnames) |
| **Addresses** 🇮🇹 | Via Roma 15, Piazza Garibaldi 3 | Regex pattern (Italian street prefixes) |
| **Email Addresses** | user@example.com | Regex |
| **Phone Numbers** | +39 333 1234567, (555) 123-4567 | Regex (international formats) |
| **Codice Fiscale** 🇮🇹 | RSSMRA85T10A562S | Regex (16-char alphanumeric) |
| **IBAN** | IT60X0542811101000000123456 | Regex (international format) |
| **Credit Cards** | 4111-1111-1111-1111 | Regex + Luhn validation |
| **SSN (US)** | 123-45-6789 | Regex + range validation |
| **Dates** | 10/03/1985, January 15 1990, 5 gennaio 1980 | Regex (EN + IT formats) |
| **IP Addresses** | 192.168.1.100 | Regex (IPv4) |
| **URLs** | https://example.com?user=john | Regex |
| **Postal Codes** | 00100, 90210 | Regex (IT CAP + US ZIP) |
| **Custom Words** | (user-defined) | Exact match |

### Name Detection Strategy

AnonShield uses a **dictionary-based approach** for name detection — no LLM or API calls needed:

1. **Dictionary Matching**: Every capitalized word in the document is checked against a built-in dictionary of 1,000+ common Italian names and surnames
2. **Grouping**: Adjacent dictionary matches are grouped into full names (e.g., "COSTA Pier Luigi" → single detection)
3. **Connectors**: Italian name connectors (`di`, `de`, `e`, `la`, `del`, `della`) are handled correctly
4. **False Positive Reduction**: Common Italian words that coincidentally match names (e.g., "via", "che", "con") are excluded via a skip-list

### Address Detection Strategy

Italian addresses follow predictable patterns and are detected via regex:

- **Prefixes recognized**: Via, Viale, Piazza, Piazzale, Piazzetta, Corso, Largo, Vicolo, Lungomare, Lungotevere, Strada, Contrada, Borgata, Borgo, Località, Frazione, Traversa, Salita, Galleria, and their abbreviations
- **Structure**: Prefix + street name + optional house number
- **Example**: `"VIA A. DE GASPERI, 20"` → detected and redacted

---

## Configuration

### Settings Panel

| Setting | Options | Default |
|---------|---------|---------|
| **Redaction Style** | Black Bars, [REDACTED], Custom Text, Remove | Black Bars |
| **PII Categories** | 12 toggleable categories | All enabled |
| **Custom Words** | Freeform text, one per line | Empty |
| **PDF DPI** | 150, 200, 300 | 300 |

### Custom Word List

Add specific names, company names, project codes, or any text you want to always redact:

```
Mario Rossi
Acme Corporation
Project Phoenix
Internal Reference 2024
```

Words are matched case-insensitively with word boundary detection.

---

## Technology Stack

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| [pdf.js](https://mozilla.github.io/pdf.js/) | 3.11.174 | PDF rendering & text extraction | Apache 2.0 |
| [pdf-lib](https://pdf-lib.js.org/) | 1.17.1 | PDF creation from images + text | MIT |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | DOCX archive manipulation | MIT |
| [SheetJS](https://sheetjs.com/) | 0.18.5 | Excel file processing | Apache 2.0 |
| [FileSaver.js](https://github.com/nicyjohnson/FileSaver.js) | 2.0.5 | Cross-browser file downloads | MIT |

All libraries are loaded via CDN. No npm, no build tools, no server-side runtime.

---

## Project Structure

```
anonshield/
├── index.html              # Main application shell
├── index.css               # Design system & styles (dark glassmorphism)
├── README.md               # This file
├── js/
│   ├── pii-detector.js     # PII detection engine (regex + Italian name dictionary)
│   ├── pdf-processor.js    # PDF rasterization & text layer reconstruction
│   ├── docx-processor.js   # Word document XML manipulation
│   ├── xlsx-processor.js   # Excel cell-by-cell processing
│   ├── txt-processor.js    # Plain text / CSV processing
│   └── app.js              # Main application logic & UI management
```

---

## Security

### What AnonShield Does

- ✅ **Processes files entirely in the browser** — zero network requests
- ✅ **Permanently destroys PDF text data** via rasterization — redacted content becomes pixels
- ✅ **Strips document metadata** (author, title, company, keywords, creation dates)
- ✅ **Uses proven redaction techniques** — opaque pixel overwrite, not visual overlay

### What AnonShield Does NOT Do

- ❌ Does not send data to any server or API
- ❌ Does not use cookies, localStorage, or any persistence
- ❌ Does not use LLMs, AI services, or cloud processing
- ❌ Does not guarantee detection of ALL possible PII — regex + dictionary has inherent limits

### Verification

You can verify AnonShield's privacy guarantees:

1. Open **DevTools → Network tab** before processing
2. Process a file — observe **zero outgoing requests**
3. Open the output PDF and try to select/copy redacted areas — the original text is gone
4. Inspect `docProps/core.xml` in the output DOCX — metadata fields are empty

### Limitations

- **Name detection** relies on a dictionary of common Italian names. Uncommon or foreign names may not be detected automatically — use the Custom Words feature for these
- **PDF rasterization** converts text to images. The output PDF will have image-based pages with a reconstructed text layer. Very fine formatting details may be slightly different
- **Address detection** uses Italian-specific patterns. Non-Italian address formats (aside from US) may need custom word entries
- **Date detection** may have false positives with standalone number sequences
- **Postal code detection** may match any 5-digit number

---

## Browser Compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome 90+ | ✅ Full | Recommended |
| Firefox 90+ | ✅ Full | |
| Edge 90+ | ✅ Full | |
| Safari 15+ | ✅ Full | |
| IE 11 | ❌ No | Not supported |

Requires: ES6, Canvas API, Blob API, FileReader API, `backdrop-filter` (for visual effects).

---

## Contributing

Contributions are welcome! Here are some areas where help is needed:

### Priority Additions
- [ ] **More name dictionaries** — German, French, Spanish name databases
- [ ] **Address patterns** — additional European and international formats
- [ ] **Image-based PII** — detect text in embedded images (would need Tesseract.js)
- [ ] **PowerPoint support** — `.pptx` file processing
- [ ] **Batch ZIP download** — download all processed files as a single ZIP

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/french-names`)
3. Make your changes
4. Test with sample files containing the new PII patterns
5. Submit a Pull Request

### Code Style
- Vanilla JavaScript (ES6+), no frameworks
- IIFE module pattern with `Anonymizer` global namespace
- Comment complex regex patterns
- Use descriptive variable names

---

## License

MIT License — free for personal and commercial use.

---

<p align="center">
  <strong>🛡️ Your data stays on your machine. Always.</strong>
</p>
