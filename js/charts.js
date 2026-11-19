/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/charts.js
   Namespace: window.SS.charts
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const {
        CATEGORY_COLORS,
        CATEGORY_ICONS
    } = window.SS.constants;

    const {
        formatCurrency,
        formatCompactCurrency,
        getMonthKey,
        getMonthKeyFromDate,
        getDaysInMonth
    } = window.SS.utils;

    /**
     * Renders an accessible SVG Donut Chart with interactive legend.
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {HTMLElement} options.legendContainer
     * @param {Array<Object>} options.expenses
     * @param {Function} [options.onSelectCategory] Callback when category in legend or slice is clicked
     */
    function renderCategoryDonut({ container, legendContainer, expenses = [], onSelectCategory }) {
        if (!container || !legendContainer) return;

        container.replaceChildren();
        legendContainer.replaceChildren();

        const categoryTotals = {};
        expenses.forEach(e => {
            const cat = e.category || 'Other';
            const amt = (typeof e.effectiveAmount === 'number') ? e.effectiveAmount : (Number(e.amount) || 0);
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        });

        const entries = Object.entries(categoryTotals)
            .filter(([, amount]) => amount > 0)
            .sort((a, b) => b[1] - a[1]);

        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No expense data available for this period.';
            container.appendChild(empty);
            return;
        }

        const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

        // SVG Donut implementation using stroke-dasharray on circle (r = 15.9155 for circumference = 100)
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 42 42");
        svg.setAttribute("class", "donut-svg");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", `Category spending breakdown. Total: ${formatCurrency(total)}`);

        // Center total text
        const textGroup = document.createElementNS(svgNS, "g");
        textGroup.setAttribute("class", "donut-center-group");

        const textSub = document.createElementNS(svgNS, "text");
        textSub.setAttribute("x", "21");
        textSub.setAttribute("y", "19");
        textSub.setAttribute("class", "donut-subtext");
        textSub.setAttribute("text-anchor", "middle");
        textSub.textContent = "TOTAL";

        const textVal = document.createElementNS(svgNS, "text");
        textVal.setAttribute("x", "21");
        textVal.setAttribute("y", "25");
        textVal.setAttribute("class", "donut-center-text");
        textVal.setAttribute("text-anchor", "middle");
        textVal.textContent = formatCompactCurrency(total);

        textGroup.appendChild(textSub);
        textGroup.appendChild(textVal);

        let accumulatedPercent = 0;

        entries.forEach(([cat, amount]) => {
            const percent = (amount / total) * 100;
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "21");
            circle.setAttribute("cy", "21");
            circle.setAttribute("r", "15.91549430918954");
            circle.setAttribute("fill", "transparent");
            circle.setAttribute("stroke", CATEGORY_COLORS[cat] || "#9ca3af");
            circle.setAttribute("stroke-width", "5");
            circle.setAttribute("stroke-dasharray", `${percent.toFixed(2)} ${(100 - percent).toFixed(2)}`);
            circle.setAttribute("stroke-dashoffset", `${(100 - accumulatedPercent + 25).toFixed(2)}`);
            circle.setAttribute("tabindex", "0");
            circle.setAttribute("role", "graphics-symbol");
            circle.setAttribute("aria-label", `${cat}: ${formatCurrency(amount)} (${percent.toFixed(0)}%)`);

            const titleElem = document.createElementNS(svgNS, "title");
            titleElem.textContent = `${cat}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)`;
            circle.appendChild(titleElem);

            circle.style.cursor = 'pointer';
            circle.addEventListener('click', () => {
                if (typeof onSelectCategory === 'function') {
                    onSelectCategory(cat);
                }
            });

            svg.appendChild(circle);
            accumulatedPercent += percent;
        });

        svg.appendChild(textGroup);
        container.appendChild(svg);

        // Legend items
        entries.forEach(([category, amount]) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "legend-item legend-clickable";
            item.setAttribute("aria-label", `Filter by ${category}: ${formatCurrency(amount)}`);

            const dot = document.createElement("span");
            dot.className = "legend-dot";
            dot.style.backgroundColor = CATEGORY_COLORS[category] || "#9ca3af";

            const name = document.createElement("span");
            name.className = "legend-name";
            name.textContent = `${CATEGORY_ICONS[category] || ''} ${category}`;

            const value = document.createElement("span");
            value.className = "legend-amount";
            value.textContent = formatCurrency(amount);

            item.append(dot, name, value);

            item.addEventListener('click', () => {
                if (typeof onSelectCategory === 'function') {
                    onSelectCategory(category);
                }
            });

            legendContainer.appendChild(item);
        });
    }

    /**
     * Renders responsive SVG Monthly Trend bars with budget reference line.
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Array<Object>} options.expenses
     * @param {Object} options.budgets
     * @param {string} options.currentMonth
     * @param {Function} [options.onSelectMonth]
     */
    function renderMonthlyTrend({ container, expenses = [], budgets = {}, currentMonth, onSelectMonth }) {
        if (!container) return;
        container.replaceChildren();

        const now = new Date();
        const months = [];

        for (let offset = 5; offset >= 0; offset--) {
            const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
            const key = getMonthKey(date);
            const total = expenses
                .filter(e => getMonthKeyFromDate(e.date) === key)
                .reduce((sum, e) => sum + (e.effectiveAmount || e.amount || 0), 0);

            const budget = budgets[key] || 0;

            months.push({
                key,
                label: date.toLocaleDateString("en-IN", { month: "short" }),
                fullLabel: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
                total,
                budget,
                isCurrent: key === currentMonth
            });
        }

        const maxSpent = Math.max(...months.map(m => m.total), 0);
        const maxBudget = Math.max(...months.map(m => m.budget), 0);
        const scaleMax = Math.max(maxSpent, maxBudget, 100);

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 360 180");
        svg.setAttribute("class", "monthly-trend-svg");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Monthly spending trend over the last 6 months");

        // Background grid lines (3 levels)
        [0.25, 0.5, 0.75, 1.0].forEach(level => {
            const y = 140 - (level * 110);
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", "20");
            line.setAttribute("x2", "340");
            line.setAttribute("y1", y.toFixed(1));
            line.setAttribute("y2", y.toFixed(1));
            line.setAttribute("class", "chart-grid-line");
            svg.appendChild(line);
        });

        // Bars
        const barWidth = 32;
        const spacing = 52;
        const startX = 35;

        months.forEach((m, idx) => {
            const x = startX + idx * spacing;
            const barHeight = Math.max(4, (m.total / scaleMax) * 110);
            const y = 140 - barHeight;

            const group = document.createElementNS(svgNS, "g");
            group.setAttribute("class", `bar-group ${m.isCurrent ? 'bar-current' : ''}`);
            group.setAttribute("tabindex", "0");
            group.setAttribute("role", "graphics-symbol");
            group.setAttribute("aria-label", `${m.fullLabel}: ${formatCurrency(m.total)}`);

            const title = document.createElementNS(svgNS, "title");
            title.textContent = `${m.fullLabel}: ${formatCurrency(m.total)} ${m.budget > 0 ? `(Budget: ${formatCurrency(m.budget)})` : ''}`;
            group.appendChild(title);

            // Bar rect
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", x.toString());
            rect.setAttribute("y", y.toFixed(1));
            rect.setAttribute("width", barWidth.toString());
            rect.setAttribute("height", barHeight.toFixed(1));
            rect.setAttribute("rx", "6");
            rect.setAttribute("class", "chart-bar");
            if (m.budget > 0 && m.total > m.budget) {
                rect.classList.add("bar-over-budget");
            }

            // Value text above bar
            const valText = document.createElementNS(svgNS, "text");
            valText.setAttribute("x", (x + barWidth / 2).toString());
            valText.setAttribute("y", (y - 5).toFixed(1));
            valText.setAttribute("class", "chart-bar-value");
            valText.setAttribute("text-anchor", "middle");
            valText.textContent = formatCompactCurrency(m.total);

            // Month label below bar
            const labelText = document.createElementNS(svgNS, "text");
            labelText.setAttribute("x", (x + barWidth / 2).toString());
            labelText.setAttribute("y", "158");
            labelText.setAttribute("class", `chart-bar-label ${m.isCurrent ? 'label-active' : ''}`);
            labelText.setAttribute("text-anchor", "middle");
            labelText.textContent = m.label;

            // Optional budget marker tick
            if (m.budget > 0) {
                const bgtY = Math.max(10, 140 - (m.budget / scaleMax) * 110);
                const bgtTick = document.createElementNS(svgNS, "line");
                bgtTick.setAttribute("x1", (x - 4).toString());
                bgtTick.setAttribute("x2", (x + barWidth + 4).toString());
                bgtTick.setAttribute("y1", bgtY.toFixed(1));
                bgtTick.setAttribute("y2", bgtY.toFixed(1));
                bgtTick.setAttribute("class", "chart-budget-marker");
                group.appendChild(bgtTick);
            }

            group.appendChild(rect);
            group.appendChild(valText);
            group.appendChild(labelText);

            group.style.cursor = 'pointer';
            group.addEventListener('click', () => {
                if (typeof onSelectMonth === 'function') {
                    onSelectMonth(m.key);
                }
            });

            svg.appendChild(group);
        });

        container.appendChild(svg);
    }

    /**
     * Renders daily spending sparkline/area for the selected month with daily safe limit.
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Array<Object>} options.expenses
     * @param {string} options.selectedMonth
     * @param {number} options.dailySafeBudget
     */
    function renderDailySparkline({ container, expenses = [], selectedMonth, dailySafeBudget = 0 }) {
        if (!container) return;
        container.replaceChildren();

        const daysCount = getDaysInMonth(selectedMonth);
        const dayMap = {};
        for (let i = 1; i <= daysCount; i++) {
            dayMap[i] = 0;
        }

        expenses.forEach(e => {
            if (getMonthKeyFromDate(e.date) === selectedMonth) {
                const dayNum = parseInt(e.date.split('-')[2], 10);
                if (dayMap[dayNum] !== undefined) {
                    dayMap[dayNum] += (e.effectiveAmount || e.amount || 0);
                }
            }
        });

        const dailyValues = Object.entries(dayMap).map(([day, val]) => ({ day: Number(day), val }));
        const maxVal = Math.max(...dailyValues.map(d => d.val), dailySafeBudget, 50);

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 300 70");
        svg.setAttribute("class", "sparkline-svg");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Daily spending trajectory for the month");

        const points = dailyValues.map((d, idx) => {
            const x = (idx / (daysCount - 1)) * 280 + 10;
            const y = 60 - (d.val / maxVal) * 50;
            return { x, y, ...d };
        });

        // Area polygon
        const areaPoints = [`10,65`, ...points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`), `290,65`].join(' ');
        const polygon = document.createElementNS(svgNS, "polygon");
        polygon.setAttribute("points", areaPoints);
        polygon.setAttribute("class", "sparkline-area");
        svg.appendChild(polygon);

        // Path line
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", pathData);
        path.setAttribute("class", "sparkline-line");
        svg.appendChild(path);

        // Daily safe limit line if positive
        if (dailySafeBudget > 0) {
            const safeY = 60 - (dailySafeBudget / maxVal) * 50;
            const safeLine = document.createElementNS(svgNS, "line");
            safeLine.setAttribute("x1", "10");
            safeLine.setAttribute("x2", "290");
            safeLine.setAttribute("y1", safeY.toFixed(1));
            safeLine.setAttribute("y2", safeY.toFixed(1));
            safeLine.setAttribute("class", "sparkline-safe-line");

            const safeTitle = document.createElementNS(svgNS, "title");
            safeTitle.textContent = `Safe daily limit: ${formatCurrency(dailySafeBudget)}`;
            safeLine.appendChild(safeTitle);

            svg.appendChild(safeLine);
        }

        container.appendChild(svg);
    }

    window.SS.charts = Object.freeze({
        renderCategoryDonut,
        renderMonthlyTrend,
        renderDailySparkline
    });
})();

