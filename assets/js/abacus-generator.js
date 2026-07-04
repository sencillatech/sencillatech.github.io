// Abacus Sheet Generator Logic - SimpleiTech
// Certified Advanced Abacus Champion Math Engine

(function () {
    'use strict';

    // Stored Lead Key
    const STORAGE_KEY = 'sit_abacus_leads';

    // Cached generation parameters
    let currentQuestions = [];
    let generatorConfig = {};

    // Page Initialization
    document.addEventListener('DOMContentLoaded', () => {
        initUI();
        checkAdminMode();
    });

    // 1. UI Setup & Interactivity
    function initUI() {
        const typeSelect = document.getElementById('sheetType');
        const addSubConfig = document.getElementById('addSubConfig');
        const multConfig = document.getElementById('multConfig');
        const divConfig = document.getElementById('divConfig');
        const squareConfig = document.getElementById('squareConfig');
        const squareRootConfig = document.getElementById('squareRootConfig');
        const percentageConfig = document.getElementById('percentageConfig');

        // Toggle configurations based on sheet type selection
        typeSelect.addEventListener('change', () => {
            const val = typeSelect.value;
            addSubConfig.style.display = 'none';
            multConfig.style.display = 'none';
            divConfig.style.display = 'none';
            squareConfig.style.display = 'none';
            squareRootConfig.style.display = 'none';
            percentageConfig.style.display = 'none';

            if (val === 'addition' || val === 'subtraction' || val === 'combined') {
                addSubConfig.style.display = 'block';
            } else if (val === 'multiplication') {
                multConfig.style.display = 'block';
            } else if (val === 'division') {
                divConfig.style.display = 'block';
            } else if (val === 'square') {
                squareConfig.style.display = 'block';
            } else if (val === 'square_root') {
                squareRootConfig.style.display = 'block';
            } else if (val === 'percentage') {
                percentageConfig.style.display = 'block';
            }

            // Hide presets group for squaring and square root
            const presetsGroup = document.querySelector('.aba-presets-group');
            if (presetsGroup) {
                if (val === 'square' || val === 'square_root') {
                    presetsGroup.style.display = 'none';
                } else {
                    presetsGroup.style.display = 'flex';
                }
            }
        });

        // Initialize range sliders with value badges for multiplication and division digits only
        setupSlider('multCandDigits', 'multCandDigitsVal', ' digits');
        setupSlider('multErDigits', 'multErDigitsVal', ' digits');
        
        setupSlider('divDendDigits', 'divDendDigitsVal', ' digits');
        setupSlider('divSorDigits', 'divSorDigitsVal', ' digits');
        
        setupSlider('squareBaseDigits', 'squareBaseDigitsVal', ' digits');
        setupSlider('squareRootRootDigits', 'squareRootRootDigitsVal', ' digits');

        // Preset buttons handling
        const presets = document.querySelectorAll('.aba-btn-preset');
        const numQuestionsSelect = document.getElementById('numQuestions');
        
        presets.forEach(btn => {
            btn.addEventListener('click', function() {
                const val = this.getAttribute('data-preset');
                numQuestionsSelect.value = val;
                presets.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Deactivate presets if dropdown is manually changed
        numQuestionsSelect.addEventListener('change', () => {
            presets.forEach(p => {
                if (p.getAttribute('data-preset') === numQuestionsSelect.value) {
                    p.classList.add('active');
                } else {
                    p.classList.remove('active');
                }
            });
        });

        // Set initial active preset
        presets.forEach(p => {
            if (p.getAttribute('data-preset') === numQuestionsSelect.value) {
                p.classList.add('active');
            }
        });

        // Lead Modal controls
        const leadModal = document.getElementById('leadModal');
        const closeBtn = document.querySelector('.aba-modal-close');
        const cancelBtn = document.getElementById('cancelLeadBtn');
        const leadForm = document.getElementById('leadCollectionForm');

        closeBtn.addEventListener('click', () => leadModal.style.display = 'none');
        cancelBtn.addEventListener('click', () => leadModal.style.display = 'none');

        // Form Submit -> Generate and Download PDF
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Capture lead details
            const lead = {
                name: document.getElementById('leadName').value.trim(),
                email: document.getElementById('leadEmail').value.trim(),
                phone: document.getElementById('leadPhone').value.trim(),
                role: document.getElementById('leadRole').value,
                timestamp: new Date().toISOString()
            };

            // Save lead locally (Simulated DB)
            saveLead(lead);

            // Hide Modal
            leadModal.style.display = 'none';

            // Generate PDF
            generatePDF(lead);
        });

        // Generate Button Trigger
        document.getElementById('btnGenerate').addEventListener('click', () => {
            // Check if configurations are valid
            if (!validateConfig()) return;

            // Generate questions in memory (Ensures unique seed every click)
            currentQuestions = generateMathQuestions();

            // Open lead modal to prompt details
            leadForm.reset();
            leadModal.style.display = 'flex';
        });

        // Trigger initial select change to update preset buttons visibility
        typeSelect.dispatchEvent(new Event('change'));
    }

    // Slider display synchronizer
    function setupSlider(sliderId, badgeId, suffix) {
        const slider = document.getElementById(sliderId);
        const badge = document.getElementById(badgeId);
        if (slider && badge) {
            slider.addEventListener('input', () => {
                badge.textContent = slider.value + suffix;
            });
        }
    }

    // 2. Math Generation Engines
    // Advanced math rules for Abacus training
    function generateMathQuestions() {
        const type = document.getElementById('sheetType').value;
        const count = parseInt(document.getElementById('numQuestions').value);
        let questions = [];

        generatorConfig = {
            type: type,
            count: count,
            timestamp: new Date().toLocaleDateString()
        };

        if (type === 'addition' || type === 'subtraction' || type === 'combined') {
            const rows = parseInt(document.getElementById('numRows').value);
            const digits = parseInt(document.getElementById('numDigits').value);
            const decimals = parseInt(document.getElementById('numDecimals').value);

            generatorConfig.rows = rows;
            generatorConfig.digits = digits;
            generatorConfig.decimals = decimals;

            for (let q = 1; q <= count; q++) {
                questions.push(generateAddSubCol(q, type, rows, digits, decimals));
            }
        } else if (type === 'multiplication') {
            const candDigits = parseInt(document.getElementById('multCandDigits').value);
            const erDigits = parseInt(document.getElementById('multErDigits').value);

            generatorConfig.candDigits = candDigits;
            generatorConfig.erDigits = erDigits;

            for (let q = 1; q <= count; q++) {
                questions.push(generateMultQuestion(q, candDigits, erDigits));
            }
        } else if (type === 'division') {
            const dendDigits = parseInt(document.getElementById('divDendDigits').value);
            const sorDigits = parseInt(document.getElementById('divSorDigits').value);

            generatorConfig.dendDigits = dendDigits;
            generatorConfig.sorDigits = sorDigits;

            for (let q = 1; q <= count; q++) {
                questions.push(generateDivQuestion(q, dendDigits, sorDigits));
            }
        } else if (type === 'square') {
            const baseDigits = parseInt(document.getElementById('squareBaseDigits').value);
            generatorConfig.baseDigits = baseDigits;

            for (let q = 1; q <= count; q++) {
                questions.push(generateSquareQuestion(q, baseDigits));
            }
        } else if (type === 'square_root') {
            const rootDigits = parseInt(document.getElementById('squareRootRootDigits').value);
            generatorConfig.rootDigits = rootDigits;

            for (let q = 1; q <= count; q++) {
                questions.push(generateSquareRootQuestion(q, rootDigits));
            }
        } else if (type === 'percentage') {
            const pctType = document.getElementById('percentageType').value;
            generatorConfig.pctType = pctType;

            for (let q = 1; q <= count; q++) {
                questions.push(generatePercentageQuestion(q, pctType));
            }
        }

        return questions;
    }

    // Percentage question generator
    function generatePercentageQuestion(questionNum, pctType) {
        let x, y, op, answer;
        if (pctType === 'basic') {
            // Clean percentage multiple of 5 or 10
            const pctOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 95];
            x = pctOptions[getRandomInt(0, pctOptions.length - 1)];
            // Y is 2-digit or 3-digit number (10 to 999)
            // Let's favor multiples of 10 or 5 for basic to keep math clean
            const useCleanY = Math.random() > 0.3;
            if (useCleanY) {
                y = getRandomInt(2, 20) * 50; // 100, 150, 200, ..., 1000
            } else {
                y = getRandomInt(10, 999);
            }
            op = 'of';
            answer = parseFloat(((x * y) / 100).toFixed(2));
        } else if (pctType === 'advanced') {
            // Random 2-digit or 3-digit numbers
            x = getRandomInt(11, 99);
            y = getRandomInt(100, 999);
            op = 'of';
            answer = parseFloat(((x * y) / 100).toFixed(2));
        } else {
            // inc_dec
            const pctOptions = [5, 10, 12, 15, 20, 25, 30, 40, 50, 75];
            x = pctOptions[getRandomInt(0, pctOptions.length - 1)];
            y = getRandomInt(10, 50) * 10; // 100, 110, ..., 500
            op = Math.random() > 0.5 ? 'inc' : 'dec';
            if (op === 'inc') {
                answer = parseFloat((y * (1 + x / 100)).toFixed(2));
            } else {
                answer = parseFloat((y * (1 - x / 100)).toFixed(2));
            }
        }

        return {
            questionNum: questionNum,
            pctType: pctType,
            x: x,
            y: y,
            op: op,
            answer: answer
        };
    }

    // Square Root question generator
    function generateSquareRootQuestion(questionNum, rootDigits) {
        const minVal = rootDigits === 1 ? 1 : Math.pow(10, rootDigits - 1);
        const maxVal = Math.pow(10, rootDigits) - 1;
        const root = getRandomInt(minVal, maxVal);
        return {
            questionNum: questionNum,
            radicand: root * root,
            answer: root
        };
    }

    // Squaring question generator
    function generateSquareQuestion(questionNum, baseDigits) {
        const minVal = baseDigits === 1 ? 1 : Math.pow(10, baseDigits - 1);
        const maxVal = Math.pow(10, baseDigits) - 1;
        const base = getRandomInt(minVal, maxVal);
        return {
            questionNum: questionNum,
            base: base,
            answer: base * base
        };
    }

    // Addition & Subtraction columns generator (running total must stay >= 0)
    function generateAddSubCol(questionNum, type, rows, digits, decimalPlaces) {
        const factor = Math.pow(10, decimalPlaces);
        
        // Define min and max limits for digits width
        const minVal = digits === 1 ? 1 : Math.pow(10, digits - 1);
        const maxVal = Math.pow(10, digits) - 1;

        let rowValues = [];
        let runningSum = 0;

        for (let r = 0; r < rows; r++) {
            let val = getRandomInt(minVal, maxVal);
            if (decimalPlaces > 0) {
                val = val / factor;
            }

            // Decide sign
            let sign = '+';
            if (r > 0) { // First row is always positive
                if (type === 'subtraction') {
                    sign = '-';
                } else if (type === 'combined') {
                    sign = Math.random() > 0.4 ? '-' : '+'; // Slightly more addition to keep it positive
                }
            }

            if (sign === '-') {
                // Champion Rule: running sum must never drop below 0
                if (runningSum - val < 0) {
                    // Enforce compliance by swapping to addition or generating a fitting subtraction
                    if (runningSum === 0) {
                        sign = '+';
                        runningSum += val;
                    } else {
                        // Generate a subtraction value that fits
                        let maxPossible = Math.floor(runningSum * factor) / factor;
                        if (maxPossible >= minVal / factor) {
                            let adjustedVal = getRandomInt(minVal, Math.min(maxVal, Math.floor(maxPossible * factor)));
                            val = adjustedVal / factor;
                            runningSum -= val;
                        } else {
                            sign = '+';
                            runningSum += val;
                        }
                    }
                } else {
                    runningSum -= val;
                }
            } else {
                runningSum += val;
            }

            rowValues.push({
                val: val,
                sign: sign,
                text: (sign === '-' ? '-' : '') + val.toFixed(decimalPlaces)
            });
        }

        return {
            questionNum: questionNum,
            rows: rowValues,
            answer: parseFloat(runningSum.toFixed(decimalPlaces))
        };
    }

    // Multiplication question generator
    function generateMultQuestion(questionNum, candDigits, erDigits) {
        const min1 = Math.pow(10, candDigits - 1);
        const max1 = Math.pow(10, candDigits) - 1;
        const min2 = erDigits === 1 ? 2 : Math.pow(10, erDigits - 1); // avoids multiplying by 1 or 0
        const max2 = Math.pow(10, erDigits) - 1;

        const factor1 = getRandomInt(min1, max1);
        const factor2 = getRandomInt(min2, max2);
        
        return {
            questionNum: questionNum,
            factor1: factor1,
            factor2: factor2,
            answer: factor1 * factor2
        };
    }

    // Division question generator (ensures integer answer without remainders)
    function generateDivQuestion(questionNum, dendDigits, sorDigits) {
        const minSor = Math.pow(10, sorDigits - 1);
        const maxSor = Math.pow(10, sorDigits) - 1;
        
        const divisor = getRandomInt(minSor, maxSor);
        
        // Target dividend limits
        const minDend = Math.pow(10, dendDigits - 1);
        const maxDend = Math.pow(10, dendDigits) - 1;

        // Calculate quotient limits: Divisor * Quotient = Dividend
        const minQuot = Math.ceil(minDend / divisor);
        const maxQuot = Math.floor(maxDend / divisor);

        let quotient = 0;
        let dividend = 0;

        if (maxQuot >= minQuot) {
            quotient = getRandomInt(minQuot, maxQuot);
            dividend = divisor * quotient;
        } else {
            // Fallback in case of mismatch
            quotient = getRandomInt(2, 99);
            dividend = divisor * quotient;
        }

        return {
            questionNum: questionNum,
            dividend: dividend,
            divisor: divisor,
            answer: quotient
        };
    }

    // Helper random integer function
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Config Input Validation
    function validateConfig() {
        const type = document.getElementById('sheetType').value;
        if (type === 'division') {
            const dend = parseInt(document.getElementById('divDendDigits').value);
            const sor = parseInt(document.getElementById('divSorDigits').value);
            if (sor >= dend) {
                alert('For Division, the Dividend digits must be greater than the Divisor digits.');
                return false;
            }
        }
        return true;
    }

    // 3. PDF Generation & Layout Design (jsPDF)
    function generatePDF(lead) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Set metadata
            doc.setProperties({
                title: 'Abacus Practice Worksheet',
                subject: 'Abacus Sheet Generator',
                author: 'SimpleiTech',
                keywords: 'abacus, mathematics, worksheet'
            });

            // Layout Dimensions (A4: 210mm x 297mm)
            const margin = 15;
            const pageHeight = 297;
            const pageWidth = 210;

            // Generate Sheet 1: Questions
            renderHeader(doc, 'ABACUS PRACTICE WORKSHEET');
            renderMetadata(doc, lead);
            
            if (generatorConfig.type === 'addition' || generatorConfig.type === 'subtraction' || generatorConfig.type === 'combined') {
                renderAddSubQuestions(doc, margin, pageHeight);
            } else if (generatorConfig.type === 'multiplication') {
                renderMultQuestions(doc, margin, pageHeight);
            } else if (generatorConfig.type === 'division') {
                renderDivQuestions(doc, margin, pageHeight);
            } else if (generatorConfig.type === 'square') {
                renderSquareQuestions(doc, margin, pageHeight);
            } else if (generatorConfig.type === 'square_root') {
                renderSquareRootQuestions(doc, margin, pageHeight);
            } else if (generatorConfig.type === 'percentage') {
                renderPercentageQuestions(doc, margin, pageHeight);
            }

            // Query total question pages count before adding answer key page
            const Q_total = doc.internal.getNumberOfPages();

            // Generate Sheet 2: Answer Key
            doc.addPage();
            renderHeader(doc, 'ABACUS ANSWER KEY');
            renderMetadata(doc, lead, true);
            renderAnswerKey(doc, margin);

            // Compute total pages
            const totalPages = doc.internal.getNumberOfPages();
            const A_total = totalPages - Q_total;

            // Post-process to write page numbers onto the top-right of all headers
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(255, 255, 255); // White text inside navy banner
                if (i <= Q_total) {
                    doc.text(`Page ${i}-${Q_total}`, 195, 11, { align: 'right' });
                } else {
                    doc.text(`Ans Page ${i - Q_total}-${A_total}`, 195, 11, { align: 'right' });
                }
            }

            // Save PDF with unique name
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `Abacus_${generatorConfig.type}_${timestamp}.pdf`;
            
            // If preview parameter is set, render to iframe on screen for testing
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('preview') === 'true') {
                let previewContainer = document.getElementById('pdfPreviewContainer');
                if (!previewContainer) {
                    previewContainer = document.createElement('div');
                    previewContainer.id = 'pdfPreviewContainer';
                    previewContainer.style.position = 'fixed';
                    previewContainer.style.top = '0';
                    previewContainer.style.left = '0';
                    previewContainer.style.width = '100vw';
                    previewContainer.style.height = '100vh';
                    previewContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
                    previewContainer.style.zIndex = '99999';
                    previewContainer.style.display = 'flex';
                    previewContainer.style.flexDirection = 'column';
                    previewContainer.style.alignItems = 'center';
                    previewContainer.style.justifyContent = 'center';
                    
                    const closePreview = document.createElement('button');
                    closePreview.id = 'btnClosePreview';
                    closePreview.textContent = 'Close Preview';
                    closePreview.style.margin = '10px';
                    closePreview.style.padding = '8px 16px';
                    closePreview.style.fontSize = '16px';
                    closePreview.onclick = () => previewContainer.style.display = 'none';
                    previewContainer.appendChild(closePreview);

                    const iframe = document.createElement('iframe');
                    iframe.id = 'pdfPreviewIframe';
                    iframe.style.width = '90%';
                    iframe.style.height = '85%';
                    iframe.style.border = 'none';
                    iframe.style.background = '#fff';
                    previewContainer.appendChild(iframe);
                    document.body.appendChild(previewContainer);
                }
                previewContainer.style.display = 'flex';
                const iframe = document.getElementById('pdfPreviewIframe');
                iframe.src = doc.output('bloburl');
            } else {
                doc.save(filename);
            }
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Make sure jsPDF is loaded correctly.');
        }
    }

    function renderHeader(doc, titleText) {
        // Navy blue header banner
        doc.setFillColor(0, 39, 93); // #00275D
        doc.rect(0, 0, 210, 18, 'F');

        // Amber line
        doc.setFillColor(226, 158, 33); // #E29E21
        doc.rect(0, 18, 210, 1.5, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(titleText, 15, 11);

        // Subtitle Branding
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(226, 158, 33);
        doc.text('Powered by SimpleiTech', 15, 15);
    }

    function renderMetadata(doc, lead, isAnswerKey = false) {
        const startY = 27;
        
        doc.setTextColor(50, 50, 50);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        
        doc.text('Student Name:', 15, startY);
        doc.setFont('Helvetica', 'normal');
        doc.text(lead.name, 43, startY);
        doc.line(43, startY + 1, 100, startY + 1); // line under name

        doc.setFont('Helvetica', 'bold');
        doc.text('Date:', 115, startY);
        doc.setFont('Helvetica', 'normal');
        doc.text(generatorConfig.timestamp, 127, startY);
        doc.line(127, startY + 1, 160, startY + 1);

        doc.setFont('Helvetica', 'bold');
        doc.text('Score:', 170, startY);
        doc.setFont('Helvetica', 'normal');
        doc.text(`    / ${generatorConfig.count}`, 182, startY);
        doc.line(182, startY + 1, 195, startY + 1);

        // Subtitle config details
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        
        let typeStr = generatorConfig.type.toUpperCase();
        if (typeStr === 'COMBINED') typeStr = 'ADDITION & SUBTRACTION';
        if (typeStr === 'SQUARE_ROOT') typeStr = 'SQUARE ROOT';
        if (typeStr === 'PERCENTAGE') typeStr = 'PERCENTAGE';
        
        let detailStr = `Config: ${typeStr}`;
        if (generatorConfig.rows) {
            detailStr += ` | Rows: ${generatorConfig.rows} | Digits: ${generatorConfig.digits}`;
        } else if (generatorConfig.candDigits) {
            detailStr += ` | Size: ${generatorConfig.candDigits}d x ${generatorConfig.erDigits}d`;
        } else if (generatorConfig.dendDigits) {
            detailStr += ` | Size: ${generatorConfig.dendDigits}d / ${generatorConfig.sorDigits}d`;
        } else if (generatorConfig.baseDigits) {
            detailStr += ` | Size: ${generatorConfig.baseDigits}d\u00b2`;
        } else if (generatorConfig.rootDigits) {
            detailStr += ` | Size: √(${generatorConfig.rootDigits}d root)`;
        } else if (generatorConfig.pctType) {
            detailStr += ` | Mode: ${generatorConfig.pctType.toUpperCase()}`;
        }

        if (isAnswerKey) {
            detailStr += ' (CORRECT ANSWERS)';
        }
        
        doc.text(detailStr, 15, startY + 7);
        doc.line(15, startY + 10, 195, startY + 10);
    }

    // Grid rendering for Addition/Subtraction vertical questions
    function renderAddSubQuestions(doc, margin, pageHeight) {
        const startY = 48;
        const availWidth = 180; // 210 - 2 * margin

        // Dynamically scale font size and row height based on rows count
        let fontSize = 11;
        let rowHeight = 6.5;
        const rowsCount = generatorConfig.rows;
        
        if (rowsCount <= 10) {
            fontSize = 11;
            rowHeight = 6.5;
        } else if (rowsCount <= 20) {
            fontSize = 9;
            rowHeight = 4.5;
        } else if (rowsCount <= 30) {
            fontSize = 8;
            rowHeight = 3.5;
        } else {
            fontSize = 6.5;
            rowHeight = 2.7;
        }

        // Determine column width and count based on length of numbers to fit more columns where possible
        const charWidthMm = fontSize * 0.3528 * 0.55; 
        const maxLength = generatorConfig.digits + (generatorConfig.decimals > 0 ? (generatorConfig.decimals + 1) : 0) + 1; // +1 for sign
        const minColWidth = 23;
        const calculatedColWidth = Math.max(minColWidth, Math.ceil(maxLength * charWidthMm + 5)); // 5mm safety padding
        
        const spacing = 3;
        let cols = Math.floor((availWidth + spacing) / (calculatedColWidth + spacing));
        cols = Math.max(4, Math.min(8, cols)); // Keep cols between 4 and 8 for clean visual representation

        const colWidth = Math.floor((availWidth - (cols - 1) * spacing) / cols);

        let col = 0;
        let row = 0;
        let curPageStartY = startY;

        currentQuestions.forEach((q, index) => {
            // Compute positions relative to the current page
            let currentX = margin + col * (colWidth + spacing);
            let currentY = curPageStartY + row * (generatorConfig.rows * rowHeight + 18);

            // Page overflow check
            if (currentY + (generatorConfig.rows * rowHeight) + 15 > pageHeight - 15) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                col = 0;
                row = 0;
                curPageStartY = 30; // Start higher on subsequent pages since main metadata is omitted
                currentX = margin + col * (colWidth + spacing);
                currentY = curPageStartY + row * (generatorConfig.rows * rowHeight + 18);
            }

            // Print Question Number centered in the column with proper vertical spacing
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(fontSize - 1);
            doc.setTextColor(0, 39, 93);
            const qNumText = `[ ${q.questionNum} ]`;
            const qNumWidth = doc.getTextWidth(qNumText);
            const qNumX = currentX + (colWidth - qNumWidth) / 2;
            const qNumY = currentY - Math.max(4.8, fontSize * 0.45);
            doc.text(qNumText, qNumX, qNumY);

            // Print Numbers
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(fontSize);
            doc.setTextColor(30, 30, 30);
            
            q.rows.forEach((rowVal, rIdx) => {
                const yPos = currentY + (rIdx * rowHeight);
                let numText = rowVal.val.toFixed(generatorConfig.decimals);
                
                // Prepend sign directly to the number text for subsequent rows to keep it attached
                if (rIdx > 0) {
                    numText = (rowVal.sign === '-' ? '-' : '+') + numText;
                }
                
                // Right align digits
                doc.text(numText, currentX + colWidth - 2, yPos, { align: 'right' });
            });

            // Draw line below numbers
            const lineY = currentY + (generatorConfig.rows * rowHeight) - 1.5;
            doc.setLineWidth(0.3);
            doc.line(currentX, lineY, currentX + colWidth, lineY);

            // Answer Box
            const boxY = lineY + 1.5;
            const boxHeight = fontSize <= 8 ? 6 : 9;
            doc.setFillColor(250, 250, 250);
            doc.rect(currentX, boxY, colWidth, boxHeight, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(currentX, boxY, colWidth, boxHeight, 'S');

            // Move to next position
            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        });
    }

    // Multiplication Questions Grid
    function renderMultQuestions(doc, margin, pageHeight) {
        const startY = 48;
        const availWidth = 180;
        const rowHeight = 15;

        // Estimate question text width to dynamically calculate cols/colWidth
        const maxQNumLen = generatorConfig.count.toString().length + 2; // e.g. "20) " is 4 chars
        const longestQTextLen = maxQNumLen + generatorConfig.candDigits + 3 + generatorConfig.erDigits + 3; // " x " is 3, " = " is 3
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10.5);
        const charWidthMm = 10.5 * 0.3528 * 0.55;
        const textWidth = longestQTextLen * charWidthMm;
        const underlineWidth = 15; // Width of blank underline for answer
        const calculatedColWidth = Math.max(38, textWidth + underlineWidth);
        
        const spacing = 4;
        let cols = Math.floor((availWidth + spacing) / (calculatedColWidth + spacing));
        cols = Math.max(3, Math.min(4, cols)); // Keep between 3 and 4 columns

        const colWidth = Math.floor((availWidth - (cols - 1) * spacing) / cols);

        let col = 0;
        let row = 0;
        let curPageStartY = startY;

        currentQuestions.forEach((q, index) => {
            let currentX = margin + col * (colWidth + spacing);
            let currentY = curPageStartY + row * rowHeight;

            // Page overflow check
            if (currentY + 12 > pageHeight - 15) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                col = 0;
                row = 0;
                curPageStartY = 30;
                currentX = margin + col * (colWidth + spacing);
                currentY = curPageStartY + row * rowHeight;
            }

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 30, 30);
            
            const qStr = `${q.questionNum})  ${q.factor1} x ${q.factor2} = `;
            doc.text(qStr, currentX, currentY);
            
            // Underline space for answer
            doc.setDrawColor(180, 180, 180);
            doc.line(currentX + doc.getTextWidth(qStr) + 1, currentY + 1, currentX + colWidth - 2, currentY + 1);

            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        });
    }

    // Division Questions Grid
    function renderDivQuestions(doc, margin, pageHeight) {
        const startY = 48;
        const availWidth = 180;
        const rowHeight = 15;

        // Estimate question text width to dynamically calculate cols/colWidth
        const maxQNumLen = generatorConfig.count.toString().length + 2; // e.g. "20) " is 4 chars
        const longestQTextLen = maxQNumLen + generatorConfig.dendDigits + 3 + generatorConfig.sorDigits + 3; // " ÷ " is 3, " = " is 3
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10.5);
        const charWidthMm = 10.5 * 0.3528 * 0.55;
        const textWidth = longestQTextLen * charWidthMm;
        const underlineWidth = 15; // Width of blank underline for answer
        const calculatedColWidth = Math.max(38, textWidth + underlineWidth);
        
        const spacing = 4;
        let cols = Math.floor((availWidth + spacing) / (calculatedColWidth + spacing));
        cols = Math.max(3, Math.min(4, cols)); // Keep between 3 and 4 columns

        const colWidth = Math.floor((availWidth - (cols - 1) * spacing) / cols);

        let col = 0;
        let row = 0;
        let curPageStartY = startY;

        currentQuestions.forEach((q, index) => {
            let currentX = margin + col * (colWidth + spacing);
            let currentY = curPageStartY + row * rowHeight;

            // Page overflow check
            if (currentY + 12 > pageHeight - 15) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                col = 0;
                row = 0;
                curPageStartY = 30;
                currentX = margin + col * (colWidth + spacing);
                currentY = curPageStartY + row * rowHeight;
            }

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 30, 30);
            
            const qStr = `${q.questionNum})  ${q.dividend} \u00f7 ${q.divisor} = `; // \u00f7 is division symbol
            doc.text(qStr, currentX, currentY);
            
            // Underline space for answer
            doc.setDrawColor(180, 180, 180);
            doc.line(currentX + doc.getTextWidth(qStr) + 1, currentY + 1, currentX + colWidth - 2, currentY + 1);

            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        });
    }

    // Squaring Questions Grid Rendering
    function renderSquareQuestions(doc, margin, pageHeight) {
        const startY = 48;
        const availWidth = 180;
        const rowHeight = 15;

        // Estimate question text width to dynamically calculate cols/colWidth
        const maxQNumLen = generatorConfig.count.toString().length + 2; 
        const longestQTextLen = maxQNumLen + generatorConfig.baseDigits + 4; // e.g. "20)  45² = "
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10.5);
        const charWidthMm = 10.5 * 0.3528 * 0.55;
        const textWidth = longestQTextLen * charWidthMm;
        const underlineWidth = 15; 
        const calculatedColWidth = Math.max(38, textWidth + underlineWidth);
        
        const spacing = 4;
        let cols = Math.floor((availWidth + spacing) / (calculatedColWidth + spacing));
        cols = Math.max(3, Math.min(4, cols)); 

        const colWidth = Math.floor((availWidth - (cols - 1) * spacing) / cols);

        let col = 0;
        let row = 0;
        let curPageStartY = startY;

        currentQuestions.forEach((q, index) => {
            let currentX = margin + col * (colWidth + spacing);
            let currentY = curPageStartY + row * rowHeight;

            // Page overflow check
            if (currentY + 12 > pageHeight - 15) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                col = 0;
                row = 0;
                curPageStartY = 30;
                currentX = margin + col * (colWidth + spacing);
                currentY = curPageStartY + row * rowHeight;
            }

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 30, 30);
            
            const qStr = `${q.questionNum})  ${q.base}\u00b2 = `;
            doc.text(qStr, currentX, currentY);
            
            // Underline space for answer
            doc.setDrawColor(180, 180, 180);
            doc.line(currentX + doc.getTextWidth(qStr) + 1, currentY + 1, currentX + colWidth - 2, currentY + 1);

            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        });
    }

    // Square Root Questions Grid Rendering
    function renderSquareRootQuestions(doc, margin, pageHeight) {
        const startY = 48;
        const availWidth = 180;
        const rowHeight = 15;

        // Estimate question text width to dynamically calculate cols/colWidth
        const maxQNumLen = generatorConfig.count.toString().length + 2; 
        const longestQTextLen = maxQNumLen + (generatorConfig.rootDigits * 2) + 5; // e.g. "20)  √9801 = "
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10.5);
        const charWidthMm = 10.5 * 0.3528 * 0.55;
        const textWidth = longestQTextLen * charWidthMm;
        const underlineWidth = 15; 
        const calculatedColWidth = Math.max(38, textWidth + underlineWidth);
        
        const spacing = 4;
        let cols = Math.floor((availWidth + spacing) / (calculatedColWidth + spacing));
        cols = Math.max(3, Math.min(4, cols)); 

        const colWidth = Math.floor((availWidth - (cols - 1) * spacing) / cols);

        let col = 0;
        let row = 0;
        let curPageStartY = startY;

        currentQuestions.forEach((q, index) => {
            let currentX = margin + col * (colWidth + spacing);
            let currentY = curPageStartY + row * rowHeight;

            // Page overflow check
            if (currentY + 12 > pageHeight - 15) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                col = 0;
                row = 0;
                curPageStartY = 30;
                currentX = margin + col * (colWidth + spacing);
                currentY = curPageStartY + row * rowHeight;
            }

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 30, 30);
            
            const qStr = `${q.questionNum})  √${q.radicand} = `;
            doc.text(qStr, currentX, currentY);
            
            // Underline space for answer
            doc.setDrawColor(180, 180, 180);
            doc.line(currentX + doc.getTextWidth(qStr) + 1, currentY + 1, currentX + colWidth - 2, currentY + 1);

            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        });
    }

    // Percentage Questions Grid Rendering
    function renderPercentageQuestions(doc, margin, pageHeight) {
        const startY = 48;
        const availWidth = 180;
        const rowHeight = 15;

        // Estimate question text width to dynamically calculate cols/colWidth
        const maxQNumLen = generatorConfig.count.toString().length + 2; 
        const longestQTextLen = maxQNumLen + 18; // e.g. "20)  Inc 500 by 75% = "
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        const charWidthMm = 10 * 0.3528 * 0.55;
        const textWidth = longestQTextLen * charWidthMm;
        const underlineWidth = 12; 
        const calculatedColWidth = Math.max(45, textWidth + underlineWidth);
        
        const spacing = 4;
        let cols = Math.floor((availWidth + spacing) / (calculatedColWidth + spacing));
        cols = Math.max(2, Math.min(3, cols)); // Keep between 2 and 3 columns for readable percentage text

        const colWidth = Math.floor((availWidth - (cols - 1) * spacing) / cols);

        let col = 0;
        let row = 0;
        let curPageStartY = startY;

        currentQuestions.forEach((q, index) => {
            let currentX = margin + col * (colWidth + spacing);
            let currentY = curPageStartY + row * rowHeight;

            // Page overflow check
            if (currentY + 12 > pageHeight - 15) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                col = 0;
                row = 0;
                curPageStartY = 30;
                currentX = margin + col * (colWidth + spacing);
                currentY = curPageStartY + row * rowHeight;
            }

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            
            let qStr = '';
            if (q.op === 'of') {
                qStr = `${q.questionNum})  Find ${q.x}% of ${q.y} = `;
            } else if (q.op === 'inc') {
                qStr = `${q.questionNum})  Inc ${q.y} by ${q.x}% = `;
            } else {
                qStr = `${q.questionNum})  Dec ${q.y} by ${q.x}% = `;
            }
            doc.text(qStr, currentX, currentY);
            
            // Underline space for answer
            doc.setDrawColor(180, 180, 180);
            doc.line(currentX + doc.getTextWidth(qStr) + 1, currentY + 1, currentX + colWidth - 2, currentY + 1);

            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        });
    }

    // Render Answer Key grid
    function renderAnswerKey(doc, margin) {
        const startY = 48;
        const availWidth = 180;
        const rowHeight = 11;
        const pageHeight = 297;

        // Calculate max answer string length
        let maxAnsLen = 5; // fallback
        if (generatorConfig.type === 'addition' || generatorConfig.type === 'subtraction' || generatorConfig.type === 'combined') {
            maxAnsLen = generatorConfig.digits + 2 + (generatorConfig.decimals > 0 ? (generatorConfig.decimals + 1) : 0);
        } else if (generatorConfig.type === 'multiplication') {
            maxAnsLen = generatorConfig.candDigits + generatorConfig.erDigits + 1;
        } else if (generatorConfig.type === 'division') {
            maxAnsLen = generatorConfig.dendDigits - generatorConfig.sorDigits + 2;
        } else if (generatorConfig.type === 'square') {
            maxAnsLen = generatorConfig.baseDigits * 2 + 1;
        } else if (generatorConfig.type === 'square_root') {
            maxAnsLen = generatorConfig.rootDigits + 1;
        } else if (generatorConfig.type === 'percentage') {
            maxAnsLen = 8; // e.g. 9999.99 is 7 chars
        }

        const maxQNumLen = generatorConfig.count.toString().length;
        const longestAnsTextLen = 2 + maxQNumLen + 2 + maxAnsLen; // e.g. "Q100: " + answer
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        const charWidthMm = 10.5 * 0.3528 * 0.55; // ~2.03mm
        const calculatedColWidth = Math.max(20, longestAnsTextLen * charWidthMm + 3); // 3mm padding

        const spacing = 3;
        let cols = Math.floor((availWidth + spacing) / (calculatedColWidth + spacing));
        cols = Math.max(5, Math.min(8, cols)); // Keep between 5 and 8 columns

        const colWidth = Math.floor((availWidth - (cols - 1) * spacing) / cols);

        let col = 0;
        let row = 0;
        let curPageStartY = startY;

        currentQuestions.forEach((q, index) => {
            let currentX = margin + col * (colWidth + spacing);
            let currentY = curPageStartY + row * rowHeight;

            // Page overflow check
            if (currentY + 8 > pageHeight - 15) {
                doc.addPage();
                renderHeader(doc, 'ABACUS ANSWER KEY (Cont.)');
                col = 0;
                row = 0;
                curPageStartY = 30;
                currentX = margin + col * (colWidth + spacing);
                currentY = curPageStartY + row * rowHeight;
            }

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(0, 39, 93);
            doc.text(`Q${q.questionNum}:`, currentX, currentY);
            
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(` ${q.answer}`, currentX + doc.getTextWidth(`Q${q.questionNum}:`) + 1, currentY);

            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        });
    }

    // 4. Storing & Logging Lead Data (Simulated Database)
    function saveLead(lead) {
        try {
            let leads = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            leads.push(lead);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));

            // Propose external webhooks or EmailJS integration:
            // If the client sets up an active EmailJS service, we could trigger it:
            // emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", lead);
            
            console.log('[Abacus DB] Lead successfully logged:', lead);
            
            // Update admin view if visible
            renderAdminLeads();
        } catch (err) {
            console.error('Error saving lead log:', err);
        }
    }

    // 5. Admin Panel (CSV Exporter)
    function checkAdminMode() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('admin') && urlParams.get('admin') === 'true') {
            const adminSection = document.getElementById('adminSection');
            if (adminSection) {
                adminSection.style.display = 'block';
                renderAdminLeads();
                setupAdminEvents();
            }
        }
    }

    function renderAdminLeads() {
        const tableBody = document.getElementById('leadsTableBody');
        if (!tableBody) return;

        let leads = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        tableBody.innerHTML = '';

        if (leads.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666;">No leads captured yet.</td></tr>`;
            return;
        }

        // Display newest first
        leads.reverse().forEach((lead, index) => {
            const originalIndex = leads.length - 1 - index; // correct index for deletion
            const dateStr = new Date(lead.timestamp).toLocaleString();
            const badgeClass = lead.role === 'teacher' ? 'aba-badge-teacher' : 'aba-badge-student';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(lead.name)}</strong></td>
                <td><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td>
                <td>${escapeHtml(lead.phone)}</td>
                <td><span class="aba-badge ${badgeClass}">${lead.role.toUpperCase()}</span></td>
                <td style="color: #666; font-size: 0.8rem;">${dateStr}</td>
                <td>
                    <button class="aba-btn-danger btn-delete-lead" data-index="${originalIndex}"><i class="bx bx-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Add single deletion handlers
        document.querySelectorAll('.btn-delete-lead').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-index'));
                if (confirm('Are you sure you want to delete this lead?')) {
                    deleteLead(idx);
                }
            });
        });
    }

    function setupAdminEvents() {
        const btnExport = document.getElementById('btnExportLeads');
        const btnClear = document.getElementById('btnClearLeads');

        if (btnExport) {
            btnExport.addEventListener('click', () => {
                exportLeadsToCSV();
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (confirm('WARNING: Are you sure you want to delete ALL captured leads? This cannot be undone.')) {
                    localStorage.removeItem(STORAGE_KEY);
                    renderAdminLeads();
                }
            });
        }
    }

    function deleteLead(index) {
        let leads = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        leads.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
        renderAdminLeads();
    }

    function exportLeadsToCSV() {
        let leads = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        if (leads.length === 0) {
            alert('No leads available to export.');
            return;
        }

        // CSV Header
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Name,Email,Phone,Role,Timestamp\n";

        // CSV Rows
        leads.forEach(lead => {
            let row = [
                `"${lead.name.replace(/"/g, '""')}"`,
                `"${lead.email.replace(/"/g, '""')}"`,
                `"${lead.phone.replace(/"/g, '""')}"`,
                `"${lead.role}"`,
                `"${lead.timestamp}"`
            ].join(",");
            csvContent += row + "\n";
        });

        // Trigger Download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `Abacus_Leads_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

})();
