// === Mutual Fund SIP & Lumpsum Calculator (Sencillatech Themed) ===

document.addEventListener("DOMContentLoaded", function () {
    // --- Elements ---
    const elTabSIP = document.getElementById('tabSIP');
    const elTabLumpsum = document.getElementById('tabLumpsum');

    const elAmount = document.getElementById('amount');
    const elAmountRange = document.getElementById('amountRange');
    const elAmountLabel = document.getElementById('amountLabel');

    const elReturnRate = document.getElementById('returnRate');
    const elReturnRateRange = document.getElementById('returnRateRange');

    const elTenure = document.getElementById('tenure');
    const elTenureRange = document.getElementById('tenureRange');

    // Advanced fields
    const elStepUpEnabled = document.getElementById('stepUpEnabled');
    const elStepUpSection = document.getElementById('stepUpSection');
    const elStepUpFields = document.getElementById('stepUpFields');
    const elStepUpType = document.getElementById('stepUpType');
    const elStepUpValue = document.getElementById('stepUpValue');

    const elStayInvestedEnabled = document.getElementById('stayInvestedEnabled');
    const elStayInvestedFields = document.getElementById('stayInvestedFields');
    const elStayInvestedYears = document.getElementById('stayInvestedYears');
    const elStayInvestedYearsRange = document.getElementById('stayInvestedYearsRange');

    const elInflationEnabled = document.getElementById('inflationEnabled');
    const elTaxEnabled = document.getElementById('taxEnabled');

    // Results elements
    const elTotalInvestedVal = document.getElementById('totalInvestedVal');
    const elTotalReturnsVal = document.getElementById('totalReturnsVal');
    const elTotalReturnsLabel = document.getElementById('totalReturnsLabel');
    const elMaturityVal = document.getElementById('maturityVal');

    const elInflationSection = document.getElementById('inflationSection');
    const elPurchasingPowerVal = document.getElementById('purchasingPowerVal');

    const elCagrVal = document.getElementById('cagrVal');
    const tableBody = document.querySelector('#growthTable tbody');

    let investmentType = 'SIP'; // 'SIP' or 'LUMPSUM'
    let pieChartInstance = null;
    let lineChartInstance = null;

    // Theme colors matching sencillatech theme
    const THEME = {
        invested: '#00275D',
        returns: '#007DBF',
        tax: '#dc3545',
        inflation: '#E29E21'
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(val));

    // Initialize current year in footer if element exists
    const currentYearEl = document.getElementById('currentYear');
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }

    // --- Tab Switcher Logic ---
    function setInvestmentType(type) {
        investmentType = type;
        if (type === 'SIP') {
            elTabSIP.classList.add('mf-tab-active');
            elTabSIP.classList.remove('mf-tab-inactive');
            elTabLumpsum.classList.add('mf-tab-inactive');
            elTabLumpsum.classList.remove('mf-tab-active');
            elAmountLabel.textContent = "Monthly Investment";
            elStepUpSection.style.display = 'block';
        } else {
            elTabLumpsum.classList.add('mf-tab-active');
            elTabLumpsum.classList.remove('mf-tab-inactive');
            elTabSIP.classList.add('mf-tab-inactive');
            elTabSIP.classList.remove('mf-tab-active');
            elAmountLabel.textContent = "Total Investment";
            elStepUpSection.style.display = 'none';
        }
        calculate();
    }

    elTabSIP.addEventListener('click', () => setInvestmentType('SIP'));
    elTabLumpsum.addEventListener('click', () => setInvestmentType('LUMPSUM'));

    // --- Synchronization ---
    function syncInputAndRange(inputEl, rangeEl) {
        inputEl.addEventListener('input', () => {
            rangeEl.value = inputEl.value;
            calculate();
        });
        rangeEl.addEventListener('input', () => {
            inputEl.value = rangeEl.value;
            calculate();
        });
    }

    syncInputAndRange(elAmount, elAmountRange);
    syncInputAndRange(elReturnRate, elReturnRateRange);
    syncInputAndRange(elTenure, elTenureRange);
    syncInputAndRange(elStayInvestedYears, elStayInvestedYearsRange);

    // Toggle fields visibility
    elStepUpEnabled.addEventListener('change', () => {
        elStepUpFields.style.display = elStepUpEnabled.checked ? 'flex' : 'none';
        calculate();
    });

    elStayInvestedEnabled.addEventListener('change', () => {
        elStayInvestedFields.style.display = elStayInvestedEnabled.checked ? 'block' : 'none';
        calculate();
    });

    // Other listeners
    [elInflationEnabled, elTaxEnabled, elStepUpType].forEach(el => {
        el.addEventListener('change', calculate);
    });
    elStepUpValue.addEventListener('input', calculate);

    // --- Core Calculation Logic ---
    function calculate() {
        const amount = parseFloat(elAmount.value) || 0;
        const returnRate = parseFloat(elReturnRate.value) || 0;
        const tenure = parseInt(elTenure.value) || 0;

        const stepUpEnabled = elStepUpEnabled.checked && investmentType === 'SIP';
        const stepUpType = elStepUpType.value;
        const stepUpValue = parseFloat(elStepUpValue.value) || 0;

        const stayInvestedEnabled = elStayInvestedEnabled.checked;
        const stayInvestedYears = parseInt(elStayInvestedYears.value) || 0;

        const inflationEnabled = elInflationEnabled.checked;
        const inflationRate = 6;

        const taxEnabled = elTaxEnabled.checked;
        const taxRate = 12.5;

        let totalInvested = 0;
        let corpus = 0;
        let currentMonthlySip = amount;

        let chartData = [];
        let totalYears = tenure;
        if (stayInvestedEnabled) totalYears += stayInvestedYears;

        const monthlyReturnRate = returnRate / 100 / 12;

        for (let y = 1; y <= totalYears; y++) {
            let isContributingYear = y <= tenure;

            for (let m = 1; m <= 12; m++) {
                if (isContributingYear) {
                    if (investmentType === 'SIP') {
                        corpus += currentMonthlySip;
                        totalInvested += currentMonthlySip;
                    } else if (investmentType === 'LUMPSUM' && y === 1 && m === 1) {
                        corpus += amount;
                        totalInvested += amount;
                    }
                }
                corpus = corpus * (1 + monthlyReturnRate);
            }

            if (isContributingYear && investmentType === 'SIP' && stepUpEnabled) {
                if (stepUpType === 'percentage') {
                    currentMonthlySip = currentMonthlySip * (1 + stepUpValue / 100);
                } else {
                    currentMonthlySip += stepUpValue;
                }
            }

            let yearProfit = corpus - totalInvested;
            let yearTax = taxEnabled ? yearProfit * (taxRate / 100) : 0;
            let yearNetProfit = yearProfit - yearTax;
            let yearInflationLoss = 0;
            let netPurchasingPower = corpus;

            if (inflationEnabled) {
                const discountFactor = Math.pow(1 + inflationRate / 100, y);
                netPurchasingPower = (totalInvested + yearNetProfit) / discountFactor;
                yearInflationLoss = (totalInvested + yearNetProfit) - netPurchasingPower;
            }

            chartData.push({
                year: `Year ${y}`,
                Invested: Math.round(totalInvested),
                "Net Returns": Math.round(yearNetProfit),
                Tax: Math.round(yearTax),
                "Inflation Impact": Math.round(yearInflationLoss),
                "Net Value": Math.round(totalInvested + yearNetProfit)
            });
        }

        const finalProfit = corpus - totalInvested;
        const finalTax = taxEnabled ? finalProfit * (taxRate / 100) : 0;
        let finalNetValue = corpus - finalTax;
        let finalPurchasingPower = finalNetValue;

        if (inflationEnabled) {
            const discountFactor = Math.pow(1 + inflationRate / 100, totalYears);
            finalPurchasingPower = finalNetValue / discountFactor;
        }

        const cagr = ((Math.pow(finalNetValue / (totalInvested || 1), 1 / (totalYears || 1))) - 1) * 100;

        updateUI({
            invested: totalInvested,
            profit: finalProfit,
            tax: finalTax,
            netValue: finalNetValue,
            purchasingPower: finalPurchasingPower,
            cagr: cagr,
            chartData: chartData,
            taxEnabled: taxEnabled,
            inflationEnabled: inflationEnabled,
            inflationRate: inflationRate
        });
    }

    // --- UI Update ---
    function updateUI(metrics) {
        elTotalInvestedVal.textContent = formatCurrency(metrics.invested);
        elTotalReturnsVal.textContent = formatCurrency(metrics.netValue - metrics.invested);
        elMaturityVal.textContent = formatCurrency(metrics.netValue);

        if (metrics.taxEnabled) {
            elTotalReturnsLabel.textContent = "Total Returns (Post-Tax)";
        } else {
            elTotalReturnsLabel.textContent = "Total Returns";
        }

        if (metrics.inflationEnabled) {
            elInflationSection.style.display = 'flex';
            elPurchasingPowerVal.textContent = formatCurrency(metrics.purchasingPower);
        } else {
            elInflationSection.style.display = 'none';
        }

        elCagrVal.textContent = metrics.cagr.toFixed(2) + '%';

        renderPieChart(metrics.invested, metrics.netValue - metrics.invested);
        renderLineChart(metrics.chartData, metrics.taxEnabled, metrics.inflationEnabled);
        renderTable(metrics.chartData);
    }

    // --- Charts Rendering ---
    function renderPieChart(invested, returns) {
        const ctx = document.getElementById('pieChart').getContext('2d');
        if (pieChartInstance) pieChartInstance.destroy();

        pieChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Total Invested', 'Estimated Returns'],
                datasets: [{
                    data: [invested, Math.max(0, returns)],
                    backgroundColor: [THEME.invested, THEME.returns],
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

    function renderLineChart(chartData, taxEnabled, inflationEnabled) {
        const ctx = document.getElementById('lineChart').getContext('2d');
        if (lineChartInstance) lineChartInstance.destroy();

        const datasets = [
            {
                label: 'Total Invested',
                data: chartData.map(d => d.Invested),
                borderColor: THEME.invested,
                backgroundColor: 'rgba(0, 39, 93, 0.15)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Estimated Returns',
                data: chartData.map(d => d["Net Returns"]),
                borderColor: THEME.returns,
                backgroundColor: 'rgba(0, 125, 191, 0.15)',
                fill: true,
                tension: 0.4
            }
        ];

        if (taxEnabled) {
            datasets.push({
                label: 'Tax Liability',
                data: chartData.map(d => d.Tax),
                borderColor: THEME.tax,
                backgroundColor: 'rgba(220, 53, 69, 0.5)',
                fill: true,
                tension: 0.4
            });
        }

        if (inflationEnabled) {
            datasets.push({
                label: 'Inflation Impact',
                data: chartData.map(d => d["Inflation Impact"]),
                borderColor: THEME.inflation,
                backgroundColor: 'rgba(226, 158, 33, 0.4)',
                borderDash: [5, 5],
                fill: true,
                tension: 0.4
            });
        }

        lineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => d.year),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        ticks: { callback: (value) => '₹' + (value / 100000).toFixed(1) + 'L' }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Table Generation ---
    function renderTable(chartData) {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        chartData.forEach(d => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${d.year}</td>
                <td>${formatCurrency(d.Invested)}</td>
                <td>${formatCurrency(d["Net Returns"])}</td>
                <td>${formatCurrency(d.Tax)}</td>
                <td>${formatCurrency(d["Inflation Impact"])}</td>
                <td><strong>${formatCurrency(d["Net Value"])}</strong></td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Run initial calculation
    calculate();
});