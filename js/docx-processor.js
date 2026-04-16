/* ═══════════════════════════════════════════════════════════════════════════
   DOCX Processor — Word document anonymization via XML manipulation
   Preserves formatting while redacting PII from all text content
   ═══════════════════════════════════════════════════════════════════════════ */

window.Anonymizer = window.Anonymizer || {};

(function () {
    'use strict';

    class DOCXProcessor {
        /**
         * Process a .docx file
         * @param {File} file - The .docx file
         * @param {PIIDetector} detector - PII detector instance
         * @param {object} redactionOptions - { style, customText }
         * @param {function} onProgress - Progress callback(percent, message)
         * @returns {Promise<{blob: Blob, detections: Array, summary: object}>}
         */
        async process(file, detector, redactionOptions, onProgress) {
            onProgress(5, 'Reading DOCX archive…');

            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            const zip = await JSZip.loadAsync(arrayBuffer);

            onProgress(15, 'Extracting document content…');

            // Gather all XML files that might contain text
            const xmlFiles = [
                'word/document.xml',
                'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
                'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
                'word/footnotes.xml',
                'word/endnotes.xml',
                'word/comments.xml'
            ];

            let totalDetections = [];
            let processed = 0;

            for (const xmlPath of xmlFiles) {
                const zipEntry = zip.file(xmlPath);
                if (!zipEntry) continue;

                onProgress(
                    15 + (processed / xmlFiles.length) * 60,
                    `Processing ${xmlPath.split('/').pop()}…`
                );

                const xmlString = await zipEntry.async('string');
                const { modifiedXml, detections } = this._processXml(
                    xmlString, detector, redactionOptions
                );
                totalDetections = totalDetections.concat(detections);

                // Update the file in the zip
                zip.file(xmlPath, modifiedXml);
                processed++;
            }

            onProgress(80, 'Stripping document metadata…');
            await this._stripMetadata(zip);

            onProgress(90, 'Rebuilding DOCX archive…');
            const blob = await zip.generateAsync({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            onProgress(100, 'Done');

            return {
                blob,
                detections: totalDetections,
                summary: detector.getSummary(totalDetections)
            };
        }

        /**
         * Quick scan to count PII
         */
        async scan(file, detector) {
            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            const zip = await JSZip.loadAsync(arrayBuffer);
            const text = await this._extractAllText(zip);
            const detections = detector.detect(text);
            return {
                count: detections.length,
                summary: detector.getSummary(detections)
            };
        }

        /**
         * Process an XML string: find text nodes, detect PII, redact
         */
        _processXml(xmlString, detector, redactionOptions) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
            const detections = [];

            // Get all <w:p> (paragraph) elements
            const paragraphs = xmlDoc.getElementsByTagName('w:p');

            for (let i = 0; i < paragraphs.length; i++) {
                const para = paragraphs[i];
                const result = this._processOoxmlParagraph(para, detector, redactionOptions);
                detections.push(...result);
            }

            // Serialize back to string
            const serializer = new XMLSerializer();
            const modifiedXml = serializer.serializeToString(xmlDoc);

            return { modifiedXml, detections };
        }

        /**
         * Process a single <w:p> paragraph element
         * Handles text split across multiple <w:r>/<w:t> runs
         */
        _processOoxmlParagraph(paraNode, detector, options) {
            // Collect all <w:t> text nodes in order
            const textNodes = paraNode.getElementsByTagName('w:t');
            if (textNodes.length === 0) return [];

            // Build concatenated text with mapping to nodes
            const segments = [];
            let fullText = '';

            for (let i = 0; i < textNodes.length; i++) {
                const node = textNodes[i];
                const text = node.textContent || '';
                segments.push({
                    node,
                    start: fullText.length,
                    end: fullText.length + text.length,
                    originalText: text
                });
                fullText += text;
            }

            if (fullText.trim().length === 0) return [];

            // Detect PII in the concatenated paragraph text
            const piiDetections = detector.detect(fullText);
            if (piiDetections.length === 0) return [];

            // Apply redactions to each text node
            for (const seg of segments) {
                let newText = seg.originalText;
                // Find all detections that overlap with this segment
                const overlapping = piiDetections.filter(
                    d => d.start < seg.end && d.end > seg.start
                );

                if (overlapping.length === 0) continue;

                // Process overlapping detections (from end to start to preserve indices)
                const localDetections = overlapping.map(d => ({
                    localStart: Math.max(0, d.start - seg.start),
                    localEnd: Math.min(seg.originalText.length, d.end - seg.start),
                    detection: d
                })).sort((a, b) => b.localStart - a.localStart);

                for (const ld of localDetections) {
                    const beforePart = newText.substring(0, ld.localStart);
                    const afterPart = newText.substring(ld.localEnd);
                    let replacement;

                    switch (options.style) {
                        case 'blackbar':
                            replacement = '█'.repeat(ld.localEnd - ld.localStart);
                            break;
                        case 'redacted':
                            replacement = '[REDACTED]';
                            break;
                        case 'custom':
                            replacement = options.customText || '***';
                            break;
                        case 'remove':
                            replacement = '';
                            break;
                        default:
                            replacement = '█'.repeat(ld.localEnd - ld.localStart);
                    }

                    newText = beforePart + replacement + afterPart;
                }

                seg.node.textContent = newText;
                // Preserve xml:space="preserve" attribute
                seg.node.setAttribute('xml:space', 'preserve');
            }

            return piiDetections;
        }

        /**
         * Strip document metadata/properties
         */
        async _stripMetadata(zip) {
            // Core properties (author, title, subject, etc.)
            const coreProps = zip.file('docProps/core.xml');
            if (coreProps) {
                const xml = await coreProps.async('string');
                const parser = new DOMParser();
                const doc = parser.parseFromString(xml, 'application/xml');

                // Clear specific metadata fields
                const fieldsToStrip = [
                    'dc:creator', 'dc:title', 'dc:subject', 'dc:description',
                    'cp:lastModifiedBy', 'cp:keywords', 'cp:category'
                ];

                for (const field of fieldsToStrip) {
                    const elements = doc.getElementsByTagName(field);
                    for (let i = 0; i < elements.length; i++) {
                        elements[i].textContent = '';
                    }
                }

                const serializer = new XMLSerializer();
                zip.file('docProps/core.xml', serializer.serializeToString(doc));
            }

            // App properties (application name, company, etc.)
            const appProps = zip.file('docProps/app.xml');
            if (appProps) {
                const xml = await appProps.async('string');
                const parser = new DOMParser();
                const doc = parser.parseFromString(xml, 'application/xml');

                const fieldsToStrip = ['Company', 'Manager', 'Application'];
                for (const field of fieldsToStrip) {
                    const elements = doc.getElementsByTagName(field);
                    for (let i = 0; i < elements.length; i++) {
                        elements[i].textContent = '';
                    }
                }

                const serializer = new XMLSerializer();
                zip.file('docProps/app.xml', serializer.serializeToString(doc));
            }

            // Remove custom properties entirely
            if (zip.file('docProps/custom.xml')) {
                zip.remove('docProps/custom.xml');
            }
        }

        /**
         * Extract all text from the document for scanning
         */
        async _extractAllText(zip) {
            const xmlFiles = [
                'word/document.xml',
                'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
                'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'
            ];

            let allText = '';

            for (const xmlPath of xmlFiles) {
                const entry = zip.file(xmlPath);
                if (!entry) continue;

                const xmlString = await entry.async('string');
                const parser = new DOMParser();
                const doc = parser.parseFromString(xmlString, 'application/xml');
                const textNodes = doc.getElementsByTagName('w:t');

                for (let i = 0; i < textNodes.length; i++) {
                    allText += textNodes[i].textContent + ' ';
                }
            }

            return allText;
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

    Anonymizer.DOCXProcessor = DOCXProcessor;
})();
