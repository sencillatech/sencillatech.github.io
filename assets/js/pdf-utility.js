/**
 * PDF Utility Script
 * Handles uploading, parsing, splitting, previewing, and downloading PDF files client-side.
 * Libraries used:
 * - pdf-lib.js (PDF document creation, page copying, and rendering bytes)
 * - pdf.js (PDF loading, counting, and page rendering to Canvas)
 * - JSZip (Zipping multiple PDF parts)
 */

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Application State
let fileData = {
    file: null,
    arrayBuffer: null,
    baseName: '',
    totalPages: 0
};

let splitResults = []; // Array of { name, blob, rangeString, pageCount, size }
let previewState = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    blob: null,
    fileName: ''
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const loadingProgressWrapper = document.getElementById('loadingProgressWrapper');
const progressStatusText = document.getElementById('progressStatusText');
const progressPercent = document.getElementById('progressPercent');
const loadingProgressBarFill = document.getElementById('loadingProgressBarFill');
const fileDetails = document.getElementById('fileDetails');
const pdfFileName = document.getElementById('pdfFileName');
const pdfFileMeta = document.getElementById('pdfFileMeta');
const btnRemoveFile = document.getElementById('btnRemoveFile');

const configSection = document.getElementById('configSection');
const numSplitsInput = document.getElementById('numSplitsInput');
const btnResetRanges = document.getElementById('btnResetRanges');
const rangesContainer = document.getElementById('rangesContainer');
const btnAddRangeRow = document.getElementById('btnAddRangeRow');
const validationErrorMsg = document.getElementById('validationErrorMsg');
const validationErrorText = document.getElementById('validationErrorText');
const btnSplitPDF = document.getElementById('btnSplitPDF');

const resultsSection = document.getElementById('resultsSection');
const resultCount = document.getElementById('resultCount');
const resultsList = document.getElementById('resultsList');
const btnDownloadZip = document.getElementById('btnDownloadZip');

// Preview Modal Elements
const previewModal = document.getElementById('previewModal');
const modalTitle = document.getElementById('modalTitle');
const btnModalClose = document.getElementById('btnModalClose');
const previewCanvas = document.getElementById('pdfPreviewCanvas');
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const previewCurrentPage = document.getElementById('previewCurrentPage');
const previewTotalPages = document.getElementById('previewTotalPages');
const btnModalDownload = document.getElementById('btnModalDownload');

// --- EVENT LISTENERS ---

// Drag and Drop Events
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
});

uploadZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
    }
});

btnRemoveFile.addEventListener('click', resetState);

numSplitsInput.addEventListener('change', () => {
    let value = parseInt(numSplitsInput.value);
    if (isNaN(value) || value < 1) {
        numSplitsInput.value = 1;
        value = 1;
    }
    rebuildDefaultRanges(value);
});

btnResetRanges.addEventListener('click', () => {
    let value = parseInt(numSplitsInput.value);
    rebuildDefaultRanges(value);
});

btnAddRangeRow.addEventListener('click', addRangeRow);

btnSplitPDF.addEventListener('click', processPdfSplits);

btnDownloadZip.addEventListener('click', downloadAllAsZip);

// Modal Events
btnModalClose.addEventListener('click', closePreviewModal);
window.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        closePreviewModal();
    }
});

btnPrevPage.addEventListener('click', () => {
    if (previewState.currentPage > 1) {
        previewState.currentPage--;
        renderPreviewPage(previewState.currentPage);
    }
});

btnNextPage.addEventListener('click', () => {
    if (previewState.currentPage < previewState.totalPages) {
        previewState.currentPage++;
        renderPreviewPage(previewState.currentPage);
    }
});

btnModalDownload.addEventListener('click', () => {
    if (previewState.blob && previewState.fileName) {
        downloadBlob(previewState.blob, previewState.fileName);
    }
});

// --- CORE LOGIC ---

/**
 * Handle Selected File
 */
function handleFileSelection(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
    }

    // Limit Suggestion check
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 50) {
        const proceed = confirm(`This file is ${sizeInMB.toFixed(1)}MB, which exceeds the suggested 50MB limit. Client-side processing might cause memory lag or browser crashes on large files. Do you want to proceed?`);
        if (!proceed) return;
    }

    // Clear previous state
    resetState();

    fileData.file = file;
    // Extract base name without extension
    fileData.baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    // Show Progress Bar
    uploadZone.style.display = 'none';
    loadingProgressWrapper.style.display = 'block';
    updateProgress(0, 'Reading PDF file...');

    const reader = new FileReader();
    
    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateProgress(percent, `Loading file: ${percent}%`);
        }
    };

    reader.onload = async (e) => {
        fileData.arrayBuffer = e.target.result;
        updateProgress(90, 'Parsing PDF pages...');

        try {
            // Parse pages using PDF.js (pass a sliced copy to prevent detaching the buffer)
            const loadingTask = pdfjsLib.getDocument({ data: fileData.arrayBuffer.slice(0) });
            const pdfDoc = await loadingTask.promise;
            fileData.totalPages = pdfDoc.numPages;

            // Update UI with file details
            pdfFileName.textContent = file.name;
            pdfFileMeta.textContent = `Size: ${formatBytes(file.size)} | Total Pages: ${fileData.totalPages}`;
            
            loadingProgressWrapper.style.display = 'none';
            fileDetails.style.display = 'flex';

            // Show and build config section
            configSection.style.display = 'block';
            let initialSplits = Math.min(2, fileData.totalPages);
            numSplitsInput.value = initialSplits;
            rebuildDefaultRanges(initialSplits);

        } catch (err) {
            console.error('Error loading PDF:', err);
            alert('Failed to parse PDF file. It might be password-protected or corrupted.');
            resetState();
        }
    };

    reader.onerror = () => {
        alert('Error reading file.');
        resetState();
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Update UI Progress Bar
 */
function updateProgress(percent, statusText) {
    progressStatusText.textContent = statusText;
    progressPercent.textContent = `${percent}%`;
    loadingProgressBarFill.style.width = `${percent}%`;
}

/**
 * Reset App State
 */
function resetState() {
    fileData = {
        file: null,
        arrayBuffer: null,
        baseName: '',
        totalPages: 0
    };
    splitResults = [];
    
    fileInput.value = '';
    uploadZone.style.display = 'block';
    loadingProgressWrapper.style.display = 'none';
    fileDetails.style.display = 'none';
    configSection.style.display = 'none';
    resultsSection.style.display = 'none';
    validationErrorMsg.style.display = 'none';
    rangesContainer.innerHTML = '';
}

/**
 * Generate Equal Pages Ranges
 */
function rebuildDefaultRanges(numParts) {
    rangesContainer.innerHTML = '';
    const total = fileData.totalPages;
    if (total === 0) return;

    // Sanity limit check
    if (numParts > total) {
        numParts = total;
        numSplitsInput.value = total;
    }

    const pagesPerPart = Math.floor(total / numParts);
    let extraPages = total % numParts;

    let currentStart = 1;

    for (let i = 0; i < numParts; i++) {
        let currentEnd = currentStart + pagesPerPart - 1;
        if (extraPages > 0) {
            currentEnd++;
            extraPages--;
        }

        // Just in case end exceeds total
        if (currentEnd > total) currentEnd = total;

        const rowHtml = createRangeRowHTML(i + 1, `${fileData.baseName}_part_${i + 1}`, currentStart, currentEnd);
        rangesContainer.insertAdjacentHTML('beforeend', rowHtml);
        
        currentStart = currentEnd + 1;
    }

    addRangeInputListeners();
    validateRanges();
}

/**
 * Add a Single Blank/Default Range Row
 */
function addRangeRow() {
    const rows = rangesContainer.querySelectorAll('.pdf-range-row');
    const index = rows.length + 1;
    
    // Default range values: set next page to total pages, or 1 to total pages
    let startPage = 1;
    let endPage = fileData.totalPages;

    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const lastEndInput = lastRow.querySelector('.end-page-input');
        const lastEndValue = parseInt(lastEndInput.value);
        if (!isNaN(lastEndValue) && lastEndValue < fileData.totalPages) {
            startPage = lastEndValue + 1;
            endPage = fileData.totalPages;
        }
    }

    const rowHtml = createRangeRowHTML(index, `${fileData.baseName}_part_${index}`, startPage, endPage);
    rangesContainer.insertAdjacentHTML('beforeend', rowHtml);
    
    // Update number input field count
    numSplitsInput.value = index;

    addRangeInputListeners();
    validateRanges();
}

/**
 * Template HTML for Range Row
 */
function createRangeRowHTML(num, defaultName, start, end) {
    return `
    <div class="pdf-range-row" data-row="${num}">
        <div class="pdf-range-num">Part ${num}</div>
        <div>
            <label for="fileName_${num}">Filename</label>
            <input type="text" id="fileName_${num}" class="filename-input" value="${defaultName}" placeholder="e.g. part_${num}">
        </div>
        <div>
            <label for="startPage_${num}">From Page</label>
            <input type="number" id="startPage_${num}" class="start-page-input" value="${start}" min="1" max="${fileData.totalPages}">
        </div>
        <div>
            <label for="endPage_${num}">To Page</label>
            <input type="number" id="endPage_${num}" class="end-page-input" value="${end}" min="1" max="${fileData.totalPages}">
        </div>
        <div>
            <button class="pdf-range-delete" title="Delete Part" aria-label="Delete part row">
                <i class="bx bx-trash"></i>
            </button>
        </div>
    </div>
    `;
}

/**
 * Set Listeners on Dynamically Added Inputs
 */
function addRangeInputListeners() {
    const rows = rangesContainer.querySelectorAll('.pdf-range-row');
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.removeEventListener('input', validateRanges);
            input.addEventListener('input', validateRanges);
        });

        const btnDelete = row.querySelector('.pdf-range-delete');
        btnDelete.removeEventListener('click', handleDeleteRow);
        btnDelete.addEventListener('click', handleDeleteRow);
    });
}

/**
 * Handle row deletion
 */
function handleDeleteRow(e) {
    const row = e.currentTarget.closest('.pdf-range-row');
    row.remove();
    
    // Reindex remaining rows
    const rows = rangesContainer.querySelectorAll('.pdf-range-row');
    rows.forEach((r, idx) => {
        const num = idx + 1;
        r.setAttribute('data-row', num);
        r.querySelector('.pdf-range-num').textContent = `Part ${num}`;
        
        // Update labels and ids to keep semantic
        r.querySelector('label[for^="fileName"]').setAttribute('for', `fileName_${num}`);
        r.querySelector('input.filename-input').setAttribute('id', `fileName_${num}`);
        
        r.querySelector('label[for^="startPage"]').setAttribute('for', `startPage_${num}`);
        r.querySelector('input.start-page-input').setAttribute('id', `startPage_${num}`);
        
        r.querySelector('label[for^="endPage"]').setAttribute('for', `endPage_${num}`);
        r.querySelector('input.end-page-input').setAttribute('id', `endPage_${num}`);
    });

    numSplitsInput.value = rows.length;
    validateRanges();
}

/**
 * Validation check for range configurations
 */
function validateRanges() {
    const rows = rangesContainer.querySelectorAll('.pdf-range-row');
    let isValid = true;
    let errorMsg = '';

    if (rows.length === 0) {
        isValid = false;
        errorMsg = 'Please add at least one split range.';
    }

    rows.forEach(row => {
        row.classList.remove('invalid-range');
        
        const nameInput = row.querySelector('.filename-input');
        const startInput = row.querySelector('.start-page-input');
        const endInput = row.querySelector('.end-page-input');

        const name = nameInput.value.trim();
        const start = parseInt(startInput.value);
        const end = parseInt(endInput.value);

        let rowValid = true;

        if (!name) {
            rowValid = false;
            errorMsg = 'Filename cannot be empty.';
        } else if (isNaN(start) || start < 1 || start > fileData.totalPages) {
            rowValid = false;
            errorMsg = `From Page must be between 1 and ${fileData.totalPages}.`;
        } else if (isNaN(end) || end < 1 || end > fileData.totalPages) {
            rowValid = false;
            errorMsg = `To Page must be between 1 and ${fileData.totalPages}.`;
        } else if (start > end) {
            rowValid = false;
            errorMsg = 'From Page cannot be greater than To Page.';
        }

        if (!rowValid) {
            row.classList.add('invalid-range');
            isValid = false;
        }
    });

    if (!isValid) {
        validationErrorText.textContent = errorMsg;
        validationErrorMsg.style.display = 'flex';
        btnSplitPDF.disabled = true;
    } else {
        validationErrorMsg.style.display = 'none';
        btnSplitPDF.disabled = false;
    }

    return isValid;
}

/**
 * Perform PDF Splitting via pdf-lib.js
 */
async function processPdfSplits() {
    if (!validateRanges()) return;

    // Disable split button and show progress indicator
    btnSplitPDF.disabled = true;
    btnSplitPDF.innerHTML = '<span class="pdf-spinner"></span> Processing Split...';

    // Clear previous results
    resultsSection.style.display = 'none';
    resultsList.innerHTML = '';
    splitResults = [];

    try {
        // Load target PDF document using pdf-lib (pass a sliced copy to prevent detaching the buffer)
        const srcDoc = await PDFLib.PDFDocument.load(fileData.arrayBuffer.slice(0));
        
        const rows = rangesContainer.querySelectorAll('.pdf-range-row');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const nameInput = row.querySelector('.filename-input');
            const startInput = row.querySelector('.start-page-input');
            const endInput = row.querySelector('.end-page-input');

            let fileName = nameInput.value.trim();
            if (!fileName.endsWith('.pdf')) {
                fileName += '.pdf';
            }
            const start = parseInt(startInput.value);
            const end = parseInt(endInput.value);

            // Create new pdf-lib doc
            const newDoc = await PDFLib.PDFDocument.create();
            
            // Gather indices of pages (0-indexed)
            const indices = [];
            for (let pageNum = start; pageNum <= end; pageNum++) {
                indices.push(pageNum - 1);
            }

            // Copy and Add pages
            const copiedPages = await newDoc.copyPages(srcDoc, indices);
            copiedPages.forEach(page => newDoc.addPage(page));

            // Save segment bytes
            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            splitResults.push({
                name: fileName,
                blob: blob,
                rangeString: `${start} - ${end}`,
                pageCount: indices.length,
                size: pdfBytes.length
            });

            // Yield thread for browser GUI rendering updates
            await new Promise(r => setTimeout(r, 10));
        }

        // Render Results Panel
        renderResults();

    } catch (err) {
        console.error('Error during split processing:', err);
        alert('An error occurred while splitting the PDF. Please check the console logs.');
    } finally {
        btnSplitPDF.disabled = false;
        btnSplitPDF.innerHTML = '<i class="bx bx-cut"></i> Split PDF';
    }
}

/**
 * Render Split Results Items
 */
function renderResults() {
    resultCount.textContent = splitResults.length;
    resultsList.innerHTML = '';

    splitResults.forEach((result, idx) => {
        const itemHtml = `
        <div class="pdf-result-item">
            <div>
                <div class="pdf-file-name">${result.name}</div>
                <div class="pdf-result-meta">Pages: ${result.rangeString} (${result.pageCount} pages) | Size: ${formatBytes(result.size)}</div>
            </div>
            <div class="pdf-result-actions">
                <button class="pdf-btn-secondary" onclick="openPreview(${idx})">
                    <i class="bx bx-show"></i> Preview
                </button>
                <button class="pdf-btn-success" onclick="downloadSingle(${idx})">
                    <i class="bx bx-download"></i> Download
                </button>
            </div>
        </div>
        `;
        resultsList.insertAdjacentHTML('beforeend', itemHtml);
    });

    resultsSection.style.display = 'block';
    
    // Smooth scroll down to results section
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Download a Single PDF Segment
 */
window.downloadSingle = function(index) {
    const item = splitResults[index];
    if (item) {
        downloadBlob(item.blob, item.name);
    }
};

/**
 * Download All Segments as a Single ZIP Client-Side
 */
function downloadAllAsZip() {
    if (splitResults.length === 0) return;

    btnDownloadZip.disabled = true;
    btnDownloadZip.innerHTML = '<span class="pdf-spinner"></span> Packing ZIP...';

    const zip = new JSZip();
    
    // Add each split blob to zip structure
    splitResults.forEach(item => {
        zip.file(item.name, item.blob);
    });

    zip.generateAsync({ type: 'blob' })
        .then((content) => {
            const zipName = `${fileData.baseName}_splits.zip`;
            downloadBlob(content, zipName);
        })
        .catch(err => {
            console.error('ZIP Error:', err);
            alert('Failed to generate ZIP package.');
        })
        .finally(() => {
            btnDownloadZip.disabled = false;
            btnDownloadZip.innerHTML = '<i class="bx bxs-file-archive"></i> Download All (.ZIP)';
        });
}

/**
 * Helper to download Blob to user device
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- PREVIEW MODAL LOGIC ---

/**
 * Open Preview Modal for target Segment
 */
window.openPreview = async function(index) {
    const item = splitResults[index];
    if (!item) return;

    // Reset preview states
    previewState.blob = item.blob;
    previewState.fileName = item.name;
    previewState.currentPage = 1;

    // Show loading state or modal framework
    modalTitle.textContent = `Preview: ${item.name}`;
    previewModal.style.display = 'flex';

    try {
        const arrayBuffer = await item.blob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        previewState.pdfDoc = await loadingTask.promise;
        previewState.totalPages = previewState.pdfDoc.numPages;

        previewTotalPages.textContent = previewState.totalPages;
        
        renderPreviewPage(1);

    } catch (err) {
        console.error('PDF.js loading error:', err);
        alert('Failed to render PDF preview page.');
        closePreviewModal();
    }
};

/**
 * Render PDF page onto Canvas using PDF.js
 */
async function renderPreviewPage(pageNum) {
    if (!previewState.pdfDoc) return;
    
    previewCurrentPage.textContent = pageNum;
    
    // Disable/Enable Nav buttons appropriately
    btnPrevPage.disabled = (pageNum <= 1);
    btnNextPage.disabled = (pageNum >= previewState.totalPages);

    try {
        const page = await previewState.pdfDoc.getPage(pageNum);
        
        // Define canvas scale based on modal/window size
        const modalBody = previewModal.querySelector('.pdf-modal-body');
        const containerWidth = modalBody.clientWidth - 40; // paddings
        
        // Fetch viewport at baseline scale
        let scale = 1.25;
        let viewport = page.getViewport({ scale: scale });
        
        // Fit width to window/modal width if small
        if (viewport.width > containerWidth) {
            scale = containerWidth / page.getViewport({ scale: 1.0 }).width;
            viewport = page.getViewport({ scale: scale });
        }

        const ctx = previewCanvas.getContext('2d');
        previewCanvas.height = viewport.height;
        previewCanvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;

    } catch (err) {
        console.error('Error rendering page:', err);
    }
}

/**
 * Close Modal
 */
function closePreviewModal() {
    previewModal.style.display = 'none';
    previewState = {
        pdfDoc: null,
        currentPage: 1,
        totalPages: 1,
        blob: null,
        fileName: ''
    };
    // Clear canvas
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
}

// --- UTILS ---

/**
 * Format Bytes size to human-readable string
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
