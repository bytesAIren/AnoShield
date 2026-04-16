/* ═══════════════════════════════════════════════════════════════════════════
   PDF Processor — PDF anonymization via rasterization + text layer
   
   Strategy:
   1. Extract text with positions using pdf.js
   2. Render each page to canvas at target DPI
   3. Draw redaction rectangles over PII regions on the canvas
   4. Create a new PDF with pdf-lib using redacted images
   5. Add invisible text layer from pre-extracted text (minus PII)
   6. Strip all metadata
   ═══════════════════════════════════════════════════════════════════════════ */

window.Anonymizer = window.Anonymizer || {};

(function () {
    'use strict';

    // Configure pdf.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    class PDFProcessor {
        constructor() {
            this.targetDPI = 300;
        }

        /**
         * Process a PDF file
         * @param {File} file
         * @param {PIIDetector} detector
         * @param {object} redactionOptions - { style, customText }
         * @param {function} onProgress - (percent, message)
         * @param {number} dpi - Target DPI for rasterization
         * @returns {Promise<{blob: Blob, detections: Array, summary: object}>}
         */
        async process(file, detector, redactionOptions, onProgress, dpi) {
            this.targetDPI = dpi || 300;
            const scale = this.targetDPI / 72; // PDF points are 72 DPI

            onProgress(2, 'Loading PDF…');
            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdfDoc.numPages;

            onProgress(5, `PDF loaded — ${numPages} page(s)`);

            // Create new PDF document
            const newPdf = await PDFDocument.create();
            const helvetica = await newPdf.embedFont(StandardFonts.Helvetica);

            let allDetections = [];

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const pagePercent = 5 + ((pageNum - 1) / numPages) * 88;
                onProgress(pagePercent, `Processing page ${pageNum} of ${numPages}…`);

                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale });

                // ── Step 1: Extract text with positions ──
                const textContent = await page.getTextContent();
                const textItems = textContent.items.filter(item => item.str && item.str.length > 0);

                // ── Step 2: Group text items into lines and detect PII ──
                const lines = this._groupIntoLines(textItems);
                const piiRegions = []; // { canvasRect, pdfRect, detection }

                for (const line of lines) {
                    // Build concatenated text for this line
                    let fullText = '';
                    const itemMap = []; // maps character positions back to items

                    for (const item of line.items) {
                        const startPos = fullText.length;
                        fullText += item.str;
                        itemMap.push({
                            item,
                            start: startPos,
                            end: startPos + item.str.length
                        });
                    }

                    // Detect PII in the line
                    const detections = detector.detect(fullText);
                    if (detections.length === 0) continue;

                    allDetections.push(...detections);

                    // Map each detection to text item bounding boxes
                    for (const det of detections) {
                        const overlapping = itemMap.filter(
                            m => m.start < det.end && m.end > det.start
                        );

                        for (const mapped of overlapping) {
                            const item = mapped.item;
                            const tx = item.transform[4];
                            const ty = item.transform[5];
                            const fontSize = Math.sqrt(
                                item.transform[0] ** 2 + item.transform[1] ** 2
                            );
                            const itemWidth = item.width;

                            // Calculate partial coverage if detection doesn't cover full item
                            let xOffset = 0;
                            let coverWidth = itemWidth;

                            if (det.start > mapped.start && item.str.length > 0) {
                                const charsBefore = det.start - mapped.start;
                                xOffset = (charsBefore / item.str.length) * itemWidth;
                                coverWidth -= xOffset;
                            }
                            if (det.end < mapped.end && item.str.length > 0) {
                                const charsAfter = mapped.end - det.end;
                                coverWidth -= (charsAfter / item.str.length) * itemWidth;
                            }

                            // PDF coordinates (origin bottom-left)
                            const pdfRect = {
                                x: tx + xOffset,
                                y: ty - fontSize * 0.15, // slight descent
                                width: coverWidth,
                                height: fontSize * 1.25
                            };

                            // Canvas coordinates (origin top-left, Y flipped)
                            const padding = 2;
                            const canvasRect = {
                                x: pdfRect.x * scale - padding,
                                y: viewport.height - (pdfRect.y + pdfRect.height) * scale - padding,
                                width: pdfRect.width * scale + padding * 2,
                                height: pdfRect.height * scale + padding * 2
                            };

                            piiRegions.push({ canvasRect, pdfRect, detection: det });
                        }
                    }
                }

                // ── Step 3: Render page to canvas ──
                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                const ctx = canvas.getContext('2d');

                await page.render({ canvasContext: ctx, viewport }).promise;

                // ── Step 4: Draw redaction over PII regions on canvas ──
                for (const region of piiRegions) {
                    const r = region.canvasRect;

                    if (redactionOptions.style === 'blackbar') {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(r.x, r.y, r.width, r.height);
                    } else if (redactionOptions.style === 'remove') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(r.x, r.y, r.width, r.height);
                    } else if (redactionOptions.style === 'redacted') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(r.x, r.y, r.width, r.height);
                        ctx.fillStyle = '#CC0000';
                        ctx.font = `bold ${Math.max(10, r.height * 0.6)}px Inter, Arial, sans-serif`;
                        ctx.textBaseline = 'middle';
                        ctx.fillText('[REDACTED]', r.x + 2, r.y + r.height / 2);
                    } else if (redactionOptions.style === 'custom') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(r.x, r.y, r.width, r.height);
                        ctx.fillStyle = '#666666';
                        ctx.font = `${Math.max(10, r.height * 0.6)}px Inter, Arial, sans-serif`;
                        ctx.textBaseline = 'middle';
                        ctx.fillText(redactionOptions.customText || '***', r.x + 2, r.y + r.height / 2);
                    }
                }

                // ── Step 5: Convert canvas to image and add to new PDF ──
                const pageWidthPt = viewport.width / scale;
                const pageHeightPt = viewport.height / scale;

                // Use JPEG for better compression at high DPI
                const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                const imgBytes = this._dataUrlToBytes(imgDataUrl);
                const embeddedImg = await newPdf.embedJpg(imgBytes);

                const newPage = newPdf.addPage([pageWidthPt, pageHeightPt]);
                newPage.drawImage(embeddedImg, {
                    x: 0,
                    y: 0,
                    width: pageWidthPt,
                    height: pageHeightPt
                });

                // ── Step 6: Add invisible text layer for searchability ──
                this._addTextLayer(newPage, textItems, piiRegions, helvetica, redactionOptions);

                // Clean up
                canvas.width = 0;
                canvas.height = 0;
            }

            onProgress(93, 'Stripping PDF metadata…');
            this._stripMetadata(newPdf);

            onProgress(96, 'Saving PDF…');
            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            onProgress(100, 'Done');

            return {
                blob,
                detections: allDetections,
                summary: detector.getSummary(allDetections)
            };
        }

        /**
         * Quick scan for PII count
         */
        async scan(file, detector) {
            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let allText = '';

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                for (const item of textContent.items) {
                    if (item.str) allText += item.str + ' ';
                }
            }

            const detections = detector.detect(allText);
            return {
                count: detections.length,
                summary: detector.getSummary(detections)
            };
        }

        /**
         * Group text items into lines based on Y-coordinate proximity
         */
        _groupIntoLines(items) {
            if (items.length === 0) return [];

            // Sort by Y (descending — top of page first) then X
            const sorted = [...items].sort((a, b) => {
                const yDiff = b.transform[5] - a.transform[5];
                if (Math.abs(yDiff) > 3) return yDiff;
                return a.transform[4] - b.transform[4];
            });

            const lines = [];
            let currentLine = { y: sorted[0].transform[5], items: [sorted[0]] };

            for (let i = 1; i < sorted.length; i++) {
                const item = sorted[i];
                const y = item.transform[5];

                // If Y is close to current line's Y, add to same line
                if (Math.abs(y - currentLine.y) < 5) {
                    currentLine.items.push(item);
                } else {
                    // Sort current line's items by X position
                    currentLine.items.sort((a, b) => a.transform[4] - b.transform[4]);
                    lines.push(currentLine);
                    currentLine = { y, items: [item] };
                }
            }

            // Don't forget the last line
            currentLine.items.sort((a, b) => a.transform[4] - b.transform[4]);
            lines.push(currentLine);

            return lines;
        }

        /**
         * Add invisible text layer to a pdf-lib page for searchability
         * Skips text items that overlap with PII, replaces with redaction marker
         */
        _addTextLayer(page, textItems, piiRegions, font, redactionOptions) {
            // Build a set of PII rectangles in PDF coordinates for quick lookup
            const piiPdfRects = piiRegions.map(r => r.pdfRect);

            for (const item of textItems) {
                if (!item.str || item.str.trim().length === 0) continue;

                const tx = item.transform[4];
                const ty = item.transform[5];
                const fontSize = Math.sqrt(
                    item.transform[0] ** 2 + item.transform[1] ** 2
                );

                // Check if this item overlaps any PII region
                const isPii = piiPdfRects.some(rect => {
                    return tx < (rect.x + rect.width) &&
                           (tx + item.width) > rect.x &&
                           ty < (rect.y + rect.height) &&
                           (ty + fontSize) > rect.y;
                });

                try {
                    const textToDraw = isPii
                        ? (redactionOptions.style === 'redacted' ? '[REDACTED]' : '')
                        : item.str;

                    if (textToDraw.length === 0) continue;

                    // Clamp font size to reasonable range
                    const clampedSize = Math.max(4, Math.min(72, fontSize));

                    page.drawText(textToDraw, {
                        x: tx,
                        y: ty,
                        size: clampedSize,
                        font: font,
                        color: rgb(0, 0, 0),
                        opacity: 0.001 // Nearly invisible but selectable
                    });
                } catch (e) {
                    // Skip items that cause encoding issues (special characters)
                    continue;
                }
            }
        }

        /**
         * Strip all metadata from the new PDF
         */
        _stripMetadata(pdfDoc) {
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('AnonShield');
            pdfDoc.setCreator('AnonShield');
        }

        /**
         * Convert data URL to Uint8Array
         */
        _dataUrlToBytes(dataUrl) {
            const base64 = dataUrl.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }

        /**
         * Read file as ArrayBuffer
         */
        _readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(file);
            });
        }
    }

    Anonymizer.PDFProcessor = PDFProcessor;
})();
