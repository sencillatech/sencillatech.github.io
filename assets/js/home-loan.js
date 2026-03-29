// === Home Loan EMI Calculator (Sencillatech Themed) ===

// --- Elements ---
const elHomeValue = document.getElementById('homeValue');
const elMargin = document.getElementById('margin');
const elMarginRange = document.getElementById('marginRange');
const elLoanAmount = document.getElementById('loanAmount');
const elInterestRate = document.getElementById('interestRate');
const elInterestRateRange = document.getElementById('interestRateRange');
const elLoanTenureYears = document.getElementById('loanTenureYears');
const elLoanTenureRange = document.getElementById('loanTenureRange');
const elLoanInsurance = document.getElementById('loanInsurance');
const elProcessingFee = document.getElementById('processingFee');

const elPrepaymentAmount = document.getElementById('prepaymentAmount');
const elPrepaymentFrequency = document.getElementById('prepaymentFrequency');
const elPrepaymentStartMonth = document.getElementById('prepaymentStartMonth');

const elMonthlyEmiVal = document.getElementById('monthlyEmiVal');
const elTotalInterestVal = document.getElementById('totalInterestVal');
const elTotalPaymentVal = document.getElementById('totalPaymentVal');

const tableBody = document.querySelector('#amortizationTable tbody');

let pieChartInstance = null;
let barChartInstance = null;

// Theme colors
const THEME = {
    principal: '#007DBF',
    interest: '#E29E21',
    balance: '#00275D',
    prepayment: '#28a745'
};

// --- Formatters ---
const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(val));

// --- Initialization ---
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Handle range/input sync
function syncInputAndRange(inputEl, rangeEl) {
    inputEl.addEventListener('input', () => {
        rangeEl.value = inputEl.value;
        calculateEMI();
    });
    rangeEl.addEventListener('input', () => {
        inputEl.value = rangeEl.value;
        calculateEMI();
    });
}
syncInputAndRange(elMargin, elMarginRange);
syncInputAndRange(elInterestRate, elInterestRateRange);
syncInputAndRange(elLoanTenureYears, elLoanTenureRange);

// Add event listeners tracking other changes
[elHomeValue, elLoanInsurance, elProcessingFee, elPrepaymentAmount, elPrepaymentFrequency, elPrepaymentStartMonth].forEach(el => {
    el.addEventListener('input', calculateEMI);
});

// --- Main Calculation Logic ---
function calculateEMI() {
    const homeVal = parseFloat(elHomeValue.value) || 0;
    const marginPct = parseFloat(elMargin.value) || 0;
    const loanIns = parseFloat(elLoanInsurance.value) || 0;
    const prepayAmount = parseFloat(elPrepaymentAmount.value) || 0;
    const prepayFreq = elPrepaymentFrequency.value;
    const prepayStart = parseInt(elPrepaymentStartMonth.value) || 1;
    
    const downPayment = homeVal * (marginPct / 100);
    const principalInitial = homeVal + loanIns - downPayment;
    elLoanAmount.value = Math.max(0, principalInitial).toFixed(0);
    
    const P = Math.max(0, principalInitial);
    const R_annual = parseFloat(elInterestRate.value) || 0;
    const r = (R_annual / 12) / 100;
    const N = (parseInt(elLoanTenureYears.value) || 0) * 12;

    if (P <= 0 || R_annual <= 0 || N <= 0) {
        updateUI(0, 0, 0, [], [], 0);
        return;
    }

    const EMI = P * r * (Math.pow(1 + r, N) / (Math.pow(1 + r, N) - 1));
    
    let balance = P;
    let totalInterest = 0;
    let schedule = [];
    let yearlyData = [];
    
    let currentYear = 1;
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    let yearlyPrepayment = 0;

    for (let month = 1; month <= N && balance > 0; month++) {
        let interestForMonth = balance * r;
        let principalForMonth = EMI - interestForMonth;
        
        let currentPrepayment = 0;
        if (prepayAmount > 0 && month >= prepayStart) {
            if (prepayFreq === 'monthly') currentPrepayment = prepayAmount;
            else if (prepayFreq === 'yearly' && (month - prepayStart) % 12 === 0) currentPrepayment = prepayAmount;
            else if (prepayFreq === 'one-time' && month === prepayStart) currentPrepayment = prepayAmount;
        }

        let totalPaymentThisMonth = EMI + currentPrepayment;
        if (balance < principalForMonth + currentPrepayment) {
            principalForMonth = balance;
            currentPrepayment = 0;
            totalPaymentThisMonth = principalForMonth + interestForMonth;
        }
        
        let actualPrincipalPaid = principalForMonth + currentPrepayment;
        balance -= actualPrincipalPaid;
        if(balance < 0) balance = 0;
        
        totalInterest += interestForMonth;

        schedule.push({
            month,
            principal: principalForMonth,
            interest: interestForMonth,
            prepayment: currentPrepayment,
            totalPayment: totalPaymentThisMonth,
            balance
        });

        yearlyPrincipal += principalForMonth;
        yearlyInterest += interestForMonth;
        yearlyPrepayment += currentPrepayment;

        if (month % 12 === 0 || balance <= 0) {
            yearlyData.push({
                year: currentYear,
                principal: yearlyPrincipal + yearlyPrepayment,
                interest: yearlyInterest,
                balance: balance
            });
            currentYear++;
            yearlyPrincipal = 0;
            yearlyInterest = 0;
            yearlyPrepayment = 0;
        }
    }

    const fees = P * ((parseFloat(elProcessingFee.value) || 0) / 100);
    const totalPayment = P + totalInterest + fees;

    updateUI(EMI, totalInterest, totalPayment, schedule, yearlyData, P);
}

// --- Update UI ---
function updateUI(emi, totalInterest, totalPayment, schedule, yearlyData, principal) {
    elMonthlyEmiVal.textContent = formatCurrency(emi);
    elTotalInterestVal.textContent = formatCurrency(totalInterest);
    elTotalPaymentVal.textContent = formatCurrency(totalPayment);

    renderPieChart(principal, totalInterest);
    renderBarChart(yearlyData);

    tableBody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    schedule.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.month}</td>
            <td>${formatCurrency(row.principal)}</td>
            <td>${formatCurrency(row.interest)}</td>
            <td style="color:${THEME.prepayment}">${row.prepayment > 0 ? formatCurrency(row.prepayment) : '-'}</td>
            <td>${formatCurrency(row.totalPayment)}</td>
            <td>${formatCurrency(row.balance)}</td>
        `;
        fragment.appendChild(tr);
    });
    tableBody.appendChild(fragment);
}

// --- Charts Rendering ---
function renderPieChart(principal, interest) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    if (pieChartInstance) pieChartInstance.destroy();
    
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Principal Loan Amount', 'Total Interest'],
            datasets: [{
                data: [principal, interest],
                backgroundColor: [THEME.principal, THEME.interest],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%'
        }
    });
}

function renderBarChart(yearlyData) {
    const ctx = document.getElementById('barChart').getContext('2d');
    
    if (barChartInstance) barChartInstance.destroy();
    
    const labels = yearlyData.map(d => `Year ${d.year}`);
    const principalData = yearlyData.map(d => d.principal);
    const interestData = yearlyData.map(d => d.interest);
    const balanceData = yearlyData.map(d => d.balance);

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Principal (+Prepayment)',
                    data: principalData,
                    backgroundColor: THEME.principal,
                    stack: 'Stack 0',
                },
                {
                    label: 'Interest',
                    data: interestData,
                    backgroundColor: THEME.interest,
                    stack: 'Stack 0',
                },
                {
                    label: 'Balance Remaining',
                    data: balanceData,
                    type: 'line',
                    borderColor: THEME.balance,
                    borderWidth: 2,
                    fill: false,
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: { stacked: true },
                y: { 
                    stacked: true, 
                    title: { display: true, text: 'Amount Paid (₹)' }
                },
                y1: {
                    position: 'right',
                    title: { display: true, text: 'Balance (₹)' },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Initial calculation
calculateEMI();

// Calculator navigation
document.getElementById('calculator-options').addEventListener('change', function() {
    if (this.value === 'personal-loan') {
        window.location.href = 'personal-loan-calculator.html';
    } else if (this.value === 'home-loan') {
        window.location.href = 'fintech-calculator.html';
    } else if (this.value === 'car-loan') {
        window.location.href = 'car-loan-calculator.html';
    } else if (this.value === 'mutual-fund') {
        window.location.href = 'mutual-fund-calculator.html';
    }
});
