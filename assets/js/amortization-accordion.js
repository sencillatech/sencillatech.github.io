// === Amortization Schedule Accordion Renderer ===
// Shared across Home Loan, Personal Loan, and Car Loan calculators.
// Renders a monthly amortization schedule grouped by calendar year
// into accordion panels with exclusive toggle and "View All" option.

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Renders the amortization schedule with year-based accordion.
 *
 * @param {HTMLElement} scheduleSection - The <section> wrapping the table
 * @param {Array} schedule - Array of row objects: { month, principal, interest, totalPayment, balance, prepayment? }
 * @param {Function} formatCurrency - Currency formatter
 * @param {boolean} hasPrepayment - Whether to include prepayment column
 * @param {Object} theme - { prepayment: '#28a745' } for coloring
 */
function renderAmortizationAccordion(scheduleSection, schedule, formatCurrency, hasPrepayment, theme) {
    if (!scheduleSection) return;

    // Clear existing content inside the section
    const existingWrapper = scheduleSection.querySelector('.calc-amort-accordion-wrapper');
    if (existingWrapper) existingWrapper.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'calc-amort-accordion-wrapper';

    // Determine the start date (current month/year as the loan start)
    const now = new Date();
    const startMonth = now.getMonth(); // 0-indexed (0=Jan)
    const startYear = now.getFullYear();

    // Group schedule rows by calendar year
    const yearGroups = {};
    schedule.forEach((row, idx) => {
        const monthIdx = (startMonth + idx) % 12;
        const yearOffset = Math.floor((startMonth + idx) / 12);
        const calYear = startYear + yearOffset;

        if (!yearGroups[calYear]) yearGroups[calYear] = [];
        yearGroups[calYear].push({
            ...row,
            monthName: MONTH_NAMES[monthIdx],
            calYear: calYear
        });
    });

    const yearKeys = Object.keys(yearGroups).map(Number).sort((a, b) => a - b);
    const currentCalYear = now.getFullYear();
    // The first year with installments is the start year
    const firstInstallmentYear = yearKeys.length > 0 ? yearKeys[0] : currentCalYear;

    // --- View All toggle ---
    const toolbar = document.createElement('div');
    toolbar.className = 'calc-amort-toolbar';
    toolbar.innerHTML = `
        <label class="calc-amort-viewall-label" for="amortViewAll">
            <input type="checkbox" id="amortViewAll" class="calc-amort-viewall-checkbox">
            <span class="calc-amort-viewall-text">
                <i class="bi bi-arrows-expand"></i> View All
            </span>
        </label>
    `;
    wrapper.appendChild(toolbar);

    const viewAllCheckbox = toolbar.querySelector('#amortViewAll');

    // Build the table header columns
    let headerCols = `<th>Month</th><th>Principal Paid (₹)</th><th>Interest Paid (₹)</th>`;
    if (hasPrepayment) headerCols += `<th>Prepayment (₹)</th>`;
    headerCols += `<th>Total Payment (₹)</th><th>Balance (₹)</th>`;

    // --- Accordion Panels ---
    const accordion = document.createElement('div');
    accordion.className = 'calc-amort-accordion';

    yearKeys.forEach((year) => {
        const rows = yearGroups[year];
        const isCurrentYear = (year === currentCalYear);
        const isFirstYear = (year === firstInstallmentYear);
        const shouldOpen = isCurrentYear || isFirstYear;

        const panel = document.createElement('div');
        panel.className = 'calc-amort-panel' + (shouldOpen ? ' calc-amort-panel-open' : '');
        panel.dataset.year = year;

        // Calculate yearly summary
        const yearlyPrincipal = rows.reduce((s, r) => s + r.principal, 0);
        const yearlyInterest = rows.reduce((s, r) => s + r.interest, 0);
        const yearlyTotal = rows.reduce((s, r) => s + r.totalPayment, 0);
        const endBalance = rows[rows.length - 1].balance;

        // Panel header
        const header = document.createElement('div');
        header.className = 'calc-amort-panel-header';
        header.setAttribute('role', 'button');
        header.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        header.setAttribute('tabindex', '0');
        header.innerHTML = `
            <div class="calc-amort-panel-title">
                <i class="bi ${shouldOpen ? 'bi-chevron-down' : 'bi-chevron-right'} calc-amort-chevron"></i>
                <span class="calc-amort-year-label">${year}</span>
                <span class="calc-amort-month-range">${rows[0].monthName} – ${rows[rows.length - 1].monthName}</span>
            </div>
            <div class="calc-amort-panel-summary">
                <span class="calc-amort-summary-item" title="Principal Paid">P: ${formatCurrency(yearlyPrincipal)}</span>
                <span class="calc-amort-summary-item calc-amort-summary-interest" title="Interest Paid">I: ${formatCurrency(yearlyInterest)}</span>
                <span class="calc-amort-summary-item" title="Closing Balance">Bal: ${formatCurrency(endBalance)}</span>
            </div>
        `;
        panel.appendChild(header);

        // Panel body (table rows)
        const body = document.createElement('div');
        body.className = 'calc-amort-panel-body';
        body.style.display = shouldOpen ? '' : 'none';

        let tableHTML = `<table class="calc-amort-table"><thead><tr>${headerCols}</tr></thead><tbody>`;
        rows.forEach(r => {
            tableHTML += `<tr>
                <td>${r.monthName} ${r.calYear}</td>
                <td>${formatCurrency(r.principal)}</td>
                <td>${formatCurrency(r.interest)}</td>`;
            if (hasPrepayment) {
                const prepayVal = r.prepayment || 0;
                tableHTML += `<td style="color:${prepayVal > 0 ? (theme && theme.prepayment ? theme.prepayment : '#28a745') : 'inherit'}">${prepayVal > 0 ? formatCurrency(prepayVal) : '-'}</td>`;
            }
            tableHTML += `<td>${formatCurrency(r.totalPayment)}</td>
                <td>${formatCurrency(r.balance)}</td>
            </tr>`;
        });
        tableHTML += `</tbody></table>`;
        body.innerHTML = tableHTML;
        panel.appendChild(body);

        accordion.appendChild(panel);

        // --- Click handler for exclusive toggle ---
        header.addEventListener('click', () => {
            if (viewAllCheckbox.checked) return; // In "View All" mode, accordion clicks are disabled

            const isOpen = panel.classList.contains('calc-amort-panel-open');

            if (isOpen) {
                // Close this panel
                closePanel(panel);
            } else {
                // Close all others first (exclusive toggle)
                accordion.querySelectorAll('.calc-amort-panel-open').forEach(p => closePanel(p));
                // Open this panel
                openPanel(panel);
            }
        });

        // Allow keyboard activation
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });

    wrapper.appendChild(accordion);

    // Insert the wrapper after <h3> inside the section
    const h3 = scheduleSection.querySelector('h3');
    if (h3) {
        h3.insertAdjacentElement('afterend', wrapper);
    } else {
        scheduleSection.prepend(wrapper);
    }

    // Hide the old table
    const oldTableWrapper = scheduleSection.querySelector('.calc-table-responsive');
    if (oldTableWrapper) oldTableWrapper.style.display = 'none';

    // --- View All handler ---
    viewAllCheckbox.addEventListener('change', () => {
        const isViewAll = viewAllCheckbox.checked;
        const textEl = toolbar.querySelector('.calc-amort-viewall-text');

        if (isViewAll) {
            // Open all panels
            accordion.querySelectorAll('.calc-amort-panel').forEach(p => openPanel(p));
            textEl.innerHTML = '<i class="bi bi-arrows-collapse"></i> Collapse All';
        } else {
            // Close all, then open only the default ones
            accordion.querySelectorAll('.calc-amort-panel').forEach(p => closePanel(p));
            // Re-open current year and first installment year
            yearKeys.forEach(year => {
                if (year === currentCalYear || year === firstInstallmentYear) {
                    const p = accordion.querySelector(`.calc-amort-panel[data-year="${year}"]`);
                    if (p) openPanel(p);
                }
            });
            textEl.innerHTML = '<i class="bi bi-arrows-expand"></i> View All';
        }
    });
}

function openPanel(panel) {
    panel.classList.add('calc-amort-panel-open');
    const body = panel.querySelector('.calc-amort-panel-body');
    const chevron = panel.querySelector('.calc-amort-chevron');
    const header = panel.querySelector('.calc-amort-panel-header');
    if (body) body.style.display = '';
    if (chevron) { chevron.classList.remove('bi-chevron-right'); chevron.classList.add('bi-chevron-down'); }
    if (header) header.setAttribute('aria-expanded', 'true');
}

function closePanel(panel) {
    panel.classList.remove('calc-amort-panel-open');
    const body = panel.querySelector('.calc-amort-panel-body');
    const chevron = panel.querySelector('.calc-amort-chevron');
    const header = panel.querySelector('.calc-amort-panel-header');
    if (body) body.style.display = 'none';
    if (chevron) { chevron.classList.remove('bi-chevron-down'); chevron.classList.add('bi-chevron-right'); }
    if (header) header.setAttribute('aria-expanded', 'false');
}
