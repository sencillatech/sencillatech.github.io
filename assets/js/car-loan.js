// === Car Loan EMI Calculator (Sencillatech Themed) ===

const elLoanAmount = document.getElementById('loanAmount');
const elInterestRate = document.getElementById('interestRate');
const elLoanTenureYears = document.getElementById('loanTenureYears');

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
    balance: '#00275D'
};

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(val));

document.getElementById('currentYear').textContent = new Date().getFullYear();

[elLoanAmount, elInterestRate, elLoanTenureYears].forEach(el => {
    el.addEventListener('input', calculateEMI);
});

document.getElementById('calculator-options').addEventListener('change', function() {
    if (this.value === 'home-loan') {
        window.location.href = 'fintech-calculator.html';
    } else if (this.value === 'personal-loan') {
        window.location.href = 'personal-loan-calculator.html';
    } else if (this.value === 'mutual-fund') {
        window.location.href = 'mutual-fund-calculator.html';
    }
});

function calculateEMI() {
    const P = parseFloat(elLoanAmount.value) || 0;
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

    for (let month = 1; month <= N && balance > 0; month++) {
        let interestForMonth = balance * r;
        let principalForMonth = EMI - interestForMonth;
        
        if (balance < principalForMonth) {
            principalForMonth = balance;
        }
        
        balance -= principalForMonth;
        if(balance < 0) balance = 0;
        
        totalInterest += interestForMonth;

        schedule.push({
            month,
            principal: principalForMonth,
            interest: interestForMonth,
            totalPayment: principalForMonth + interestForMonth,
            balance
        });

        yearlyPrincipal += principalForMonth;
        yearlyInterest += interestForMonth;

        if (month % 12 === 0 || balance <= 0) {
            yearlyData.push({
                year: currentYear,
                principal: yearlyPrincipal,
                interest: yearlyInterest,
                balance: balance
            });
            currentYear++;
            yearlyPrincipal = 0;
            yearlyInterest = 0;
        }
    }

    const totalPayment = P + totalInterest;
    updateUI(EMI, totalInterest, totalPayment, schedule, yearlyData, P);
}

function updateUI(emi, totalInterest, totalPayment, schedule, yearlyData, principal) {
    elMonthlyEmiVal.textContent = formatCurrency(emi);
    elTotalInterestVal.textContent = formatCurrency(totalInterest);
    elTotalPaymentVal.textContent = formatCurrency(totalPayment);

    renderPieChart(principal, totalInterest);
    renderBarChart(yearlyData);

    tableBody.innerHTML = '';
    
    // Render accordion-style amortization table
    const scheduleSection = document.querySelector('.calc-schedule');
    renderAmortizationAccordion(scheduleSection, schedule, formatCurrency, false, THEME);
}

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
            plugins: { legend: { position: 'bottom' } },
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
                    label: 'Principal',
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
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { stacked: true },
                y: { stacked: true, title: { display: true, text: 'Amount Paid (₹)' } },
                y1: { position: 'right', title: { display: true, text: 'Balance (₹)' }, grid: { drawOnChartArea: false } }
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

calculateEMI();
