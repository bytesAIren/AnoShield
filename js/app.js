/* ═══════════════════════════════════════════════════════════════════════════
   App.js — Main application logic for AnonShield
   Handles file management, UI interactions, settings, and processing queue
   ═══════════════════════════════════════════════════════════════════════════ */

window.Anonymizer = window.Anonymizer || {};

(function () {
    'use strict';

    // ─── State ───
    const state = {
        files: [],         // { id, file, status, piiCount, summary, blob }
        processing: false,
        detector: null,
        processors: {}
    };

    // ─── Processors ───
    const processors = {
        pdf: new Anonymizer.PDFProcessor(),
        docx: new Anonymizer.DOCXProcessor(),
        xlsx: new Anonymizer.XLSXProcessor(),
        txt: new Anonymizer.TXTProcessor()
    };

    // ─── PII Detector ───
    state.detector = new Anonymizer.PIIDetector();

    // ─── DOM Elements ───
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        dropZone: $('#drop-zone'),
        fileInput: $('#file-input'),
        browseBtn: $('#browse-btn'),
        fileQueue: $('#file-queue'),
        fileList: $('#file-list'),
        fileCount: $('#file-count'),
        btnAddMore: $('#btn-add-more'),
        btnClearAll: $('#btn-clear-all'),
        btnProcessAll: $('#btn-process-all'),
        resultsArea: $('#results-area'),
        resultsList: $('#results-list'),
        btnNewSession: $('#btn-new-session'),
        processingOverlay: $('#processing-overlay'),
        processingTitle: $('#processing-title'),
        processingStatus: $('#processing-status'),
        processingDetail: $('#processing-detail'),
        progressBar: $('#progress-bar'),
        settingsPanel: $('#settings-panel'),
        toggleSettings: $('#toggle-settings'),
        redactionStyle: $('#redaction-style'),
        customRedactionText: $('#custom-redaction-text'),
        customWords: $('#custom-words'),
        pdfDpi: $('#pdf-dpi'),
        scanModal: $('#scan-modal'),
        scanResultsBody: $('#scan-results-body')
    };

    // ─── Helpers ───
    let fileIdCounter = 0;

    function generateFileId() {
        return `file-${++fileIdCounter}`;
    }

    function getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    function getFileType(filename) {
        const ext = getFileExtension(filename);
        switch (ext) {
            case 'pdf': return 'pdf';
            case 'docx': return 'docx';
            case 'xlsx': case 'xls': return 'xlsx';
            case 'txt': case 'csv': return 'txt';
            default: return null;
        }
    }

    function getFileIconLabel(filename) {
        const ext = getFileExtension(filename);
        const map = {
            pdf: 'PDF', docx: 'DOC', xlsx: 'XLS', xls: 'XLS',
            txt: 'TXT', csv: 'CSV'
        };
        return map[ext] || ext.toUpperCase();
    }

    function getFileIconClass(filename) {
        const ext = getFileExtension(filename);
        if (ext === 'xls') return 'xlsx';
        if (ext === 'csv') return 'txt';
        return ext;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function getRedactionOptions() {
        const style = dom.redactionStyle.value;
        return {
            style,
            customText: style === 'custom' ? dom.customRedactionText.value : ''
        };
    }

    function getEnabledCategories() {
        const cats = {};
        $$('[data-pii]').forEach(checkbox => {
            cats[checkbox.dataset.pii] = checkbox.checked;
        });
        return cats;
    }

    function getCustomWords() {
        const text = dom.customWords.value.trim();
        if (!text) return [];
        return text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    }

    function updateDetectorConfig() {
        state.detector.configure({
            categories: getEnabledCategories(),
            customWords: getCustomWords()
        });
    }

    // ─── UI Rendering ───

    function renderFileCard(entry) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.id = `card-${entry.id}`;
        card.dataset.fileId = entry.id;

        const iconClass = getFileIconClass(entry.file.name);
        const iconLabel = getFileIconLabel(entry.file.name);

        let piiHtml = '';
        if (entry.status === 'scanning') {
            piiHtml = '<span class="pii-count scanning">Scanning…</span>';
        } else if (entry.status === 'scanned' || entry.status === 'ready') {
            if (entry.piiCount > 0) {
                piiHtml = `<span class="pii-count has-pii">${entry.piiCount} PII found</span>`;
            } else {
                piiHtml = '<span class="pii-count no-pii">Clean</span>';
            }
        } else {
            piiHtml = '<span class="pii-count scanning">Pending</span>';
        }

        card.innerHTML = `
            <div class="file-card-icon ${iconClass}">${iconLabel}</div>
            <div class="file-card-info">
                <div class="file-card-name" title="${entry.file.name}">${entry.file.name}</div>
                <div class="file-card-meta">
                    <span>${formatFileSize(entry.file.size)}</span>
                    <span class="file-card-pii">${piiHtml}</span>
                </div>
            </div>
            <div class="file-card-actions">
                ${entry.piiCount > 0 ? `
                    <button class="icon-btn scan-detail-btn" title="View PII details" data-file-id="${entry.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                    </button>
                ` : ''}
                <button class="file-card-remove" title="Remove file" data-file-id="${entry.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;

        return card;
    }

    function renderFileList() {
        dom.fileList.innerHTML = '';
        for (const entry of state.files) {
            dom.fileList.appendChild(renderFileCard(entry));
        }
        dom.fileCount.textContent = state.files.length;
    }

    function updateFileCard(entry) {
        const existing = $(`#card-${entry.id}`);
        if (!existing) return;
        const newCard = renderFileCard(entry);
        existing.replaceWith(newCard);
    }

    function renderResultCard(entry) {
        const card = document.createElement('div');
        const isSuccess = entry.status === 'done';
        card.className = `result-card ${isSuccess ? 'success' : 'error'}`;

        if (isSuccess) {
            const detCount = entry.detections ? entry.detections.length : 0;
            card.innerHTML = `
                <div class="result-icon success">✓</div>
                <div class="result-info">
                    <div class="result-name">${entry.file.name}</div>
                    <div class="result-detail">${detCount} PII item(s) redacted</div>
                </div>
                <div class="result-actions">
                    <button class="btn btn-success download-btn" data-file-id="${entry.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                    </button>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="result-icon error">✕</div>
                <div class="result-info">
                    <div class="result-name">${entry.file.name}</div>
                    <div class="result-detail">Error: ${entry.error || 'Processing failed'}</div>
                </div>
            `;
        }

        return card;
    }

    // ─── File Management ───

    function addFiles(fileList) {
        const validTypes = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'csv'];

        for (const file of fileList) {
            const ext = getFileExtension(file.name);
            if (!validTypes.includes(ext)) {
                console.warn(`Skipping unsupported file: ${file.name}`);
                continue;
            }

            const entry = {
                id: generateFileId(),
                file,
                status: 'pending',
                piiCount: 0,
                summary: null,
                blob: null,
                detections: null,
                error: null
            };

            state.files.push(entry);
        }

        if (state.files.length > 0) {
            dom.dropZone.classList.add('hidden');
            dom.fileQueue.classList.remove('hidden');
            dom.resultsArea.classList.add('hidden');
            renderFileList();
            scanAllFiles();
        }
    }

    function removeFile(fileId) {
        state.files = state.files.filter(f => f.id !== fileId);
        if (state.files.length === 0) {
            dom.fileQueue.classList.add('hidden');
            dom.dropZone.classList.remove('hidden');
        }
        renderFileList();
    }

    function clearAllFiles() {
        state.files = [];
        dom.fileQueue.classList.add('hidden');
        dom.resultsArea.classList.add('hidden');
        dom.dropZone.classList.remove('hidden');
        dom.fileList.innerHTML = '';
        dom.resultsList.innerHTML = '';
    }

    // ─── Scanning ───

    async function scanAllFiles() {
        updateDetectorConfig();

        for (const entry of state.files) {
            entry.status = 'scanning';
            updateFileCard(entry);

            try {
                const fileType = getFileType(entry.file.name);
                const processor = processors[fileType];
                if (!processor) throw new Error('Unsupported file type');

                const result = await processor.scan(entry.file, state.detector);
                entry.status = 'scanned';
                entry.piiCount = result.count;
                entry.summary = result.summary;
            } catch (e) {
                console.error(`Failed to scan ${entry.file.name}:`, e);
                entry.status = 'scanned';
                entry.piiCount = -1;
            }

            updateFileCard(entry);
        }
    }

    // ─── Processing ───

    async function processAllFiles() {
        if (state.processing) return;
        state.processing = true;

        updateDetectorConfig();

        const options = getRedactionOptions();
        const dpi = parseInt(dom.pdfDpi.value, 10);
        const totalFiles = state.files.length;

        showProcessingOverlay();

        for (let i = 0; i < state.files.length; i++) {
            const entry = state.files[i];
            const fileType = getFileType(entry.file.name);
            const processor = processors[fileType];

            updateProcessingUI(
                `Processing file ${i + 1} of ${totalFiles}`,
                entry.file.name,
                `Starting…`,
                ((i) / totalFiles) * 100
            );

            if (!processor) {
                entry.status = 'error';
                entry.error = 'Unsupported file type';
                continue;
            }

            try {
                const onProgress = (percent, message) => {
                    const overallPercent = ((i + percent / 100) / totalFiles) * 100;
                    updateProcessingUI(
                        `Processing file ${i + 1} of ${totalFiles}`,
                        entry.file.name,
                        message,
                        overallPercent
                    );
                };

                let result;
                if (fileType === 'pdf') {
                    result = await processor.process(entry.file, state.detector, options, onProgress, dpi);
                } else {
                    result = await processor.process(entry.file, state.detector, options, onProgress);
                }

                entry.status = 'done';
                entry.blob = result.blob;
                entry.detections = result.detections;
                entry.summary = result.summary;
            } catch (e) {
                console.error(`Failed to process ${entry.file.name}:`, e);
                entry.status = 'error';
                entry.error = e.message || 'Processing failed';
            }

            // Small delay to keep UI responsive
            await new Promise(r => setTimeout(r, 50));
        }

        hideProcessingOverlay();
        showResults();
        state.processing = false;
    }

    // ─── Processing Overlay ───

    function showProcessingOverlay() {
        dom.processingOverlay.classList.remove('hidden');
    }

    function hideProcessingOverlay() {
        dom.processingOverlay.classList.add('hidden');
    }

    function updateProcessingUI(title, status, detail, percent) {
        dom.processingTitle.textContent = title;
        dom.processingStatus.textContent = status;
        dom.processingDetail.textContent = detail;
        dom.progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    }

    // ─── Results ───

    function showResults() {
        dom.fileQueue.classList.add('hidden');
        dom.resultsArea.classList.remove('hidden');
        dom.resultsList.innerHTML = '';

        for (const entry of state.files) {
            dom.resultsList.appendChild(renderResultCard(entry));
        }
    }

    function downloadFile(fileId) {
        const entry = state.files.find(f => f.id === fileId);
        if (!entry || !entry.blob) return;

        const ext = getFileExtension(entry.file.name);
        const baseName = entry.file.name.replace(/\.[^.]+$/, '');
        const newName = `${baseName}_anonymized.${ext}`;

        saveAs(entry.blob, newName);
    }

    // ─── Scan Detail Modal ───

    function showScanDetail(fileId) {
        const entry = state.files.find(f => f.id === fileId);
        if (!entry || !entry.summary) return;

        const body = dom.scanResultsBody;
        body.innerHTML = `<h4 style="margin-bottom: 12px; color: var(--text-primary);">${entry.file.name}</h4>`;

        if (Object.keys(entry.summary).length === 0) {
            body.innerHTML += '<p style="color: var(--text-muted);">No PII detected.</p>';
        } else {
            for (const [type, info] of Object.entries(entry.summary)) {
                const div = document.createElement('div');
                div.className = 'scan-category';
                div.innerHTML = `
                    <span class="scan-category-name">${info.label}</span>
                    <span class="scan-category-count">${info.count}</span>
                `;
                body.appendChild(div);
            }
        }

        dom.scanModal.classList.remove('hidden');
    }

    function closeScanModal() {
        dom.scanModal.classList.add('hidden');
    }

    // ─── Event Listeners ───

    // Drag and drop
    dom.dropZone.addEventListener('click', (e) => {
        if (e.target === dom.browseBtn || e.target.closest('#browse-btn')) {
            return; // browseBtn handles its own click
        }
        dom.fileInput.click();
    });

    dom.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.fileInput.click();
    });

    dom.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            addFiles(e.target.files);
            e.target.value = ''; // Reset
        }
    });

    // Drag events
    ['dragenter', 'dragover'].forEach(eventName => {
        dom.dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dom.dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dom.dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dom.dropZone.classList.remove('drag-over');
        });
    });

    dom.dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            addFiles(files);
        }
    });

    // Also allow drag-and-drop on the whole body when fileQueue is visible
    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            addFiles(files);
        }
    });

    // File queue actions
    dom.btnAddMore.addEventListener('click', () => {
        dom.fileInput.click();
    });

    dom.btnClearAll.addEventListener('click', clearAllFiles);

    dom.btnProcessAll.addEventListener('click', processAllFiles);

    // Results actions
    dom.btnNewSession.addEventListener('click', clearAllFiles);

    // Download buttons (event delegation)
    dom.resultsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.download-btn');
        if (btn) {
            downloadFile(btn.dataset.fileId);
        }
    });

    // File remove buttons (event delegation)
    dom.fileList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.file-card-remove');
        if (removeBtn) {
            removeFile(removeBtn.dataset.fileId);
        }

        const scanBtn = e.target.closest('.scan-detail-btn');
        if (scanBtn) {
            showScanDetail(scanBtn.dataset.fileId);
        }
    });

    // Settings toggle
    dom.toggleSettings.addEventListener('click', () => {
        dom.settingsPanel.classList.toggle('collapsed');
    });

    // Redaction style custom text toggle
    dom.redactionStyle.addEventListener('change', () => {
        if (dom.redactionStyle.value === 'custom') {
            dom.customRedactionText.classList.remove('hidden');
            dom.customRedactionText.focus();
        } else {
            dom.customRedactionText.classList.add('hidden');
        }
    });

    // Re-scan when settings change
    let rescanTimeout = null;
    function scheduleRescan() {
        if (rescanTimeout) clearTimeout(rescanTimeout);
        rescanTimeout = setTimeout(() => {
            if (state.files.length > 0 && !state.processing) {
                scanAllFiles();
            }
        }, 500);
    }

    $$('[data-pii]').forEach(cb => cb.addEventListener('change', scheduleRescan));
    dom.customWords.addEventListener('input', scheduleRescan);

    // Scan modal close
    $$('[data-close-modal]').forEach(el => {
        el.addEventListener('click', closeScanModal);
    });

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeScanModal();
        }
    });

    // ─── Initialize ───
    console.log(
        '%c🛡️ AnonShield loaded — All processing happens locally in your browser.',
        'color: #22d3ee; font-weight: bold; font-size: 14px;'
    );

})();
