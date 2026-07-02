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

        // Toggle configurations based on sheet type selection
        typeSelect.addEventListener('change', () => {
            const val = typeSelect.value;
            addSubConfig.style.display = 'none';
            multConfig.style.display = 'none';
            divConfig.style.display = 'none';

            if (val === 'addition' || val === 'subtraction' || val === 'combined') {
                addSubConfig.style.display = 'block';
            } else if (val === 'multiplication') {
                multConfig.style.display = 'block';
            } else if (val === 'division') {
                divConfig.style.display = 'block';
            }
        });

        // Initialize range sliders with value badges
        setupSlider('numQuestions', 'numQuestionsVal', '');
        setupSlider('numRows', 'numRowsVal', ' rows');
        setupSlider('numDigits', 'numDigitsVal', ' digits');
        
        setupSlider('multCandDigits', 'multCandDigitsVal', ' digits');
        setupSlider('multErDigits', 'multErDigitsVal', ' digits');
        
        setupSlider('divDendDigits', 'divDendDigitsVal', ' digits');
        setupSlider('divSorDigits', 'divSorDigitsVal', ' digits');

        // Radio button group helper
        document.querySelectorAll('.aba-radio-card').forEach(card => {
            card.addEventListener('click', function () {
                const name = this.querySelector('input').name;
                document.querySelectorAll(`.aba-radio-card input[name="${name}"]`).forEach(input => {
                    input.parentElement.classList.remove('active');
                });
                this.classList.add('active');
                this.querySelector('input').checked = true;
            });
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
            const decimals = parseInt(document.querySelector('input[name="decimals"]:checked').value);

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
        }

        return questions;
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
            }

            // Generate Sheet 2: Answer Key
            doc.addPage();
            renderHeader(doc, 'ABACUS ANSWER KEY');
            renderMetadata(doc, lead, true);
            renderAnswerKey(doc, margin);

            // Save PDF with unique name
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `Abacus_${generatorConfig.type}_${timestamp}.pdf`;
            doc.save(filename);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Make sure jsPDF is loaded correctly.');
        }
    }

    function renderHeader(doc, titleText) {
        // Navy blue header banner
        doc.setFillColor(0, 39, 93); // #00275D
        doc.rect(0, 0, 210, 32, 'F');

        // Amber line
        doc.setFillColor(226, 158, 33); // #E29E21
        doc.rect(0, 32, 210, 2, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(titleText, 15, 18);

        // Subtitle Branding
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(226, 158, 33);
        doc.text('Powered by SimpleiTech — Free Client-Side Utilities', 15, 26);
    }

    function renderMetadata(doc, lead, isAnswerKey = false) {
        const startY = 43;
        
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
        
        let detailStr = `Config: ${typeStr}`;
        if (generatorConfig.rows) {
            detailStr += ` | Rows: ${generatorConfig.rows} | Digits: ${generatorConfig.digits}`;
        } else if (generatorConfig.candDigits) {
            detailStr += ` | Size: ${generatorConfig.candDigits}d x ${generatorConfig.erDigits}d`;
        } else if (generatorConfig.dendDigits) {
            detailStr += ` | Size: ${generatorConfig.dendDigits}d / ${generatorConfig.sorDigits}d`;
        }

        if (isAnswerKey) {
            detailStr += ' (CORRECT ANSWERS)';
        }
        
        doc.text(detailStr, 15, startY + 8);
        doc.line(15, startY + 12, 195, startY + 12);
    }

    // Grid rendering for Addition/Subtraction vertical questions
    function renderAddSubQuestions(doc, margin, pageHeight) {
        const startY = 65;
        const colWidth = 32;
        const rowHeight = 6.5;
        const questionsPerSectionRow = 5;
        
        let currentX = margin;
        let currentY = startY;

        currentQuestions.forEach((q, index) => {
            const colIndex = index % questionsPerSectionRow;
            const rowIndex = Math.floor(index / questionsPerSectionRow);

            // Compute positions
            currentX = margin + (colIndex * colWidth) + (colIndex * 3); // some spacing
            currentY = startY + (rowIndex * (generatorConfig.rows * rowHeight + 25));

            // Page overflow check
            if (currentY + (generatorConfig.rows * rowHeight) + 15 > pageHeight - 20) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                // Adjust Y back for next page
                const tempY = startY - 15; // Shift Y up slightly on new page since metadata is omitted
                currentY = tempY + (rowIndex % 3) * (generatorConfig.rows * rowHeight + 25); 
            }

            // Print Question Number
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(0, 39, 93);
            doc.text(`[ ${q.questionNum} ]`, currentX + 8, currentY - 4);

            // Print Numbers
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(30, 30, 30);
            
            q.rows.forEach((row, rIdx) => {
                const yPos = currentY + (rIdx * rowHeight);
                let numText = row.val.toFixed(generatorConfig.decimals);
                
                // Show operation sign on the left of number
                if (rIdx > 0 && row.sign === '-') {
                    doc.text('-', currentX + 2, yPos);
                } else if (rIdx > 0 && row.sign === '+') {
                    doc.text('+', currentX + 2, yPos);
                }
                
                // Right align digits
                doc.text(numText, currentX + colWidth - 2, yPos, { align: 'right' });
            });

            // Draw line below numbers
            const lineY = currentY + (generatorConfig.rows * rowHeight) - 2;
            doc.setLineWidth(0.4);
            doc.line(currentX, lineY, currentX + colWidth, lineY);

            // Answer Box
            const boxY = lineY + 2;
            doc.setFillColor(250, 250, 250);
            doc.rect(currentX, boxY, colWidth, 9, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(currentX, boxY, colWidth, 9, 'S');
        });
    }

    // Multiplication Questions Grid
    function renderMultQuestions(doc, margin, pageHeight) {
        const startY = 65;
        const colWidth = 55;
        const rowHeight = 15;
        const cols = 3;

        let currentX = margin;
        let currentY = startY;

        currentQuestions.forEach((q, index) => {
            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);

            currentX = margin + (colIndex * colWidth) + (colIndex * 5);
            currentY = startY + (rowIndex * rowHeight);

            // Page overflow check
            if (currentY + 12 > pageHeight - 20) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                currentY = startY;
            }

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 30, 30);
            
            const qStr = `${q.questionNum})  ${q.factor1} x ${q.factor2} = `;
            doc.text(qStr, currentX, currentY);
            
            // Underline space for answer
            doc.setDrawColor(180, 180, 180);
            doc.line(currentX + doc.getTextWidth(qStr) + 1, currentY + 1, currentX + colWidth - 2, currentY + 1);
        });
    }

    // Division Questions Grid
    function renderDivQuestions(doc, margin, pageHeight) {
        const startY = 65;
        const colWidth = 55;
        const rowHeight = 15;
        const cols = 3;

        let currentX = margin;
        let currentY = startY;

        currentQuestions.forEach((q, index) => {
            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);

            currentX = margin + (colIndex * colWidth) + (colIndex * 5);
            currentY = startY + (rowIndex * rowHeight);

            // Page overflow check
            if (currentY + 12 > pageHeight - 20) {
                doc.addPage();
                renderHeader(doc, 'ABACUS PRACTICE WORKSHEET (Cont.)');
                currentY = startY;
            }

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 30, 30);
            
            const qStr = `${q.questionNum})  ${q.dividend} \u00f7 ${q.divisor} = `; // \u00f7 is division symbol
            doc.text(qStr, currentX, currentY);
            
            // Underline space for answer
            doc.setDrawColor(180, 180, 180);
            doc.line(currentX + doc.getTextWidth(qStr) + 1, currentY + 1, currentX + colWidth - 2, currentY + 1);
        });
    }

    // Render Answer Key grid
    function renderAnswerKey(doc, margin) {
        const startY = 68;
        const colWidth = 33;
        const rowHeight = 11;
        const cols = 5;

        let currentX = margin;
        let currentY = startY;

        currentQuestions.forEach((q, index) => {
            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);

            currentX = margin + (colIndex * colWidth) + (colIndex * 3);
            currentY = startY + (rowIndex * rowHeight);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(0, 39, 93);
            doc.text(`Q${q.questionNum}:`, currentX, currentY);
            
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(` ${q.answer}`, currentX + doc.getTextWidth(`Q${q.questionNum}:`) + 1, currentY);
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
