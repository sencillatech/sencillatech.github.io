/**
 * Retirement Calculator - JavaScript Controller
 * Powered by SimpleiTech
 * Client-Side Calculator & Balance Depletion Simulator
 */

let simulationChart = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initSlidersLinkage();
    initCalculatorListeners();
    calculateRetirement();
});

// Sync range sliders with numeric inputs
function initSlidersLinkage() {
    const linkage = [
        { num: 'currentAge', range: 'currentAgeRange' },
        { num: 'retirementAge', range: 'retirementAgeRange' },
        { num: 'lifeExpectancy', range: 'lifeExpectancyRange' },
        { num: 'inflation', range: 'inflationRange' },
        { num: 'preReturn', range: 'preReturnRange' },
        { num: 'postReturn', range: 'postReturnRange' }
    ];

    linkage.forEach(item => {
        const numInput = document.getElementById(item.num);
        const rangeInput = document.getElementById(item.range);

        if (numInput && rangeInput) {
            numInput.addEventListener('input', () => {
                rangeInput.value = numInput.value;
                syncLabel(item.num, numInput.value);
            });

            rangeInput.addEventListener('input', () => {
                numInput.value = rangeInput.value;
                syncLabel(item.num, rangeInput.value);
            });
        }
    });
}

function syncLabel(id, val) {
    const labelSpan = document.getElementById(`${id}Val`);
    if (labelSpan) {
        if (id === 'inflation' || id === 'preReturn' || id === 'postReturn') {
            labelSpan.textContent = `${val}%`;
        } else {
            labelSpan.textContent = `${val} Yrs`;
        }
    }
}

// Add event listeners to inputs to recalculate in real-time
function initCalculatorListeners() {
    const inputs = [
        'currentAge', 'retirementAge', 'lifeExpectancy',
        'inflation', 'preReturn', 'postReturn',
        'currentExpenses', 'currentSavings',
        'simCorpus', 'simWithdrawal', 'simReturn', 'simAdjustInflation'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                if (id === 'simCorpus' || id === 'simWithdrawal' || id === 'simReturn' || id === 'simAdjustInflation') {
                    // If user manually changed simulator inputs, only recalculate simulator
                    calculateSimulatorOnly();
                } else {
                    // Recalculate everything
                    calculateRetirement();
                }
            });
        }
    });
}

// Main calculation manager
function calculateRetirement() {
    // 1. Fetch main inputs
    const currentAge = parseInt(document.getElementById('currentAge').value) || 0;
    const retirementAge = parseInt(document.getElementById('retirementAge').value) || 0;
    const lifeExpectancy = parseInt(document.getElementById('lifeExpectancy').value) || 0;
    const inflation = parseFloat(document.getElementById('inflation').value) || 0;
    const preReturn = parseFloat(document.getElementById('preReturn').value) || 0;
    const postReturn = parseFloat(document.getElementById('postReturn').value) || 0;
    const currentExpenses = parseFloat(document.getElementById('currentExpenses').value) || 0;
    const currentSavings = parseFloat(document.getElementById('currentSavings').value) || 0;

    // Boundary constraints
    if (retirementAge <= currentAge) {
        showError('Retirement age must be greater than current age.');
        return;
    }
    if (lifeExpectancy <= retirementAge) {
        showError('Life expectancy must be greater than retirement age.');
        return;
    }
    clearError();

    const preYears = retirementAge - currentAge;
    const postYears = lifeExpectancy - retirementAge;

    // 2. Calculate inflation-adjusted expenses at retirement age
    const expensesAtRetirement = currentExpenses * Math.pow(1 + inflation / 100, preYears);
    document.getElementById('outExpensesRetirement').textContent = formatCurrency(expensesAtRetirement);

    // 3. Calculate retirement corpus needed
    // Real rate of return in retirement
    const rReal = ((1 + postReturn / 100) / (1 + inflation / 100)) - 1;
    let corpusNeeded = 0;
    if (rReal === 0) {
        corpusNeeded = expensesAtRetirement * postYears;
    } else {
        corpusNeeded = expensesAtRetirement * (1 - Math.pow(1 + rReal, -postYears)) / rReal;
    }
    
    // Adjust for first year withdrawal occurring at the beginning of retirement
    corpusNeeded = corpusNeeded * (1 + rReal); // Annuity due adjustment
    document.getElementById('outCorpusNeeded').textContent = formatCurrency(corpusNeeded);

    // 4. Calculate monthly savings required
    // Future value of current savings at preReturn rate
    const savingsFV = currentSavings * Math.pow(1 + preReturn / 100, preYears);
    const remainingCorpus = Math.max(0, corpusNeeded - savingsFV);

    let monthlySavingsNeeded = 0;
    if (remainingCorpus > 0 && preYears > 0) {
        const rMonthly = (preReturn / 100) / 12;
        const totalMonths = preYears * 12;
        monthlySavingsNeeded = remainingCorpus * rMonthly / (Math.pow(1 + rMonthly, totalMonths) - 1);
    }
    document.getElementById('outMonthlySavings').textContent = formatCurrency(monthlySavingsNeeded);

    // 5. Populate simulator defaults if inputs aren't active/edited
    const simCorpus = document.getElementById('simCorpus');
    const simWithdrawal = document.getElementById('simWithdrawal');
    const simReturn = document.getElementById('simReturn');

    if (simCorpus && !simCorpus.dataset.userEdited) {
        simCorpus.value = Math.round(corpusNeeded);
    }
    if (simWithdrawal && !simWithdrawal.dataset.userEdited) {
        simWithdrawal.value = Math.round(expensesAtRetirement / 12);
    }
    if (simReturn && !simReturn.dataset.userEdited) {
        simReturn.value = postReturn;
    }

    // Set datasets to track user edits
    [simCorpus, simWithdrawal, simReturn].forEach(el => {
        if (el) {
            el.addEventListener('focus', () => el.dataset.userEdited = 'true');
        }
    });

    // 6. Run Simulator calculations & graph plotting
    runDepletionSimulator();
}

// Calculate simulator only (for when user manually changes values inside the simulator cards)
function calculateSimulatorOnly() {
    runDepletionSimulator();
}

// Balance depletion simulation and rendering
function runDepletionSimulator() {
    const simCorpus = parseFloat(document.getElementById('simCorpus').value) || 0;
    const simWithdrawal = parseFloat(document.getElementById('simWithdrawal').value) || 0;
    const simReturn = parseFloat(document.getElementById('simReturn').value) || 0;
    const adjustInflation = document.getElementById('simAdjustInflation').checked;
    
    // Grab inflation rate from main inputs
    const inflation = parseFloat(document.getElementById('inflation').value) || 0;
    const retirementAge = parseInt(document.getElementById('retirementAge').value) || 60;

    let balance = simCorpus;
    let monthlyWithdrawal = simWithdrawal;
    const rMonthly = (simReturn / 100) / 12;
    
    const maxMonths = 100 * 12; // Cap simulation at 100 years post-retirement
    let monthCount = 0;

    const dataPoints = [];
    const labels = [];

    // Add starting point
    dataPoints.push(Math.round(balance));
    labels.push(`Age ${retirementAge}`);

    while (balance > 0 && monthCount < maxMonths) {
        monthCount++;
        
        // Year check to adjust monthly withdrawals for inflation (once a year)
        if (adjustInflation && monthCount % 12 === 1 && monthCount > 1) {
            monthlyWithdrawal = monthlyWithdrawal * (1 + inflation / 100);
        }

        // Add monthly interest
        const interest = balance * rMonthly;
        balance = balance + interest - monthlyWithdrawal;

        // Record yearly data points (or last point if depleted)
        if (monthCount % 12 === 0 || balance <= 0) {
            const age = retirementAge + Math.ceil(monthCount / 12);
            dataPoints.push(Math.max(0, Math.round(balance)));
            labels.push(`Age ${age}`);
        }
    }

    // Update depletion status text
    const statusBox = document.getElementById('simStatusBox');
    const yearsLasted = Math.floor(monthCount / 12);
    const monthsLasted = monthCount % 12;

    if (balance > 0 && monthCount >= maxMonths) {
        statusBox.textContent = `Your money will last indefinitely (100+ years). You have a sustainable withdrawal rate!`;
        statusBox.className = 'simulator-status status-lasts';
    } else {
        const ageDepleted = retirementAge + yearsLasted;
        let timeStr = '';
        if (yearsLasted > 0) timeStr += `${yearsLasted} years `;
        if (monthsLasted > 0) timeStr += `and ${monthsLasted} months `;
        
        statusBox.textContent = `Your retirement funds will last for ${timeStr.trim()} (depleted at Age ${ageDepleted}).`;
        statusBox.className = 'simulator-status status-depletes';
    }

    // Render/update Chart.js line graph
    plotSimulationChart(labels, dataPoints);
}

// Chart.js plotting
function plotSimulationChart(labels, data) {
    const ctx = document.getElementById('depletionChart').getContext('2d');
    
    if (simulationChart) {
        simulationChart.destroy();
    }

    simulationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Retirement Account Balance',
                data: data,
                borderColor: '#007DBF',
                backgroundColor: 'rgba(0, 125, 191, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#00275D',
                pointBorderColor: '#fff',
                pointHoverRadius: 6,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return formatCurrencyShort(value);
                        },
                        color: '#64748b'
                    },
                    grid: {
                        color: 'rgba(0, 39, 93, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        color: '#64748b',
                        maxTicksLimit: 12
                    },
                    grid: {
                        color: 'rgba(0, 39, 93, 0.05)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Balance: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            }
        }
    });
}

// Formatting Helper functions
function formatCurrency(amount) {
    // India specific Lakh/Crore format check (Sencillatech is Indian-centric tool provider)
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function formatCurrencyShort(amount) {
    if (amount >= 10000000) {
        return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
    } else if (amount >= 100000) {
        return '₹' + (amount / 100000).toFixed(2) + ' L';
    } else if (amount >= 1000) {
        return '₹' + (amount / 1000).toFixed(0) + ' K';
    }
    return '₹' + amount;
}

// Alert utilities
function showError(msg) {
    const errorEl = document.getElementById('calcErrorAlert');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
}

function clearError() {
    const errorEl = document.getElementById('calcErrorAlert');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}
