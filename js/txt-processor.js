/* ═══════════════════════════════════════════════════════════════════════════
   TXT Processor — Plain text and CSV file anonymization
   ═══════════════════════════════════════════════════════════════════════════ */

window.Anonymizer = window.Anonymizer || {};

(function () {
    'use strict';

    class TXTProcessor {
        /**
         * Process a plain text or CSV file
         * @param {File} file - The file to process
         * @param {PIIDetector} detector - PII detector instance
         * @param {object} redactionOptions - { style, customText }
         * @param {function} onProgress - Progress callback(percent, message)
         * @returns {Promise<{blob: Blob, detections: Array, summary: object}>}
         */
        async process(file, detector, redactionOptions, onProgress) {
            onProgress(10, 'Reading file…');

            const text = await this._readFile(file);
            
            onProgress(30, 'Scanning for PII…');
            const { redactedText, detections } = detector.redactText(text, redactionOptions);

            onProgress(80, 'Generating output…');
            const mimeType = file.name.endsWith('.csv') ? 'text/csv' : 'text/plain';
            const blob = new Blob([redactedText], { type: mimeType + ';charset=utf-8' });

            onProgress(100, 'Done');
            return {
                blob,
                detections,
                summary: detector.getSummary(detections)
            };
        }

        /**
         * Quick scan to count PII without processing
         */
        async scan(file, detector) {
            const text = await this._readFile(file);
            const detections = detector.detect(text);
            return {
                count: detections.length,
                summary: detector.getSummary(detections)
            };
        }

        /**
         * Read file as UTF-8 text
         */
        _readFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file, 'UTF-8');
            });
        }
    }

    Anonymizer.TXTProcessor = TXTProcessor;
})();
