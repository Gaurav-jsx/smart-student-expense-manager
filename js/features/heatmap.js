/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/heatmap.js
   Namespace: window.SS.features.heatmap
   GitHub-style SVG Spending Heatmap Calendar
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const { getDaysInMonth, formatCurrency, formatDate } = window.SS.utils;

    /**
     * Renders a GitHub-style monthly spending calendar heatmap.
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Array<Object>} options.expenses
     * @param {string} options.monthKey YYYY-MM
     * @param {Function} [options.onSelectDate] Callback when day clicked
     */
    function renderSpendingHeatmap({ container, expenses = [], monthKey, onSelectDate }) {
        if (!container) return;
        container.replaceChildren();

        const daysCount = getDaysInMonth(monthKey);
        const dayMap = {};
        for (let d = 1; d <= daysCount; d++) dayMap[d] = { total: 0, items: [] };

        expenses.forEach(e => {
            if (e.date.startsWith(monthKey)) {
                const dayNum = parseInt(e.date.split('-')[2], 10);
                if (dayMap[dayNum]) {
                    dayMap[dayNum].total += (e.effectiveAmount || e.amount || 0);
                    dayMap[dayNum].items.push(e);
                }
            }
        });

        // Determine max daily spend for color scaling
        const maxDaily = Math.max(...Object.values(dayMap).map(v => v.total), 100);

        // Day of week for 1st of month (0 = Sun, 1 = Mon...)
        const firstDayDow = new Date(`${monthKey}-01T00:00:00`).getDay();

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 350 70');
        svg.setAttribute('class', 'heatmap-svg');
        svg.setAttribute('role', 'grid');
        svg.setAttribute('aria-label', `Spending heatmap for ${monthKey}`);

        const cellSize = 9;
        const cellGap = 3;
        const startX = 20;
        const startY = 10;

        // Day labels (S, M, T, W, T, F, S)
        const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        dayLabels.forEach((label, i) => {
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', '6');
            text.setAttribute('y', String(startY + i * (cellSize + cellGap) + 7));
            text.setAttribute('class', 'heatmap-day-label');
            text.textContent = label;
            svg.appendChild(text);
        });

        for (let day = 1; day <= daysCount; day++) {
            const dow = (firstDayDow + day - 1) % 7;
            const weekIndex = Math.floor((firstDayDow + day - 1) / 7);

            const x = startX + weekIndex * (cellSize + cellGap);
            const y = startY + dow * (cellSize + cellGap);

            const dayData = dayMap[day];
            const spend = dayData.total;
            const ratio = spend / maxDaily;

            let colorClass = 'heat-0';
            if (spend > 0) {
                if (ratio > 0.75) colorClass = 'heat-4';
                else if (ratio > 0.5) colorClass = 'heat-3';
                else if (ratio > 0.25) colorClass = 'heat-2';
                else colorClass = 'heat-1';
            }

            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', String(y));
            rect.setAttribute('width', String(cellSize));
            rect.setAttribute('height', String(cellSize));
            rect.setAttribute('rx', '2');
            rect.setAttribute('class', `heatmap-cell ${colorClass}`);
            rect.setAttribute('tabindex', '0');
            rect.setAttribute('role', 'gridcell');

            const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
            const title = document.createElementNS(svgNS, 'title');
            title.textContent = `${formatDate(dateStr)}: ${spend > 0 ? formatCurrency(spend) : 'No spend'}`;
            rect.appendChild(title);

            rect.addEventListener('click', () => {
                if (typeof onSelectDate === 'function') {
                    onSelectDate(dateStr, dayData.items);
                }
            });

            rect.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    rect.click();
                }
            });

            svg.appendChild(rect);
        }

        container.appendChild(svg);
    }

    window.SS.features.heatmap = Object.freeze({
        renderSpendingHeatmap
    });
})();
