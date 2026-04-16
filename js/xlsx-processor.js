/* ═══════════════════════════════════════════════════════════════════════════
   XLSX Processor — Excel spreadsheet anonymization via SheetJS
   Iterates all sheets and cells, detects and replaces PII
   ═══════════════════════════════════════════════════════════════════════════ */

window.Anonymizer = window.Anonymizer || {};

(function () {
    'use strict';

    class XLSXProcessor {
        /**
         * Process an Excel file (.xlsx / .xls)
         * @param {File} file - The Excel file
         * @param {PIIDetector} detector - PII detector instance
         * @param {object} redactionOptions - { style, customText }
         * @param {function} onProgress - Progress callback(percent, message)
         * @returns {Promise<{blob: Blob, detections: Array, summary: object}>}
         */
        async process(file, detector, redactionOptions, onProgress) {
            onProgress(5, 'Reading Excel file…');

            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });

            onProgress(15, 'Scanning sheets…');

            const sheetNames = workbook.SheetNames;
            let totalDetections = [];

            for (let s = 0; s < sheetNames.length; s++) {
                const sheetName = sheetNames[s];
                const sheet = workbook.Sheets[sheetName];

                onProgress(
                    15 + (s / sheetNames.length) * 70,
                    `Processing sheet: ${sheetName}…`
                );

                const detections = this._processSheet(sheet, detector, redactionOptions);
                totalDetections = totalDetections.concat(detections);
            }

            onProgress(85, 'Stripping workbook metadata…');
            this._stripMetadata(workbook);

            onProgress(92, 'Generating output file…');

            // Write workbook to binary output
            const wopts = {
                bookType: file.name.endsWith('.xls') ? 'xls' : 'xlsx',
                type: 'array'
            };
            const wbout = XLSX.write(workbook, wopts);

            const mimeType = file.name.endsWith('.xls')
                ? 'application/vnd.ms-excel'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const blob = new Blob([wbout], { type: mimeType });

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
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const text = this._extractAllText(workbook);
            const detections = detector.detect(text);
            return {
                count: detections.length,
                summary: detector.getSummary(detections)
            };
        }

        /**
         * Process a single sheet — iterate all cells and redact PII
         */
        _processSheet(sheet, detector, options) {
            const detections = [];
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

            for (let row = range.s.r; row <= range.e.r; row++) {
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = sheet[cellAddr];

                    if (!cell) continue;

                    // Only process string and number cells that look like text
                    let cellText = '';
                    if (cell.t === 's') {
                        // String cell
                        cellText = cell.v || '';
                    } else if (cell.t === 'n' && cell.w) {
                        // Number cell with formatted value — check the formatted string
                        cellText = cell.w;
                    } else {
                        continue;
                    }

                    if (!cellText || typeof cellText !== 'string' || cellText.trim() === '') {
                        continue;
                    }

                    const { redactedText, detections: cellDetections } = detector.redactText(
                        cellText, options
                    );

                    if (cellDetections.length > 0) {
                        // Update cell value
                        cell.v = redactedText;
                        cell.t = 's'; // Force as string type
                        // Clear any cached formatted value
                        delete cell.w;
                        delete cell.h;

                        // Tag detections with cell address and sheet info
                        for (const det of cellDetections) {
                            det.location = cellAddr;
                        }
                        detections.push(...cellDetections);
                    }
                }
            }

            return detections;
        }

        /**
         * Strip workbook-level metadata
         */
        _stripMetadata(workbook) {
            if (workbook.Props) {
                const propsToStrip = [
                    'Title', 'Subject', 'Author', 'Manager', 'Company',
                    'Category', 'Keywords', 'Comments', 'LastAuthor',
                    'Creator', 'LastModifiedBy'
                ];
                for (const prop of propsToStrip) {
                    if (workbook.Props[prop] !== undefined) {
                        workbook.Props[prop] = '';
                    }
                }
            }

            // Also strip custom properties
            if (workbook.Custprops) {
                workbook.Custprops = {};
            }
        }

        /**
         * Extract all text from all sheets for scanning
         */
        _extractAllText(workbook) {
            let allText = '';

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

                for (let row = range.s.r; row <= range.e.r; row++) {
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
                        const cell = sheet[cellAddr];
                        if (cell && cell.v) {
                            allText += String(cell.v) + ' ';
                        }
                    }
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

    Anonymizer.XLSXProcessor = XLSXProcessor;
})();
