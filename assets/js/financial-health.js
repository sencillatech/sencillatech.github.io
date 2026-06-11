/**
 * Financial Health Check - Javascript Logic
 * Powered by SimpleiTech
 * Purely Client-Side Financial Advisor & Report Generator
 */

// Global state variables
let chartInstance = null;
const state = {
    // Spending habits
    monthlyIncome: 0,
    monthlySavings: 0,
    monthlyInvestments: 0,
    
    // Finance summary
    liquidAssets: 0,
    investmentAssets: 0,
    realEstateAssets: 0,
    personalAssets: 0,
    mortgages: 0,
    carLoans: 0,
    personalLoans: 0,
    creditCardDebts: 0,

    // Emergency fund
    emergencyFund: 0,
    monthlyExpenses: 0,

    // Insurance
    hasLifeInsurance: 'no',
    lifeCover: 0,
    hasHealthInsurance: 'no',
    healthCover: 0,

    // Debt
    monthlyEMI: 0,
    hasHighInterestDebt: 'no',

    // Risk Profile (Questionnaire choices 1-5, values are points 1-4)
    riskScore: 0,
    riskAnswers: {
        age: 0,
        horizon: 0,
        reaction: 0,
        goal: 0,
        knowledge: 0
    }
};

// Map tabs to section IDs
const tabMapping = [
    'spending-habit',
    'finance-summary',
    'emergency-fund',
    'insurance',
    'debt',
    'risk-profile',
    'dashboard'
];

let currentTabIdx = 0;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initFormListeners();
    initRiskProfile();
    initNavButtons();
    updateValidationStatus();
});

// Tab Navigation Logic
function initTabs() {
    const tabs = document.querySelectorAll('.health-tab-btn');
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            switchTab(index);
        });
    });
}

function switchTab(index) {
    if (index < 0 || index >= tabMapping.length) return;
    
    // Save current fields before moving
    saveCurrentTabInputs();

    // Remove active from all tabs & sections
    document.querySelectorAll('.health-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.health-section').forEach(sec => sec.classList.remove('active'));

    // Set new active
    document.querySelectorAll('.health-tab-btn')[index].classList.add('active');
    document.getElementById(tabMapping[index]).classList.add('active');
    
    currentTabIdx = index;
    
    // Show/hide navigation buttons
    updateNavButtonsVisibility();

    // Trigger dashboard calculations if switching to dashboard
    if (tabMapping[index] === 'dashboard') {
        calculateAllScores();
    }
    
    // Scroll to top of panel
    document.querySelector('.health-content-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initNavButtons() {
    const prevBtn = document.querySelector('.btn-health-prev');
    const nextBtn = document.querySelector('.btn-health-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentTabIdx > 0) switchTab(currentTabIdx - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentTabIdx < tabMapping.length - 1) {
                switchTab(currentTabIdx + 1);
            }
        });
    }
}

function updateNavButtonsVisibility() {
    const prevBtn = document.querySelector('.btn-health-prev');
    const nextBtn = document.querySelector('.btn-health-next');
    
    if (currentTabIdx === 0) {
        prevBtn.style.visibility = 'hidden';
    } else {
        prevBtn.style.visibility = 'visible';
    }

    if (currentTabIdx === tabMapping.length - 1) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'flex';
        nextBtn.innerHTML = `Next <i class="bx bx-chevron-right"></i>`;
    }
}

// Form Values Sync and Math Links
function initFormListeners() {
    // Realtime field bindings and linkage calculations
    const incomeInput = document.getElementById('input-income');
    const savingsInput = document.getElementById('input-savings');
    const investmentsInput = document.getElementById('input-investments');
    const expensesInput = document.getElementById('input-expenses');

    if (incomeInput) {
        incomeInput.addEventListener('input', () => {
            autoLinkFields();
            updateValidationStatus();
        });
    }
    if (savingsInput) {
        savingsInput.addEventListener('input', () => {
            autoLinkFields();
            updateValidationStatus();
        });
    }
    if (investmentsInput) {
        investmentsInput.addEventListener('input', () => {
            autoLinkFields();
            updateValidationStatus();
        });
    }

    // Auto-link insurance inputs to radio boxes
    const hasLifeRadio = document.getElementsByName('life-insurance-select');
    const lifeCoverGroup = document.getElementById('life-cover-group');
    hasLifeRadio.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.hasLifeInsurance = e.target.value;
            if (state.hasLifeInsurance === 'yes') {
                lifeCoverGroup.style.display = 'block';
            } else {
                lifeCoverGroup.style.display = 'none';
                document.getElementById('input-life-cover').value = 0;
            }
            updateValidationStatus();
        });
    });

    const hasHealthRadio = document.getElementsByName('health-insurance-select');
    const healthCoverGroup = document.getElementById('health-cover-group');
    hasHealthRadio.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.hasHealthInsurance = e.target.value;
            if (state.hasHealthInsurance === 'yes') {
                healthCoverGroup.style.display = 'block';
            } else {
                healthCoverGroup.style.display = 'none';
                document.getElementById('input-health-cover').value = 0;
            }
            updateValidationStatus();
        });
    });

    // Checkbox cards styling
    document.querySelectorAll('.health-checkbox-card').forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        card.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
            if (checkbox.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
            updateValidationStatus();
        });
    });

    // Inputs inside Finance summary to auto-calculate Net Worth visually
    const summaryInputs = [
        'input-liquid-assets', 'input-invest-assets', 'input-property-assets', 'input-personal-assets',
        'input-mortgages', 'input-car-loans', 'input-personal-loans', 'input-credit-cards'
    ];
    summaryInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateNetWorthVisual);
        }
    });

    // Inputs inside other tabs to auto-update validation dots
    const otherInputs = [
        'input-emergency-fund', 'input-expenses', 'input-monthly-emi', 'input-life-cover', 'input-health-cover'
    ];
    otherInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateValidationStatus);
        }
    });
}

function autoLinkFields() {
    const income = parseFloat(document.getElementById('input-income').value) || 0;
    const savings = parseFloat(document.getElementById('input-savings').value) || 0;
    const investments = parseFloat(document.getElementById('input-investments').value) || 0;

    // Default monthly expense = Income - Savings - Investments
    const computedExpenses = Math.max(0, income - savings - investments);
    
    // Auto populate emergency fund expenses if user hasn't edited it manually or it's empty
    const expensesInput = document.getElementById('input-expenses');
    if (expensesInput && (!expensesInput.dataset.userEdited || expensesInput.value === '')) {
        expensesInput.value = computedExpenses.toFixed(0);
    }
}

function updateNetWorthVisual() {
    const liquid = parseFloat(document.getElementById('input-liquid-assets').value) || 0;
    const invest = parseFloat(document.getElementById('input-invest-assets').value) || 0;
    const property = parseFloat(document.getElementById('input-property-assets').value) || 0;
    const personal = parseFloat(document.getElementById('input-personal-assets').value) || 0;
    
    const mortgage = parseFloat(document.getElementById('input-mortgages').value) || 0;
    const car = parseFloat(document.getElementById('input-car-loans').value) || 0;
    const personalLoan = parseFloat(document.getElementById('input-personal-loans').value) || 0;
    const credit = parseFloat(document.getElementById('input-credit-cards').value) || 0;

    const totalAssets = liquid + invest + property + personal;
    const totalLiabilities = mortgage + car + personalLoan + credit;
    const netWorth = totalAssets - totalLiabilities;

    const nwVal = document.getElementById('visual-net-worth');
    if (nwVal) {
        nwVal.textContent = formatCurrency(netWorth);
        if (netWorth < 0) {
            nwVal.style.color = 'var(--health-danger)';
        } else {
            nwVal.style.color = 'var(--health-primary)';
        }
    }
    
    // Auto-update allocation bars
    const assetAlloc = document.getElementById('visual-asset-allocation');
    if (assetAlloc) {
        if (totalAssets > 0) {
            const liquidPct = ((liquid / totalAssets) * 100).toFixed(0);
            const investPct = ((invest / totalAssets) * 100).toFixed(0);
            const propertyPct = (((property + personal) / totalAssets) * 100).toFixed(0);
            
            document.getElementById('bar-liquid-fill').style.width = liquidPct + '%';
            document.getElementById('bar-liquid-val').textContent = liquidPct + '%';
            
            document.getElementById('bar-invest-fill').style.width = investPct + '%';
            document.getElementById('bar-invest-val').textContent = investPct + '%';
            
            document.getElementById('bar-property-fill').style.width = propertyPct + '%';
            document.getElementById('bar-property-val').textContent = propertyPct + '%';
        }
    }
    
    updateValidationStatus();
}

// Risk profile question interactions
function initRiskProfile() {
    const cards = document.querySelectorAll('.risk-question-card');
    cards.forEach(card => {
        const labels = card.querySelectorAll('.risk-option-label');
        labels.forEach(label => {
            const radio = label.querySelector('input[type="radio"]');
            label.addEventListener('click', () => {
                labels.forEach(l => l.classList.remove('selected'));
                label.classList.add('selected');
                radio.checked = true;
                
                // Save directly to answers
                const qName = radio.name;
                const points = parseInt(radio.value) || 0;
                state.riskAnswers[qName] = points;
                updateValidationStatus();
            });
        });
    });
}

// Save inputs of current tab to state
function saveCurrentTabInputs() {
    // Spending Habit
    if (document.getElementById('input-income')) {
        state.monthlyIncome = parseFloat(document.getElementById('input-income').value) || 0;
        state.monthlySavings = parseFloat(document.getElementById('input-savings').value) || 0;
        state.monthlyInvestments = parseFloat(document.getElementById('input-investments').value) || 0;
    }

    // Finance Summary
    if (document.getElementById('input-liquid-assets')) {
        state.liquidAssets = parseFloat(document.getElementById('input-liquid-assets').value) || 0;
        state.investmentAssets = parseFloat(document.getElementById('input-invest-assets').value) || 0;
        state.realEstateAssets = parseFloat(document.getElementById('input-property-assets').value) || 0;
        state.personalAssets = parseFloat(document.getElementById('input-personal-assets').value) || 0;
        state.mortgages = parseFloat(document.getElementById('input-mortgages').value) || 0;
        state.carLoans = parseFloat(document.getElementById('input-car-loans').value) || 0;
        state.personalLoans = parseFloat(document.getElementById('input-personal-loans').value) || 0;
        state.creditCardDebts = parseFloat(document.getElementById('input-credit-cards').value) || 0;
    }

    // Emergency Fund
    if (document.getElementById('input-emergency-fund')) {
        state.emergencyFund = parseFloat(document.getElementById('input-emergency-fund').value) || 0;
        state.monthlyExpenses = parseFloat(document.getElementById('input-expenses').value) || 0;
        // Mark as edited
        document.getElementById('input-expenses').dataset.userEdited = 'true';
    }

    // Insurance
    if (document.getElementById('input-life-cover')) {
        state.lifeCover = parseFloat(document.getElementById('input-life-cover').value) || 0;
        state.healthCover = parseFloat(document.getElementById('input-health-cover').value) || 0;
    }

    // Debt
    if (document.getElementById('input-monthly-emi')) {
        state.monthlyEMI = parseFloat(document.getElementById('input-monthly-emi').value) || 0;
        const toxicRad = document.querySelector('input[name="debt-toxic-select"]:checked');
        state.hasHighInterestDebt = toxicRad ? toxicRad.value : 'no';
    }
}

// Dynamic tab dot status update
function updateValidationStatus() {
    saveCurrentTabInputs();
    
    // Tab 0: Spending habits: Done if income > 0
    setTabStatus(0, state.monthlyIncome > 0);

    // Tab 1: Finance Summary: Done if we have assets or liabilities > 0
    const hasSummary = (state.liquidAssets + state.investmentAssets + state.realEstateAssets + state.personalAssets +
                        state.mortgages + state.carLoans + state.personalLoans + state.creditCardDebts) > 0;
    setTabStatus(1, hasSummary);

    // Tab 2: Emergency fund: Done if monthly expenses > 0
    setTabStatus(2, state.monthlyExpenses > 0);

    // Tab 3: Insurance: Done if hasLife and hasHealth selections are handled
    setTabStatus(3, state.hasLifeInsurance !== '' && state.hasHealthInsurance !== '');

    // Tab 4: Debt: Done if emi input exists (even 0 is valid)
    setTabStatus(4, true);

    // Tab 5: Risk Profile: Done if all 5 questions answered
    const answeredCount = Object.values(state.riskAnswers).filter(val => val > 0).length;
    setTabStatus(5, answeredCount === 5);
}

function setTabStatus(idx, isCompleted) {
    const statuses = document.querySelectorAll('.health-tab-status');
    if (statuses[idx]) {
        statuses[idx].className = 'health-tab-status';
        if (isCompleted) {
            statuses[idx].classList.add('status-completed');
        } else {
            statuses[idx].classList.add('status-incomplete');
        }
    }
}

// Financial scoring algorithms and formulas
function getSpendingScore() {
    if (state.monthlyIncome <= 0) return 0;
    const totalSavings = state.monthlySavings + state.monthlyInvestments;
    const savingsRate = (totalSavings / state.monthlyIncome) * 100;
    
    // Under 10% = Unhealthy, 10-20% = Moderate, 20-30% = Good, 30%+ = Excellent
    if (savingsRate >= 30) return 100;
    if (savingsRate >= 20) return 85;
    if (savingsRate >= 10) return 60;
    return Math.max(0, Math.round(savingsRate * 5)); // Scaled
}

function getFinanceSummaryScore() {
    const totalAssets = state.liquidAssets + state.investmentAssets + state.realEstateAssets + state.personalAssets;
    const totalLiabilities = state.mortgages + state.carLoans + state.personalLoans + state.creditCardDebts;
    
    if (totalAssets === 0) return 0;
    
    const netWorth = totalAssets - totalLiabilities;
    const debtToAsset = totalLiabilities / totalAssets;

    let score = 50; // Neutral start
    
    // Net worth check
    if (netWorth < 0) {
        score -= 20; // Penalize negative net worth
    } else {
        score += 20; // Appreciate positive net worth
    }

    // Debt to asset check
    if (debtToAsset === 0) {
        score += 30; // Debt free
    } else if (debtToAsset < 0.3) {
        score += 20; // Healthy leverage
    } else if (debtToAsset > 0.6) {
        score -= 25; // Highly leveraged
    }

    // Asset diversification (having investments as a healthy proportion of assets)
    const investmentProportion = state.investmentAssets / totalAssets;
    if (investmentProportion >= 0.3) {
        score += 10;
    }

    return Math.min(100, Math.max(0, score));
}

function getEmergencyFundScore() {
    if (state.monthlyExpenses <= 0) return 0;
    const coverage = state.emergencyFund / state.monthlyExpenses;

    // 6+ months is healthy (100)
    // 3-6 months is moderate (70 - 95)
    // < 3 months is dangerous (< 60)
    if (coverage >= 6) return 100;
    if (coverage >= 3) {
        return Math.round(70 + (coverage - 3) * 10);
    }
    return Math.max(0, Math.round(coverage * 20));
}

function getInsuranceScore() {
    let score = 0;
    let counts = 0;

    // Life insurance check
    if (state.hasLifeInsurance === 'yes') {
        counts++;
        const annualIncome = state.monthlyIncome * 12;
        if (annualIncome > 0) {
            const coverageRatio = state.lifeCover / annualIncome;
            if (coverageRatio >= 10) {
                score += 50; // Adequate (10x income)
            } else {
                // partial score
                score += Math.round((coverageRatio / 10) * 40);
            }
        } else {
            score += 35; // Default basic cover if no income listed
        }
    } else if (state.hasLifeInsurance === 'no') {
        // No dependents check, maybe okay if single. But generally, term is good.
    }

    // Health insurance check
    if (state.hasHealthInsurance === 'yes') {
        counts++;
        if (state.healthCover >= 500000 || state.healthCover >= 5000) { // Support Rs/USD scales
            score += 50;
        } else {
            score += 30;
        }
    }

    // If they explicitly answered no to both
    if (counts === 0) return 10;

    return Math.min(100, score);
}

function getDebtScore() {
    if (state.monthlyIncome <= 0) {
        return state.creditCardDebts > 0 || state.personalLoans > 0 ? 30 : 100;
    }
    
    const dti = (state.monthlyEMI / state.monthlyIncome) * 100;
    let score = 100;

    // Deduct for high Debt-to-income
    if (dti > 45) {
        score -= 50;
    } else if (dti > 30) {
        score -= 30;
    } else if (dti > 15) {
        score -= 15;
    }

    // Heavy penalty for toxic credit card/personal high interest debt
    if (state.hasHighInterestDebt === 'yes') {
        score -= 30;
    }

    return Math.max(0, score);
}

function getRiskAlignmentScore() {
    // Calculate total score of risk questionnaire
    const points = Object.values(state.riskAnswers).reduce((sum, val) => sum + val, 0);
    if (points === 0) return 0; // Not answered

    // Determine risk tolerance category
    // Min point = 5, Max = 20
    let profile = 'Balanced';
    if (points <= 8) profile = 'Conservative';
    else if (points <= 12) profile = 'Moderately Conservative';
    else if (points <= 16) profile = 'Balanced';
    else profile = 'Aggressive';

    // Calculate actual asset allocation percentages
    const totalAssets = state.liquidAssets + state.investmentAssets + state.realEstateAssets;
    if (totalAssets === 0) return 100; // No assets to mismatch

    const liquidPct = (state.liquidAssets / totalAssets) * 100;
    const investPct = (state.investmentAssets / totalAssets) * 100;

    // Check misalignment score
    let targetInvest = 40; // Balanced target
    let targetLiquid = 20;

    if (profile === 'Conservative') {
        targetInvest = 15;
        targetLiquid = 45;
    } else if (profile === 'Moderately Conservative') {
        targetInvest = 30;
        targetLiquid = 30;
    } else if (profile === 'Balanced') {
        targetInvest = 50;
        targetLiquid = 15;
    } else if (profile === 'Aggressive') {
        targetInvest = 75;
        targetLiquid = 10;
    }

    const investDiff = Math.abs(investPct - targetInvest);
    const liquidDiff = Math.abs(liquidPct - targetLiquid);
    
    const misalignment = (investDiff + liquidDiff) / 2;
    const score = Math.max(0, Math.min(100, Math.round(100 - misalignment)));

    return score;
}

// Master Dashboard calculations
function calculateAllScores() {
    const scores = {
        spending: getSpendingScore(),
        summary: getFinanceSummaryScore(),
        emergency: getEmergencyFundScore(),
        insurance: getInsuranceScore(),
        debt: getDebtScore(),
        risk: getRiskAlignmentScore()
    };

    // Calculate overall weighted score
    const overallScore = Math.round(
        scores.spending * 0.20 +
        scores.summary * 0.15 +
        scores.emergency * 0.20 +
        scores.insurance * 0.15 +
        scores.debt * 0.15 +
        scores.risk * 0.15
    );

    // Update Overall Score UI
    const scoreText = document.getElementById('overall-score-text');
    const scoreStatus = document.getElementById('overall-score-status');
    
    if (scoreText) scoreText.textContent = overallScore;
    
    if (scoreStatus) {
        if (overallScore >= 80) {
            scoreStatus.textContent = 'Healthy';
            scoreStatus.className = 'dashboard-score-status badge-healthy';
        } else if (overallScore >= 50) {
            scoreStatus.textContent = 'Moderate';
            scoreStatus.className = 'dashboard-score-status badge-moderate';
        } else {
            scoreStatus.textContent = 'Needs Attention';
            scoreStatus.className = 'dashboard-score-status badge-unhealthy';
        }
    }

    // Update individual scores on breakdown cards
    updateCardUI('spending', scores.spending);
    updateCardUI('summary', scores.summary);
    updateCardUI('emergency', scores.emergency);
    updateCardUI('insurance', scores.insurance);
    updateCardUI('debt', scores.debt);
    updateCardUI('risk', scores.risk);

    // Render the radar chart
    renderRadarChart(scores);

    // Generate Dynamic Action Items
    generateActionItems(scores);
}

function updateCardUI(key, score) {
    const label = document.getElementById(`breakdown-${key}-score`);
    const badge = document.getElementById(`breakdown-${key}-badge`);
    
    if (label) label.textContent = `${score}/100`;

    if (badge) {
        badge.className = 'section-score-badge';
        if (score >= 80) {
            badge.textContent = 'Healthy';
            badge.classList.add('badge-healthy');
        } else if (score >= 50) {
            badge.textContent = 'Moderate';
            badge.classList.add('badge-moderate');
        } else {
            badge.textContent = 'Critical';
            badge.classList.add('badge-unhealthy');
        }
    }

    // Render metrics inside cards
    if (key === 'spending') {
        const rate = state.monthlyIncome > 0 ? (((state.monthlySavings + state.monthlyInvestments) / state.monthlyIncome) * 100).toFixed(0) : 0;
        document.getElementById('metric-spending-val').textContent = `${rate}% Savings Rate`;
    } else if (key === 'summary') {
        const netWorth = (state.liquidAssets + state.investmentAssets + state.realEstateAssets + state.personalAssets) -
                         (state.mortgages + state.carLoans + state.personalLoans + state.creditCardDebts);
        document.getElementById('metric-summary-val').textContent = formatCurrency(netWorth);
    } else if (key === 'emergency') {
        const coverage = state.monthlyExpenses > 0 ? (state.emergencyFund / state.monthlyExpenses).toFixed(1) : 0;
        document.getElementById('metric-emergency-val').textContent = `${coverage} Months Expenses`;
    } else if (key === 'insurance') {
        const lifeTxt = state.hasLifeInsurance === 'yes' ? 'Life Protected' : 'No Life Policy';
        const healthTxt = state.hasHealthInsurance === 'yes' ? 'Health Covered' : 'No Health Policy';
        document.getElementById('metric-insurance-val').textContent = `${lifeTxt} | ${healthTxt}`;
    } else if (key === 'debt') {
        const dti = state.monthlyIncome > 0 ? ((state.monthlyEMI / state.monthlyIncome) * 100).toFixed(0) : 0;
        document.getElementById('metric-debt-val').textContent = `${dti}% Debt Service Ratio`;
    } else if (key === 'risk') {
        const points = Object.values(state.riskAnswers).reduce((sum, val) => sum + val, 0);
        let profile = 'Unanswered';
        if (points > 0) {
            if (points <= 8) profile = 'Conservative';
            else if (points <= 12) profile = 'Mod. Conservative';
            else if (points <= 16) profile = 'Balanced';
            else profile = 'Aggressive';
        }
        document.getElementById('metric-risk-val').textContent = `${profile} Profile`;
    }
}

// Chart.js Radar Render
function renderRadarChart(scores) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [
                'Spending Habits',
                'Finance Summary',
                'Emergency Fund',
                'Insurance Cover',
                'Debt Burden',
                'Risk Alignment'
            ],
            datasets: [{
                label: 'Financial Score',
                data: [
                    scores.spending,
                    scores.summary,
                    scores.emergency,
                    scores.insurance,
                    scores.debt,
                    scores.risk
                ],
                backgroundColor: 'rgba(0, 125, 191, 0.2)',
                borderColor: '#007DBF',
                pointBackgroundColor: '#00275D',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#00275D',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(0, 39, 93, 0.1)'
                    },
                    grid: {
                        color: 'rgba(0, 39, 93, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            family: 'Open Sans',
                            size: 11,
                            weight: '600'
                        },
                        color: '#00275D'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20,
                        color: 'rgba(0,39,93,0.5)',
                        backdropColor: 'transparent'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Next Steps recommendation rules
function generateActionItems(scores) {
    const listContainer = document.getElementById('recommendation-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const recs = [];

    // 1. Spending Habits checks
    if (scores.spending < 60) {
        recs.push({
            priority: 'high',
            category: 'spending',
            icon: 'bx-trending-down',
            title: 'Boost Savings Rate',
            desc: `Your savings and investments rate is low at under 10% of your income. Setup automatic transfers on payday.`,
            strategy: 'Use the 50/30/20 Rule: 50% for needs, 30% for wants, and 20% dedicated to savings/investments.'
        });
    } else if (scores.spending < 85) {
        recs.push({
            priority: 'medium',
            category: 'spending',
            icon: 'bx-trending-down',
            title: 'Optimize Monthly Budget',
            desc: `You have a healthy savings level, but there is room to cut discretionary spending and redirect to investments.`,
            strategy: 'Aim for a 30% savings/investment rate to accelerate financial independence.'
        });
    }

    // 2. Emergency Fund checks
    const coverage = state.monthlyExpenses > 0 ? (state.emergencyFund / state.monthlyExpenses) : 0;
    if (coverage < 3) {
        recs.push({
            priority: 'high',
            category: 'emergency',
            icon: 'bx-shield-quarter',
            title: 'Build Basic Emergency Fund',
            desc: `You only have ${coverage.toFixed(1)} months of expense coverage. A minor emergency could force you into high-interest debt.`,
            strategy: 'Target a minimum of 3 months expenses in a liquid high-yield savings account.'
        });
    } else if (coverage < 6) {
        recs.push({
            priority: 'medium',
            category: 'emergency',
            icon: 'bx-shield-quarter',
            title: 'Strengthen Financial Buffer',
            desc: `You have ${coverage.toFixed(1)} months coverage. For complete safety, expand this buffer to handle longer tough times.`,
            strategy: 'Work toward a 6-month buffer. If single-earner, aim for 9 to 12 months.'
        });
    }

    // 3. Debt checks
    const dti = state.monthlyIncome > 0 ? (state.monthlyEMI / state.monthlyIncome) * 100 : 0;
    if (state.hasHighInterestDebt === 'yes') {
        recs.push({
            priority: 'high',
            category: 'debt',
            icon: 'bx-wallet',
            title: 'Eradicate High-Interest Toxic Debt',
            desc: `Credit card debt or high-interest personal loans compound very rapidly and eat away your compound interest gains.`,
            strategy: 'Debt Avalanche Method: Pay minimums on all, and dump every extra dollar into the highest interest debt.'
        });
    }
    if (dti > 35) {
        recs.push({
            priority: 'high',
            category: 'debt',
            icon: 'bx-wallet',
            title: 'De-leverage and Reduce EMI Burden',
            desc: `Your Debt-to-Income is ${dti.toFixed(0)}%, which is heavy. More than a third of your paycheck goes straight to bank EMIs.`,
            strategy: 'Avoid new loans. Consider prepaying principal on your highest interest active loans to lower DTI below 20%.'
        });
    }

    // 4. Insurance checks
    if (state.hasLifeInsurance === 'no') {
        recs.push({
            priority: 'high',
            category: 'insurance',
            icon: 'bx-first-aid',
            title: 'Get Pure Term Life Insurance',
            desc: `You do not have life insurance coverage. If you have dependents, this leaves them financially vulnerable.`,
            strategy: 'Secure a pure Term Life policy covering 10-15x your annual gross income. Avoid premium-back or ULIP products.'
        });
    } else if (state.hasLifeInsurance === 'yes') {
        const annualIncome = state.monthlyIncome * 12;
        const coverageRatio = annualIncome > 0 ? state.lifeCover / annualIncome : 0;
        if (coverageRatio < 10) {
            recs.push({
                priority: 'medium',
                category: 'insurance',
                icon: 'bx-first-aid',
                title: 'Increase Life Insurance Cover',
                desc: `Your life cover is only ${coverageRatio.toFixed(1)}x of your annual income. The standard safe cover is 10x minimum.`,
                strategy: 'Top up your term cover. Keep policies independent of your employment to stay covered during transitions.'
            });
        }
    }
    if (state.hasHealthInsurance === 'no') {
        recs.push({
            priority: 'high',
            category: 'insurance',
            icon: 'bx-heart',
            title: 'Acquire Comprehensive Health Insurance',
            desc: `Medical emergencies are the leading cause of unexpected personal bankruptcy. Relying only on corporate insurance is risky.`,
            strategy: 'Buy a personal family floater health plan covering at least $5,000 / ₹5,000,000 depending on region.'
        });
    }

    // 5. Net worth / Asset allocation
    const totalAssets = state.liquidAssets + state.investmentAssets + state.realEstateAssets;
    const netWorth = totalAssets - (state.mortgages + state.carLoans + state.personalLoans + state.creditCardDebts);
    if (netWorth < 0) {
        recs.push({
            priority: 'high',
            category: 'summary',
            icon: 'bx-line-chart-down',
            title: 'Turn Net Worth Positive',
            desc: `Your liabilities exceed your assets, leaving you with negative net worth. Focus heavily on clearing debt and buying assets.`,
            strategy: 'Allocate any windfalls or bonuses directly into liquid investments or debt prepayments.'
        });
    }
    if (scores.risk < 80 && totalAssets > 0) {
        recs.push({
            priority: 'medium',
            category: 'risk',
            icon: 'bx-shuffle',
            title: 'Rebalance Asset Allocation',
            desc: `Your current distribution of liquid/investment assets does not align with your risk tolerance profile.`,
            strategy: 'Perform annual rebalancing. Move excess cash to index funds or long-term bonds depending on profile.'
        });
    }

    // If everything is healthy!
    if (recs.length === 0) {
        recs.push({
            priority: 'low',
            category: 'general',
            icon: 'bx-badge-check',
            title: 'Superb Financial Health!',
            desc: `You scored excellent across all sections. Keep automated habits in place and continue monitoring.`,
            strategy: 'Consider tax planning, estate legacy planning, and optimizing investment returns.'
        });
    }

    // Render recommendations
    recs.forEach(rec => {
        const item = document.createElement('div');
        item.className = `rec-item priority-${rec.priority}`;
        item.innerHTML = `
            <div class="rec-icon"><i class="bx ${rec.icon}"></i></div>
            <div class="rec-content">
                <div class="rec-title">${rec.title}</div>
                <div class="rec-desc">${rec.desc}</div>
                <div class="rec-strategy"><strong>Strategy:</strong> ${rec.strategy}</div>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// Format currency standard helpers
function formatCurrency(amount) {
    // Detect localization if needed, let's use standard USD/INR friendly dynamic format
    if (Math.abs(amount) > 100000) {
        // If it's a large amount, formatted nicely
        return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// PDF Export function
async function downloadPDFReport() {
    const btn = document.querySelector('.btn-download-report');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Generating Report...`;
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const primaryColor = [0, 39, 93]; // Navy
        const accentColor = [226, 158, 33]; // Gold
        const secondaryColor = [0, 125, 191]; // Blue
        
        // Page 1: Cover and Summary
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 297, 'F');
        
        // Gold accent ribbon
        doc.setFillColor(...accentColor);
        doc.rect(0, 80, 210, 8, 'F');

        // Cover Titles
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(26);
        doc.text('SimpleiTech', 20, 50);
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'normal');
        doc.text('Simplify your work with Technology.', 20, 60);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(32);
        doc.text('PERSONAL FINANCIAL', 20, 120);
        doc.text('HEALTH REPORT', 20, 134);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(230, 230, 230);
        doc.text('A comprehensive client-side financial audit analysis.', 20, 150);

        // Score Card on Cover Page
        const overallScore = document.getElementById('overall-score-text').textContent || '0';
        const overallStatus = document.getElementById('overall-score-status').textContent || 'Unhealthy';
        
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(20, 175, 170, 75, 4, 4, 'F');

        doc.setTextColor(...primaryColor);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('OVERALL HEALTH SCORE', 35, 195);
        
        doc.setFontSize(60);
        doc.setTextColor(...primaryColor);
        doc.text(overallScore, 35, 245);
        doc.setFontSize(18);
        doc.setTextColor(...accentColor);
        doc.text('/ 100', 115, 245);

        // Draw Status text
        doc.setFontSize(18);
        doc.setTextColor(...secondaryColor);
        doc.setFont('Helvetica', 'bold');
        doc.text(`Status: ${overallStatus}`, 115, 205);
        
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 115, 220);
        doc.text('Private & Locally Calculated', 115, 227);

        // Add Radar Chart to cover page
        if (chartInstance) {
            const chartImg = chartInstance.toBase64Image();
            // We can add it on Page 2
        }

        // Add Page 2: Detailed Breakdown
        doc.addPage();
        
        // Header bar
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('Helvetica', 'bold');
        doc.text('FINANCIAL HEALTH SECTION BREAKDOWN', 15, 13);
        
        // Print sections detailed metrics
        let yPos = 35;

        // Helper to print section header
        const printSecHeader = (title, score) => {
            doc.setFillColor(245, 247, 252);
            doc.rect(15, yPos - 5, 180, 8, 'F');
            doc.setTextColor(...primaryColor);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(title, 20, yPos);
            doc.setTextColor(...secondaryColor);
            doc.text(`Score: ${score}/100`, 160, yPos);
            yPos += 8;
        };

        // Helper for key-value outputs
        const printKV = (label, val) => {
            doc.setTextColor(80, 80, 80);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(label, 20, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFont('Helvetica', 'bold');
            doc.text(val, 80, yPos);
            yPos += 5;
        };

        // 1. Spending
        printSecHeader('1. Spending & Habit Analysis', getSpendingScore());
        printKV('Monthly Income:', formatCurrency(state.monthlyIncome));
        printKV('Monthly Savings:', formatCurrency(state.monthlySavings));
        printKV('Monthly Investments:', formatCurrency(state.monthlyInvestments));
        const totalSavings = state.monthlySavings + state.monthlyInvestments;
        const savingsRate = state.monthlyIncome > 0 ? ((totalSavings / state.monthlyIncome) * 100).toFixed(1) : '0';
        printKV('Savings & Investment Rate:', `${savingsRate}% of income`);
        yPos += 5;

        // 2. Net worth summary
        printSecHeader('2. Net Worth & Capital Assets', getFinanceSummaryScore());
        const totalAssets = state.liquidAssets + state.investmentAssets + state.realEstateAssets + state.personalAssets;
        const totalLiabilities = state.mortgages + state.carLoans + state.personalLoans + state.creditCardDebts;
        const netWorth = totalAssets - totalLiabilities;
        printKV('Total Liquid Assets:', formatCurrency(state.liquidAssets));
        printKV('Total Long-term Investments:', formatCurrency(state.investmentAssets));
        printKV('Total Assets (Real Estate & Personal):', formatCurrency(state.realEstateAssets + state.personalAssets));
        printKV('Total Active Liabilities:', formatCurrency(totalLiabilities));
        printKV('Net Worth Estimate:', formatCurrency(netWorth));
        yPos += 5;

        // 3. Emergency Fund
        printSecHeader('3. Emergency Preparedness', getEmergencyFundScore());
        printKV('Current Emergency Buffer:', formatCurrency(state.emergencyFund));
        printKV('Monthly Expenses:', formatCurrency(state.monthlyExpenses));
        const coverage = state.monthlyExpenses > 0 ? (state.emergencyFund / state.monthlyExpenses).toFixed(1) : '0';
        printKV('Buffer Coverage:', `${coverage} Months Expenses`);
        yPos += 5;

        // 4. Insurance
        printSecHeader('4. Insurance Coverage Adequacy', getInsuranceScore());
        printKV('Life Insurance Plan:', state.hasLifeInsurance.toUpperCase());
        if (state.hasLifeInsurance === 'yes') {
            printKV('Life Cover Benefit Amount:', formatCurrency(state.lifeCover));
        }
        printKV('Health Insurance Plan:', state.hasHealthInsurance.toUpperCase());
        if (state.hasHealthInsurance === 'yes') {
            printKV('Health Cover Benefit Amount:', formatCurrency(state.healthCover));
        }
        yPos += 5;

        // 5. Debt Burden
        printSecHeader('5. Debt Service & EMI Load', getDebtScore());
        printKV('Monthly EMIs/Repayments:', formatCurrency(state.monthlyEMI));
        printKV('High Interest toxic debt:', state.hasHighInterestDebt.toUpperCase());
        const dti = state.monthlyIncome > 0 ? ((state.monthlyEMI / state.monthlyIncome) * 100).toFixed(1) : '0';
        printKV('Debt Service Ratio (DSR):', `${dti}% of income`);

        // Check if chart exists to embed on bottom of page 2
        if (chartInstance) {
            const chartImg = chartInstance.toBase64Image();
            // Centered bottom page 2
            doc.addImage(chartImg, 'PNG', 55, 205, 90, 80);
        }

        // Page 3: Recommendations & Strategy
        doc.addPage();
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('Helvetica', 'bold');
        doc.text('STRATEGIES, BEST PRACTICES & ACTION STEPS', 15, 13);

        // Loop over recommendations and print them in PDF
        yPos = 35;
        const listItems = document.getElementById('recommendation-list').querySelectorAll('.rec-item');
        
        doc.setTextColor(...primaryColor);
        doc.setFontSize(13);
        doc.setFont('Helvetica', 'bold');
        doc.text('Tailored Priority Checklist:', 15, yPos);
        yPos += 10;

        if (listItems.length > 0) {
            listItems.forEach((item, idx) => {
                const title = item.querySelector('.rec-title').textContent || '';
                const desc = item.querySelector('.rec-desc').textContent || '';
                const strat = item.querySelector('.rec-strategy').textContent || '';

                if (yPos > 260) {
                    doc.addPage();
                    yPos = 25;
                }

                // Dot bullet
                doc.setFillColor(...secondaryColor);
                doc.circle(18, yPos - 1.5, 1.5, 'F');
                
                doc.setTextColor(...primaryColor);
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(10.5);
                doc.text(title, 24, yPos);
                yPos += 5;

                doc.setTextColor(50, 50, 50);
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(9);
                
                // Wrap long description text
                const splitDesc = doc.splitTextToSize(desc, 170);
                doc.text(splitDesc, 24, yPos);
                yPos += (splitDesc.length * 4.5);

                doc.setTextColor(100, 100, 100);
                doc.setFont('Helvetica', 'oblique');
                doc.setFontSize(8.5);
                const splitStrat = doc.splitTextToSize(strat, 170);
                doc.text(splitStrat, 24, yPos);
                yPos += (splitStrat.length * 4) + 6;
            });
        }

        // Add standard footer to all pages (except cover)
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 2; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(220, 220, 220);
            doc.line(15, 282, 195, 282);
            doc.setTextColor(120, 120, 120);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('SimpleiTech Financial Health Audit', 15, 287);
            doc.text(`Page ${i} of ${totalPages}`, 180, 287);
        }

        doc.save('Financial_Health_Audit_Report.pdf');
    } catch (e) {
        console.error('Error generating PDF report:', e);
        alert('Failed to generate PDF. Make sure jsPDF is loaded correctly.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
