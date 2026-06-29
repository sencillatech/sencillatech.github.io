/**
 * Your Money Power - Financial Advisor Controller
 * Powered by SimpleiTech
 * Pure client-side calculations and advice engine
 */

let allocationChart = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initSlidersLinkage();
    initCalculatorListeners();
    calculateMoneyPower();
});

// Sync range sliders with numeric inputs
function initSlidersLinkage() {
    const linkage = [
        { num: 'salary', range: 'salaryRange' },
        { num: 'otherIncome', range: 'otherIncomeRange' },
        { num: 'savings', range: 'savingsRange' },
        { num: 'fds', range: 'fdsRange' },
        { num: 'mutualFunds', range: 'mutualFundsRange' },
        { num: 'otherInvestments', range: 'otherInvestmentsRange' },
        { num: 'age', range: 'ageRange' },
        { num: 'retAge', range: 'retAgeRange' },
        { num: 'retCorpus', range: 'retCorpusRange' },
        { num: 'carPrice', range: 'carPriceRange' },
        { num: 'carTimeline', range: 'carTimelineRange' },
        { num: 'housePrice', range: 'housePriceRange' },
        { num: 'houseTimeline', range: 'houseTimelineRange' }
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
    if (!labelSpan) return;

    if (id === 'age' || id === 'retAge') {
        labelSpan.textContent = `${val} Yrs`;
    } else if (id === 'carTimeline') {
        labelSpan.textContent = `${val} M`;
    } else if (id === 'houseTimeline') {
        labelSpan.textContent = `${val} Y`;
    } else {
        labelSpan.textContent = formatCurrencyShort(val);
    }
}

// Add event listeners to recalculate in real-time
function initCalculatorListeners() {
    const inputs = [
        'salary', 'salaryRange', 'otherIncome', 'otherIncomeRange',
        'savings', 'savingsRange', 'fds', 'fdsRange',
        'mutualFunds', 'mutualFundsRange', 'otherInvestments', 'otherInvestmentsRange',
        'age', 'ageRange', 'retAge', 'retAgeRange', 'kids', 'parents',
        'retCorpus', 'retCorpusRange',
        'carPrice', 'carPriceRange', 'carTimeline', 'carTimelineRange',
        'housePrice', 'housePriceRange', 'houseTimeline', 'houseTimelineRange'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculateMoneyPower);
        }
    });
}

// Main financial analyst engine
function calculateMoneyPower() {
    // 1. Fetch Inputs
    const salary = parseFloat(document.getElementById('salary').value) || 0;
    const otherIncome = parseFloat(document.getElementById('otherIncome').value) || 0;
    
    const savings = parseFloat(document.getElementById('savings').value) || 0;
    const fds = parseFloat(document.getElementById('fds').value) || 0;
    const mutualFunds = parseFloat(document.getElementById('mutualFunds').value) || 0;
    const otherInvestments = parseFloat(document.getElementById('otherInvestments').value) || 0;

    const age = parseInt(document.getElementById('age').value) || 30;
    const retAge = parseInt(document.getElementById('retAge').value) || 60;
    const kids = parseInt(document.getElementById('kids').value) || 0;
    const parents = document.getElementById('parents').checked;

    const retCorpus = parseFloat(document.getElementById('retCorpus').value) || 50000000;
    
    const carPrice = parseFloat(document.getElementById('carPrice').value) || 1000000;
    const carTimeline = parseInt(document.getElementById('carTimeline').value) || 24;

    const housePrice = parseFloat(document.getElementById('housePrice').value) || 6000000;
    const houseTimeline = parseInt(document.getElementById('houseTimeline').value) || 5;

    // 2. Validate bounds
    if (retAge <= age) {
        showError('Target retirement age must be greater than current age.');
        return;
    }
    clearError();

    // 3. Totals calculations
    const totalIncome = salary + otherIncome;
    const annualIncome = totalIncome * 12;
    const totalAssets = savings + fds + mutualFunds + otherInvestments;
    
    // Set UI header metrics
    document.getElementById('headTotalIncome').textContent = formatCurrency(totalIncome) + '/mo';
    document.getElementById('headTotalAssets').textContent = formatCurrency(totalAssets);

    // 4. Dynamic Budget Allocation (Spend vs Save/Invest)
    // Dynamic adjustment of 50/30/20 rule based on dependents
    let needsPercent = 50 + Math.min(3, kids) * 5 + (parents ? 5 : 0); // Cap kids adjustment at 3
    let wantsPercent = 30 - Math.min(3, kids) * 5 - (parents ? 5 : 0);
    wantsPercent = Math.max(10, wantsPercent); // Wants floor is 10%
    const savingsPercent = 100 - needsPercent - wantsPercent; // Remainder to savings (at least 20%)

    const needsAmount = totalIncome * (needsPercent / 100);
    const wantsAmount = totalIncome * (wantsPercent / 100);
    const savingsAmount = totalIncome * (savingsPercent / 100);
    const maxSpending = needsAmount + wantsAmount;

    // Populate budget cards
    document.getElementById('needsLabel').textContent = `Needs (${needsPercent}%)`;
    document.getElementById('needsVal').textContent = formatCurrency(needsAmount);
    
    document.getElementById('wantsLabel').textContent = `Wants (${wantsPercent}%)`;
    document.getElementById('wantsVal').textContent = formatCurrency(wantsAmount);
    
    document.getElementById('budgetSavingsLabel').textContent = `Save & Invest (${savingsPercent}%)`;
    document.getElementById('budgetSavingsVal').textContent = formatCurrency(savingsAmount);

    document.getElementById('budgetOverviewText').innerHTML = `
        You can spend up to <strong>${formatCurrency(maxSpending)}/mo</strong> on living expenses and lifestyle. 
        We recommend investing at least <strong>${formatCurrency(savingsAmount)}/mo</strong>.
    `;

    // Render budget pie chart
    renderAllocationChart(needsPercent, wantsPercent, savingsPercent);

    // 5. Emergency Cushions Health Check
    const monthlyExpenses = maxSpending;
    const emergencyNeeded = 6 * monthlyExpenses;
    const liquidCash = savings + fds;
    
    const emergencyStatusEl = document.getElementById('emergencyStatus');
    const emergencyAdvisorEl = document.getElementById('emergencyAdvisor');

    if (liquidCash >= emergencyNeeded) {
        emergencyStatusEl.textContent = 'Healthy';
        emergencyStatusEl.className = 'mp-badge badge-success';
        emergencyAdvisorEl.innerHTML = `<p>Your liquid reserves (Savings + FDs) total <strong>${formatCurrency(liquidCash)}</strong>, which covers <strong>${(liquidCash / monthlyExpenses).toFixed(1)} months</strong> of expenses. You have a solid financial safety net.</p>`;
    } else if (liquidCash >= 3 * monthlyExpenses) {
        emergencyStatusEl.textContent = 'Moderate';
        emergencyStatusEl.className = 'mp-badge badge-warning';
        emergencyAdvisorEl.innerHTML = `<p>Your liquid reserves cover <strong>${(liquidCash / monthlyExpenses).toFixed(1)} months</strong> of expenses. We recommend saving an additional <strong>${formatCurrency(emergencyNeeded - liquidCash)}</strong> to secure a full 6-month buffer.</p>`;
    } else {
        emergencyStatusEl.textContent = 'Critical';
        emergencyStatusEl.className = 'mp-badge badge-danger';
        emergencyAdvisorEl.innerHTML = `<p>Caution: Your liquid reserves cover only <strong>${(liquidCash / monthlyExpenses).toFixed(1)} months</strong> of expenses. Prioritize building an emergency fund of at least <strong>${formatCurrency(emergencyNeeded)}</strong> before making other investments.</p>`;
    }

    // 6. Retirement Planning Assessment
    const preYears = retAge - age;
    // Blended compounding rate pre-retirement is 9% (e.g. mix of equity and debt)
    const futureAssets = totalAssets * Math.pow(1 + 0.09, preYears);
    const remainingRetCorpus = Math.max(0, retCorpus - futureAssets);

    let monthlyRetSavingsNeeded = 0;
    if (remainingRetCorpus > 0 && preYears > 0) {
        const rMonthly = 0.10 / 12; // Assume a 10% returns rate on retirement SIP
        const totalMonths = preYears * 12;
        monthlyRetSavingsNeeded = remainingRetCorpus * rMonthly / (Math.pow(1 + rMonthly, totalMonths) - 1);
    }

    const retStatusEl = document.getElementById('retStatus');
    const retAdvisorEl = document.getElementById('retAdvisor');

    if (remainingRetCorpus === 0) {
        retStatusEl.textContent = 'On Track';
        retStatusEl.className = 'mp-badge badge-success';
        retAdvisorEl.innerHTML = `<p>Excellent! Your current assets of <strong>${formatCurrency(totalAssets)}</strong> are projected to grow to <strong>${formatCurrency(futureAssets)}</strong> in ${preYears} years at 9% growth, which exceeds your goal of <strong>${formatCurrency(retCorpus)}</strong> without any further savings.</p>`;
    } else if (savingsAmount >= monthlyRetSavingsNeeded) {
        retStatusEl.textContent = 'On Track';
        retStatusEl.className = 'mp-badge badge-success';
        retAdvisorEl.innerHTML = `<p>Your current assets will grow to <strong>${formatCurrency(futureAssets)}</strong>. To meet your target of <strong>${formatCurrency(retCorpus)}</strong>, you need to save <strong>${formatCurrency(monthlyRetSavingsNeeded)}/mo</strong>. Your budget allows for <strong>${formatCurrency(savingsAmount)}/mo</strong> in savings, meaning you are fully on track!</p>`;
    } else {
        retStatusEl.textContent = 'Needs Attention';
        retStatusEl.className = 'mp-badge badge-warning';
        const gap = monthlyRetSavingsNeeded - savingsAmount;
        retAdvisorEl.innerHTML = `<p>Your current assets will grow to <strong>${formatCurrency(futureAssets)}</strong>. To hit the target, you require <strong>${formatCurrency(monthlyRetSavingsNeeded)}/mo</strong>. Your recommended budget savings are <strong>${formatCurrency(savingsAmount)}/mo</strong>, leaving a **monthly gap of ${formatCurrency(gap)}**. Consider increasing retirement age or saving more from other incomes.</p>`;
    }

    // 7. Car Goal Affordability & Planning
    const maxAffordableCar = 0.5 * annualIncome;
    const maxCarEMI = 0.10 * totalIncome;

    const carStatusEl = document.getElementById('carStatus');
    const carMeterEl = document.getElementById('carMeter');
    const carAdvisorEl = document.getElementById('carAdvisor');

    // Downpayment (20%) and Loan calculation (80%)
    const carDownpayment = 0.20 * carPrice;
    const carLoan = carPrice - carDownpayment;
    
    // To accumulate downpayment in carTimeline months at 6% safe returns (FD/Liquid funds)
    let carDownpaymentSIP = 0;
    if (carTimeline > 0) {
        const rMonthly = 0.06 / 12;
        carDownpaymentSIP = carDownpayment * rMonthly / (Math.pow(1 + rMonthly, carTimeline) - 1);
    }
    // EMI for 5 years (60 months) at 9.5%
    const rCarLoan = 0.095 / 12;
    const carEMI = carLoan * rCarLoan * Math.pow(1 + rCarLoan, 60) / (Math.pow(1 + rCarLoan, 60) - 1);

    // Set car status badges
    let carProgressPct = Math.min(100, (carPrice / maxAffordableCar) * 50); // Scale relative to affordable limit
    let carFillColor = '#27ae60';

    if (carPrice <= maxAffordableCar) {
        carStatusEl.textContent = 'Affordable';
        carStatusEl.className = 'mp-badge badge-success';
        carFillColor = '#27ae60';
    } else if (carPrice <= 0.8 * annualIncome) {
        carStatusEl.textContent = 'Stretch';
        carStatusEl.className = 'mp-badge badge-warning';
        carFillColor = '#f39c12';
    } else {
        carStatusEl.textContent = 'High Risk';
        carStatusEl.className = 'mp-badge badge-danger';
        carFillColor = '#c0392b';
    }

    carMeterEl.style.width = `${carProgressPct}%`;
    carMeterEl.style.backgroundColor = carFillColor;

    carAdvisorEl.innerHTML = `
        <p><strong>Affordability Check:</strong> Your annual income is ${formatCurrency(annualIncome)}. A car worth ${formatCurrency(carPrice)} is considered <strong>${carStatusEl.textContent}</strong>.</p>
        <p><strong>Plan:</strong> Save <strong>${formatCurrency(carDownpaymentSIP)}/month</strong> in FDs or Short-Term Arbitrage Funds for <strong>${carTimeline} months</strong> to reach a 20% down payment of <strong>${formatCurrency(carDownpayment)}</strong>.</p>
        <p>Finance the remaining 80% (<strong>${formatCurrency(carLoan)}</strong>) with a 5-year loan. The estimated monthly EMI is <strong>${formatCurrency(carEMI)}/month</strong> (at 9.5%).</p>
    `;

    // 8. House Goal Affordability & Planning
    const maxAffordableHouse = 4.0 * annualIncome;
    const maxHouseEMI = 0.35 * totalIncome;

    const houseStatusEl = document.getElementById('houseStatus');
    const houseMeterEl = document.getElementById('houseMeter');
    const houseAdvisorEl = document.getElementById('houseAdvisor');

    const houseDownpayment = 0.20 * housePrice;
    const houseLoan = housePrice - houseDownpayment;

    // To accumulate downpayment in houseTimeline years at 11% blended equity returns (SIP in equity mutual funds)
    let houseDownpaymentSIP = 0;
    const houseMonths = houseTimeline * 12;
    if (houseMonths > 0) {
        const rMonthly = 0.11 / 12;
        houseDownpaymentSIP = houseDownpayment * rMonthly / (Math.pow(1 + rMonthly, houseMonths) - 1);
    }
    // EMI for 20 years (240 months) at 8.5%
    const rHouseLoan = 0.085 / 12;
    const houseEMI = houseLoan * rHouseLoan * Math.pow(1 + rHouseLoan, 240) / (Math.pow(1 + rHouseLoan, 240) - 1);

    let houseProgressPct = Math.min(100, (housePrice / maxAffordableHouse) * 50);
    let houseFillColor = '#27ae60';

    if (housePrice <= maxAffordableHouse) {
        houseStatusEl.textContent = 'Affordable';
        houseStatusEl.className = 'mp-badge badge-success';
        houseFillColor = '#27ae60';
    } else if (housePrice <= 6.0 * annualIncome) {
        houseStatusEl.textContent = 'Stretch';
        houseStatusEl.className = 'mp-badge badge-warning';
        houseFillColor = '#f39c12';
    } else {
        houseStatusEl.textContent = 'High Risk';
        houseStatusEl.className = 'mp-badge badge-danger';
        houseFillColor = '#c0392b';
    }

    houseMeterEl.style.width = `${houseProgressPct}%`;
    houseMeterEl.style.backgroundColor = houseFillColor;

    houseAdvisorEl.innerHTML = `
        <p><strong>Affordability Check:</strong> Your annual income is ${formatCurrency(annualIncome)}. A house worth ${formatCurrency(housePrice)} is <strong>${houseStatusEl.textContent}</strong>.</p>
        <p><strong>Plan:</strong> Set up a Mutual Fund Equity SIP of <strong>${formatCurrency(houseDownpaymentSIP)}/month</strong> for <strong>${houseTimeline} years</strong> to reach a 20% down payment of <strong>${formatCurrency(houseDownpayment)}</strong>.</p>
        <p>Finance the remaining 80% (<strong>${formatCurrency(houseLoan)}</strong>) with a 20-year home loan. The estimated monthly EMI is <strong>${formatCurrency(houseEMI)}/month</strong> (at 8.5%).</p>
    `;

    // 9. Checklist & Recommendations Builder
    const stepsListEl = document.getElementById('advisorChecklist');
    stepsListEl.innerHTML = '';

    const recommendations = [];

    // Add Emergency Fund Step
    if (liquidCash < emergencyNeeded) {
        recommendations.push({
            title: `Build Emergency Fund of ${formatCurrency(emergencyNeeded)}`,
            desc: `Allocate your recommended monthly savings of ${formatCurrency(savingsAmount)} to Savings/FD until you reach a 6-month buffer.`
        });
    } else {
        recommendations.push({
            title: `Maintain Emergency Buffer`,
            desc: `Keep ₹${formatCurrencyShort(liquidCash)} untouched in liquid instruments (Savings/FDs) to support your children and family dependents.`
        });
    }

    // Add Retirement Step
    if (remainingRetCorpus > 0) {
        recommendations.push({
            title: `Start Retirement SIP: ${formatCurrency(monthlyRetSavingsNeeded)}/month`,
            desc: `Invest in diversified equity mutual funds to accumulate ₹${formatCurrencyShort(retCorpus)} in ${preYears} years.`
        });
    }

    // Add Car Step
    recommendations.push({
        title: `Car Downpayment Fund: ${formatCurrency(carDownpaymentSIP)}/month`,
        desc: `Invest this amount in short-term safe assets (e.g. FDs, Arbitrage Funds) for ${carTimeline} months.`
    });

    // Add House Step
    recommendations.push({
        title: `House Downpayment Fund: ${formatCurrency(houseDownpaymentSIP)}/month`,
        desc: `Invest this amount in Equity or Hybrid Mutual Funds via SIP for ${houseTimeline} years.`
    });

    // Asset Allocation advice based on standby
    const mfRatio = totalAssets > 0 ? (mutualFunds / totalAssets) * 100 : 0;
    if (mfRatio < 40 && age < 45) {
        recommendations.push({
            title: `Increase Equity Exposure`,
            desc: `You currently have only ${mfRatio.toFixed(0)}% of your portfolio in Mutual Funds/Stocks. We recommend increasing this to 50-60% for long-term growth.`
        });
    }

    recommendations.forEach((rec, idx) => {
        const li = document.createElement('div');
        li.className = 'checklist-item';
        li.innerHTML = `
            <input type="checkbox" id="rec-check-${idx}" class="checklist-checkbox">
            <div class="checklist-content">
                <strong>${rec.title}</strong>
                <span>${rec.desc}</span>
            </div>
        `;
        stepsListEl.appendChild(li);
    });
}

// Chart.js Budget Render
function renderAllocationChart(needs, wants, savings) {
    const ctx = document.getElementById('allocationChart').getContext('2d');

    if (allocationChart) {
        allocationChart.destroy();
    }

    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Needs', 'Wants', 'Save & Invest'],
            datasets: [{
                data: [needs, wants, savings],
                backgroundColor: ['#00275D', '#E29E21', '#007DBF'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#64748b',
                        boxWidth: 12,
                        font: {
                            family: 'Open Sans'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.parsed}%`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Formatting Helpers
function formatCurrency(amount) {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function formatCurrencyShort(amount) {
    const value = Math.round(amount);
    if (value >= 10000000) {
        return '₹' + (value / 10000000).toFixed(2) + ' Cr';
    } else if (value >= 100000) {
        return '₹' + (value / 100000).toFixed(2) + ' L';
    } else if (value >= 1000) {
        return '₹' + (value / 1000).toFixed(0) + ' K';
    }
    return '₹' + value;
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
