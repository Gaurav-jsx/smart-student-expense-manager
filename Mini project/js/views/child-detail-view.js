/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/views/child-detail-view.js
   Namespace: window.SS.views.childDetail
   Parent View: In-depth child monitoring, advisory controls,
   requests, challenges, trends, and printable report.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.views = window.SS.views || {};

    const { t } = window.SS.i18n;
    const { repo, auth } = window.SS;
    const {
        formatCurrency,
        formatDate,
        formatMonthLabel,
        getLocalDateString,
        getMonthKey,
        getMonthKeyFromDate,
        shiftMonthKey
    } = window.SS.utils;
    const { showToast, openModal, closeModal } = window.SS.ui;
    const { decideRequest } = window.SS.features.requests;
    const { createChallenge } = window.SS.features.challenges;
    const { renderSpendingHeatmap } = window.SS.features.heatmap;

    let activeSubscriptions = [];
    let currentChildUid = null;
    let currentChildData = {
        name: 'Student',
        email: '',
        shareLevel: 'full',
        expenses: [],
        budgets: {},
        goals: [],
        requests: [],
        challenges: [],
        alerts: [],
        controls: {}
    };
    let activeTab = 'overview';

    function cleanupSubscriptions() {
        activeSubscriptions.forEach(unsub => {
            try { unsub(); } catch (e) {}
        });
        activeSubscriptions = [];
    }

    /**
     * Mounts the Child Detail View for a given child UID.
     * @param {string} childUid 
     */
    async function renderChildDetailView(childUid) {
        cleanupSubscriptions();
        currentChildUid = childUid;

        document.querySelectorAll('.app-view').forEach(v => {
            v.hidden = (v.id !== 'childDetailViewContainer');
        });
        const container = document.getElementById('childDetailViewContainer');
        if (!container) return;
        container.classList.add('active-view');
        container.replaceChildren();

        const currentUser = auth.currentUser();
        if (!currentUser || currentUser.role !== 'parent') {
            window.SS.router.navigate('/login');
            return;
        }

        // Verify link exists
        const links = await repo.getLinks(currentUser.uid);
        const link = links.find(l => l.childUid === childUid && l.status === 'active');
        if (!link) {
            container.innerHTML = `
                <div class="container text-center" style="padding: 4rem 1rem;">
                    <h2>Child Not Found or Link Inactive</h2>
                    <p>You do not currently have an active link with this student account.</p>
                    <a href="#/parent" class="btn btn-primary" style="margin-top: 1rem;">Back to Parent Dashboard</a>
                </div>
            `;
            return;
        }

        currentChildData.name = link.childName || 'Student';
        currentChildData.email = link.childEmail || '';
        currentChildData.shareLevel = link.shareLevel || 'full';

        // Load Initial Child Data
        try {
            const [expenses, budgets, goals, requests, challenges, alerts, controls] = await Promise.all([
                repo.getExpenses(childUid),
                repo.getBudgets(childUid),
                repo.getGoals(childUid),
                repo.getRequests(childUid),
                repo.getChallenges(childUid),
                repo.getAlerts(childUid),
                repo.getControls(childUid)
            ]);

            currentChildData.expenses = expenses || [];
            currentChildData.budgets = budgets || {};
            currentChildData.goals = goals || [];
            currentChildData.requests = requests || [];
            currentChildData.challenges = challenges || [];
            currentChildData.alerts = alerts || [];
            currentChildData.controls = controls || {};
        } catch (err) {
            console.error('Failed to load child data:', err);
        }

        // Setup Realtime Subscriptions
        const unsubExp = repo.subscribe(`expenses/${childUid}`, (data) => {
            currentChildData.expenses = data || [];
            refreshChildDetailContent();
        });
        const unsubReq = repo.subscribe(`requests/${childUid}`, (data) => {
            currentChildData.requests = data || [];
            refreshChildDetailContent();
        });
        const unsubChal = repo.subscribe(`challenges/${childUid}`, (data) => {
            currentChildData.challenges = data || [];
            refreshChildDetailContent();
        });
        activeSubscriptions.push(unsubExp, unsubReq, unsubChal);

        buildChildDetailDOM(container);
    }

    /**
     * Builds DOM Shell for Child Detail View
     */
    function buildChildDetailDOM(container) {
        const shell = document.createElement('div');
        shell.className = 'container child-detail-shell';

        // Navigation Breadcrumb / Header
        const header = document.createElement('div');
        header.className = 'child-detail-header card';
        header.innerHTML = `
            <div class="child-detail-top-nav">
                <a href="#/parent" class="btn btn-sm btn-outline-secondary">← ${t('parentDashboardTitle')}</a>
                <span class="share-badge badge ${currentChildData.shareLevel === 'full' ? 'badge-success' : 'badge-warning'}">
                    ${currentChildData.shareLevel === 'full' ? '🛡️ Full Transparency' : '🔒 Summary Only Mode'}
                </span>
            </div>
            <div class="child-detail-profile-bar">
                <div class="child-profile-info">
                    <div class="child-avatar large">${escapeHTML(currentChildData.name.charAt(0).toUpperCase())}</div>
                    <div>
                        <h2 style="margin: 0;">${escapeHTML(currentChildData.name)}</h2>
                        <span class="text-muted" style="font-size: 0.9rem;">${escapeHTML(currentChildData.email)}</span>
                    </div>
                </div>
                <div class="child-detail-quick-actions">
                    <button type="button" class="btn btn-outline-primary btn-sm" id="childPrintReportBtn">🖨️ ${t('weeklyReportTitle') || 'Weekly Report'}</button>
                    <button type="button" class="btn btn-primary btn-sm" id="openOfferChallengeModalBtn">🎯 Offer Challenge</button>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="child-tabs-bar" role="tablist">
                <button type="button" class="tab-btn active" data-tab="overview">📊 Overview</button>
                <button type="button" class="tab-btn" data-tab="expenses">🧾 Expenses</button>
                <button type="button" class="tab-btn" data-tab="trends">📈 Trends & Heatmap</button>
                <button type="button" class="tab-btn" data-tab="controls">⚙️ Advisory Controls</button>
                <button type="button" class="tab-btn" data-tab="requests">💬 Requests (${currentChildData.requests.filter(r => r.status === 'pending').length})</button>
                <button type="button" class="tab-btn" data-tab="challenges">🎯 Challenges</button>
            </div>
        `;

        shell.appendChild(header);

        // Tab Content Area
        const contentArea = document.createElement('div');
        contentArea.id = 'childDetailTabContent';
        contentArea.className = 'child-detail-tab-content';
        shell.appendChild(contentArea);

        container.appendChild(shell);

        // Wire Tabs
        const tabBtns = header.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;
                renderActiveTabContent(contentArea);
            });
        });

        // Wire Quick Actions
        const printBtn = header.getElementById ? header.getElementById('childPrintReportBtn') : header.querySelector('#childPrintReportBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                renderPrintableWeeklyReport();
            });
        }

        const offerChalBtn = header.querySelector('#openOfferChallengeModalBtn');
        if (offerChalBtn) {
            offerChalBtn.addEventListener('click', () => {
                openOfferChallengeModal();
            });
        }

        renderActiveTabContent(contentArea);
    }

    /**
     * Re-renders active tab when data changes
     */
    function refreshChildDetailContent() {
        const contentArea = document.getElementById('childDetailTabContent');
        if (contentArea) {
            renderActiveTabContent(contentArea);
        }
    }

    /**
     * Renders Content based on active tab
     */
    function renderActiveTabContent(contentArea) {
        contentArea.replaceChildren();

        switch (activeTab) {
            case 'overview':
                renderOverviewTab(contentArea);
                break;
            case 'expenses':
                renderExpensesTab(contentArea);
                break;
            case 'trends':
                renderTrendsTab(contentArea);
                break;
            case 'controls':
                renderControlsTab(contentArea);
                break;
            case 'requests':
                renderRequestsTab(contentArea);
                break;
            case 'challenges':
                renderChallengesTab(contentArea);
                break;
            default:
                renderOverviewTab(contentArea);
        }
    }

    /* -------------------------------------------------------------------------
       TAB 1: OVERVIEW
    ------------------------------------------------------------------------- */
    function renderOverviewTab(container) {
        const curMonth = getMonthKey();
        const budget = currentChildData.budgets[curMonth] || 0;
        const curExpenses = currentChildData.expenses.filter(e => getMonthKeyFromDate(e.date) === curMonth);
        const spent = curExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const remaining = Math.max(0, budget - spent);
        const pctUsed = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

        // Health Score
        let healthScore = 75;
        if (window.SS.insights && window.SS.insights.calculateHealthScore) {
            try {
                const res = window.SS.insights.calculateHealthScore(currentChildData.expenses, budget, currentChildData.goals);
                healthScore = res.score || 75;
            } catch (e) {}
        }

        const section = document.createElement('div');
        section.className = 'tab-section';
        section.innerHTML = `
            <div class="metrics-grid">
                <div class="card metric-card">
                    <span class="metric-label">Monthly Budget</span>
                    <span class="metric-value">${formatCurrency(budget)}</span>
                    <div class="progress-bar-container" style="margin-top: 0.5rem; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${pctUsed}%; height: 100%; background: ${pctUsed > 90 ? 'var(--danger-color)' : 'var(--primary-color)'};"></div>
                    </div>
                    <span class="text-muted" style="font-size: 0.8rem; margin-top: 4px; display: block;">${pctUsed}% spent (${formatCurrency(spent)})</span>
                </div>
                <div class="card metric-card">
                    <span class="metric-label">Remaining Funds</span>
                    <span class="metric-value text-success">${formatCurrency(remaining)}</span>
                    <span class="text-muted" style="font-size: 0.8rem;">Available for ${formatMonthLabel(curMonth)}</span>
                </div>
                <div class="card metric-card">
                    <span class="metric-label">Financial Health Score</span>
                    <span class="metric-value ${healthScore >= 70 ? 'text-success' : 'text-warning'}">${healthScore}/100</span>
                    <span class="text-muted" style="font-size: 0.8rem;">Based on budget adherence & goals</span>
                </div>
            </div>

            <!-- Active Alerts -->
            ${currentChildData.alerts && currentChildData.alerts.length > 0 ? `
                <div class="card alert-summary-card" style="margin-top: 1.5rem; border-left: 4px solid var(--warning-color);">
                    <h4 style="margin: 0 0 0.8rem 0; font-size: 1.05rem;">⚠️ Active Alerts (${currentChildData.alerts.length})</h4>
                    <ul class="clean-list">
                        ${currentChildData.alerts.slice(0, 3).map(a => `
                            <li style="padding: 0.4rem 0; font-size: 0.9rem;">
                                <strong>${escapeHTML(a.title)}:</strong> ${escapeHTML(a.message)}
                                <span class="text-muted" style="font-size: 0.75rem; margin-left: 8px;">${formatDate(a.date)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Savings Goals & Parent Matching -->
            <div class="card" style="margin-top: 1.5rem;">
                <h4 style="margin-bottom: 1rem;">🎯 Student Savings Goals & Matching</h4>
                ${currentChildData.goals.length === 0 ? `
                    <p class="text-muted">No active savings goals set by ${escapeHTML(currentChildData.name)} yet.</p>
                ` : `
                    <div class="goals-list-compact">
                        ${currentChildData.goals.map(g => {
                            const pct = Math.min(100, Math.round(((g.saved || 0) / (g.target || 1)) * 100));
                            return `
                                <div class="goal-item-row" style="padding: 0.8rem 0; border-bottom: 1px solid var(--border-color);">
                                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                                        <span>${escapeHTML(g.name)}</span>
                                        <span>${formatCurrency(g.saved || 0)} / ${formatCurrency(g.target || 0)} (${pct}%)</span>
                                    </div>
                                    <div class="progress-bar-container" style="margin: 0.4rem 0; height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden;">
                                        <div style="width: ${pct}%; height: 100%; background: var(--primary-color);"></div>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                        🤝 Parent matching: Match 50% upon goal completion.
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;
        container.appendChild(section);
    }

    /* -------------------------------------------------------------------------
       TAB 2: EXPENSES (FULL vs SUMMARY ONLY)
    ------------------------------------------------------------------------- */
    function renderExpensesTab(container) {
        const section = document.createElement('div');
        section.className = 'tab-section';

        if (currentChildData.shareLevel === 'summary') {
            // Polite Summary Only Message
            section.innerHTML = `
                <div class="card text-center" style="padding: 3rem 1.5rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
                    <h3>${t('summarySharingNotice') || 'Summary Only Mode'}</h3>
                    <p class="text-muted" style="max-width: 540px; margin: 0.5rem auto 1.5rem auto;">
                        ${escapeHTML(currentChildData.name)} has opted for Summary-level sharing. You can see category spending totals and monthly budget adherence, but individual transaction details and merchant names are kept private to respect student independence.
                    </p>
                    <div class="card" style="max-width: 500px; margin: 0 auto; text-align: left; background: var(--bg-secondary);">
                        <h4 style="margin-bottom: 0.8rem;">Category Totals (${formatMonthLabel(getMonthKey())})</h4>
                        <div id="childSummaryCategoryList"></div>
                    </div>
                </div>
            `;
            container.appendChild(section);

            // Populate category breakdown
            const catList = section.querySelector('#childSummaryCategoryList');
            if (catList) {
                const curMonth = getMonthKey();
                const curExpenses = currentChildData.expenses.filter(e => getMonthKeyFromDate(e.date) === curMonth);
                const totals = {};
                curExpenses.forEach(e => {
                    totals[e.category] = (totals[e.category] || 0) + e.amount;
                });
                const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
                if (sorted.length === 0) {
                    catList.innerHTML = '<span class="text-muted">No expenses recorded this month.</span>';
                } else {
                    catList.innerHTML = sorted.map(([cat, amt]) => `
                        <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9rem;">
                            <span>${cat}</span>
                            <strong>${formatCurrency(amt)}</strong>
                        </div>
                    `).join('');
                }
            }
            return;
        }

        // FULL TRANSPARENCY: Read-only Table with search, category filter, date filter, CSV export
        section.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">Expense Records (${currentChildData.expenses.length})</h3>
                    <button type="button" class="btn btn-sm btn-outline-primary" id="exportChildCSVBtn">📥 Export CSV</button>
                </div>
                <div class="table-filters" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
                    <input type="text" id="childExpSearch" class="form-control" placeholder="Search title or note...">
                    <select id="childExpCatFilter" class="form-control">
                        <option value="ALL">All Categories</option>
                    </select>
                    <select id="childExpMonthFilter" class="form-control">
                        <option value="ALL">All Months</option>
                    </select>
                </div>
                <div class="table-responsive">
                    <table class="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 2px solid var(--border-color);">
                                <th style="padding: 0.6rem;">Date</th>
                                <th style="padding: 0.6rem;">Title</th>
                                <th style="padding: 0.6rem;">Category</th>
                                <th style="padding: 0.6rem; text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody id="childExpTableBody"></tbody>
                    </table>
                </div>
                <div id="childExpEmptyMessage" class="text-center text-muted" style="padding: 2rem;" hidden>No expenses match your filters.</div>
            </div>
        `;
        container.appendChild(section);

        // Populate Category Filter
        const catSelect = section.querySelector('#childExpCatFilter');
        if (catSelect && window.SS.constants && window.SS.constants.CATEGORIES) {
            window.SS.constants.CATEGORIES.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.icon} ${c.label}`;
                catSelect.appendChild(opt);
            });
        }

        // Populate Month Filter
        const monthSelect = section.querySelector('#childExpMonthFilter');
        if (monthSelect) {
            const months = new Set(currentChildData.expenses.map(e => getMonthKeyFromDate(e.date)));
            Array.from(months).sort().reverse().forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = formatMonthLabel(m);
                monthSelect.appendChild(opt);
            });
        }

        function filterAndRenderTable() {
            const q = (section.querySelector('#childExpSearch').value || '').toLowerCase().trim();
            const cat = section.querySelector('#childExpCatFilter').value;
            const mon = section.querySelector('#childExpMonthFilter').value;
            const tbody = section.querySelector('#childExpTableBody');
            const emptyMsg = section.querySelector('#childExpEmptyMessage');

            const filtered = currentChildData.expenses.filter(e => {
                if (q && !(e.title || '').toLowerCase().includes(q) && !(e.note || '').toLowerCase().includes(q)) return false;
                if (cat !== 'ALL' && e.category !== cat) return false;
                if (mon !== 'ALL' && getMonthKeyFromDate(e.date) !== mon) return false;
                return true;
            });

            tbody.replaceChildren();
            if (filtered.length === 0) {
                emptyMsg.hidden = false;
                return;
            }
            emptyMsg.hidden = true;

            filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(e => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                tr.innerHTML = `
                    <td style="padding: 0.6rem; font-size: 0.85rem;">${formatDate(e.date)}</td>
                    <td style="padding: 0.6rem;">
                        <strong>${escapeHTML(e.title)}</strong>
                        ${e.note ? `<br><small class="text-muted">${escapeHTML(e.note)}</small>` : ''}
                    </td>
                    <td style="padding: 0.6rem; font-size: 0.85rem;">
                        <span class="badge badge-secondary">${escapeHTML(e.category)}</span>
                    </td>
                    <td style="padding: 0.6rem; text-align: right; font-weight: 600;">${formatCurrency(e.amount)}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        section.querySelector('#childExpSearch').addEventListener('input', filterAndRenderTable);
        section.querySelector('#childExpCatFilter').addEventListener('change', filterAndRenderTable);
        section.querySelector('#childExpMonthFilter').addEventListener('change', filterAndRenderTable);

        filterAndRenderTable();

        // CSV Export
        const exportBtn = section.querySelector('#exportChildCSVBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportChildExpensesCSV(currentChildData.expenses, currentChildData.name);
            });
        }
    }

    /* -------------------------------------------------------------------------
       TAB 3: TRENDS & HEATMAP
    ------------------------------------------------------------------------- */
    function renderTrendsTab(container) {
        const section = document.createElement('div');
        section.className = 'tab-section';
        section.innerHTML = `
            <div class="card" style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem;">🔥 Year-at-a-Glance Spending Heatmap</h3>
                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">
                    Daily spending patterns across the year. Darker blocks represent higher daily expenditures.
                </p>
                <div id="childHeatmapContainer" style="overflow-x: auto; padding: 0.5rem 0;"></div>
            </div>

            <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                <div class="card">
                    <h3>Category Spending (${formatMonthLabel(getMonthKey())})</h3>
                    <div style="position: relative; height: 260px; margin-top: 1rem;">
                        <canvas id="childCategoryDonutChart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h3>6-Month Spending Trend</h3>
                    <div style="position: relative; height: 260px; margin-top: 1rem;">
                        <canvas id="childMonthlyTrendChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(section);

        // Render Heatmap
        const heatmapEl = section.querySelector('#childHeatmapContainer');
        if (heatmapEl && renderSpendingHeatmap) {
            const svg = renderSpendingHeatmap(currentChildData.expenses, new Date().getFullYear());
            if (svg) heatmapEl.appendChild(svg);
        }

        // Render Donut & Bar Charts
        setTimeout(() => {
            if (window.SS.charts) {
                const curMonth = getMonthKey();
                const curExpenses = currentChildData.expenses.filter(e => getMonthKeyFromDate(e.date) === curMonth);
                const categoryTotals = {};
                let total = 0;
                curExpenses.forEach(e => {
                    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
                    total += e.amount;
                });
                window.SS.charts.renderCategoryDonut('childCategoryDonutChart', categoryTotals, total);

                // 6-Month totals
                const monthlyTotals = {};
                for (let i = 5; i >= 0; i--) {
                    const mKey = shiftMonthKey(curMonth, -i);
                    const mSpent = currentChildData.expenses
                        .filter(e => getMonthKeyFromDate(e.date) === mKey)
                        .reduce((s, e) => s + e.amount, 0);
                    monthlyTotals[mKey] = mSpent;
                }
                window.SS.charts.renderMonthlyTrend('childMonthlyTrendChart', monthlyTotals, curMonth);
            }
        }, 50);
    }

    /* -------------------------------------------------------------------------
       TAB 4: ADVISORY CONTROLS
    ------------------------------------------------------------------------- */
    function renderControlsTab(container) {
        const controls = currentChildData.controls || {};
        const section = document.createElement('div');
        section.className = 'tab-section';
        section.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 style="margin: 0;">⚙️ Advisory Parental Controls</h3>
                    <span class="badge badge-info">Transparent & Advisory</span>
                </div>
                <div class="advisory-banner" style="background: var(--bg-secondary); border-left: 4px solid var(--primary-color); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-color);">
                        ℹ️ <strong>Advisory Transparency:</strong> SmartSpend controls are guidance limits agreed upon between parent and student. Because SmartSpend does not sit in the banking path, these limits cannot block bank UPI transactions. Instead, they provide gentle spending nudges and alert notifications if exceeded.
                    </p>
                </div>
                <form id="childControlsForm" style="display: flex; flex-direction: column; gap: 1.2rem;">
                    <div class="form-group">
                        <label for="advisoryAllowance">Recommended Monthly Allowance (₹)</label>
                        <input type="number" id="advisoryAllowance" class="form-control" min="0" step="100" value="${controls.allowance || ''}" placeholder="e.g. 8000">
                        <small class="text-muted">Suggests a base monthly budget to Aarav.</small>
                    </div>

                    <div class="form-group">
                        <label for="largeExpenseThreshold">Large Single Expense Alert Threshold (₹)</label>
                        <input type="number" id="largeExpenseThreshold" class="form-control" min="0" step="100" value="${controls.largeExpenseThreshold || 1500}" placeholder="e.g. 1500">
                        <small class="text-muted">Generates an advisory notice if an expense exceeds this amount.</small>
                    </div>

                    <div class="form-group">
                        <label>Category Spending Caps (₹ per month)</label>
                        <div class="category-caps-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
                            ${(window.SS.constants && window.SS.constants.CATEGORIES || []).map(c => `
                                <div>
                                    <label for="cap_${c.id}" style="font-size: 0.85rem;">${c.icon} ${c.label}</label>
                                    <input type="number" id="cap_${c.id}" class="form-control cap-input" data-cat="${c.id}" min="0" step="50" value="${(controls.categoryCaps && controls.categoryCaps[c.id]) || ''}" placeholder="No limit">
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary" id="saveControlsBtn">Save Advisory Controls</button>
                    </div>
                </form>
            </div>
        `;
        container.appendChild(section);

        const form = section.querySelector('#childControlsForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = section.querySelector('#saveControlsBtn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const allowance = parseFloat(section.querySelector('#advisoryAllowance').value) || 0;
            const largeThreshold = parseFloat(section.querySelector('#largeExpenseThreshold').value) || 1500;
            const categoryCaps = {};

            section.querySelectorAll('.cap-input').forEach(input => {
                const val = parseFloat(input.value);
                if (val > 0) {
                    categoryCaps[input.dataset.cat] = val;
                }
            });

            const updatedControls = {
                allowance,
                largeExpenseThreshold: largeThreshold,
                categoryCaps,
                updatedAt: new Date().toISOString()
            };

            try {
                await repo.saveControls(currentChildUid, updatedControls);
                currentChildData.controls = updatedControls;
                showToast('Advisory controls saved successfully!');
            } catch (err) {
                showToast('Failed to save controls.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Advisory Controls';
            }
        });
    }

    /* -------------------------------------------------------------------------
       TAB 5: REQUESTS
    ------------------------------------------------------------------------- */
    function renderRequestsTab(container) {
        const section = document.createElement('div');
        section.className = 'tab-section';

        const requests = currentChildData.requests || [];
        section.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 style="margin: 0;">Money Requests</h3>
                    <span class="badge badge-info">${requests.filter(r => r.status === 'pending').length} Pending</span>
                </div>
                ${requests.length === 0 ? `
                    <p class="text-muted" style="padding: 2rem 0; text-align: center;">No money requests from ${escapeHTML(currentChildData.name)}.</p>
                ` : `
                    <div class="requests-list" style="margin-top: 1rem;">
                        ${requests.map(r => `
                            <div class="card request-item" style="border: 1px solid var(--border-color); margin-bottom: 1rem; padding: 1.2rem;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                                    <div>
                                        <h4 style="margin: 0;">${escapeHTML(r.title || r.reason || 'Money Request')}</h4>
                                        <span class="text-muted" style="font-size: 0.85rem;">Requested on ${formatDate(r.createdAt)}</span>
                                        ${r.note ? `<p style="margin: 0.4rem 0 0 0; font-size: 0.9rem;">"${escapeHTML(r.note)}"</p>` : ''}
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${formatCurrency(r.amount)}</div>
                                        <span class="badge badge-${r.status === 'approved' ? 'success' : (r.status === 'declined' ? 'danger' : 'warning')}">
                                            ${r.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                ${r.status === 'pending' ? `
                                    <div class="request-actions" style="margin-top: 1rem; display: flex; gap: 0.8rem; justify-content: flex-end;">
                                        <button type="button" class="btn btn-outline-danger btn-sm decline-req-btn" data-id="${r.id}">Decline</button>
                                        <button type="button" class="btn btn-primary btn-sm approve-req-btn" data-id="${r.id}" data-amt="${r.amount}">Approve (${formatCurrency(r.amount)})</button>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
        container.appendChild(section);

        // Wire Approve & Decline
        section.querySelectorAll('.approve-req-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.dataset.id;
                const amt = parseFloat(btn.dataset.amt);
                const note = window.prompt(`Approve ${formatCurrency(amt)}? Optional note:`, 'Sent via UPI');
                if (note !== null) {
                    btn.disabled = true;
                    btn.textContent = 'Approving...';
                    try {
                        const currentUser = auth.currentUser();
                        await decideRequest(reqId, 'approved', note, currentUser ? currentUser.uid : 'parent_1');
                        showToast(`Request for ${formatCurrency(amt)} approved! Child budget updated.`);
                        // Refresh
                        const updated = await repo.getRequests(currentChildUid);
                        currentChildData.requests = updated;
                        renderRequestsTab(container);
                    } catch (err) {
                        showToast('Failed to approve request.');
                    }
                }
            });
        });

        section.querySelectorAll('.decline-req-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.dataset.id;
                const reason = window.prompt('Decline reason (optional):', 'Please wait until next monthly cycle.');
                if (reason !== null) {
                    btn.disabled = true;
                    try {
                        const currentUser = auth.currentUser();
                        await decideRequest(reqId, 'declined', reason, currentUser ? currentUser.uid : 'parent_1');
                        showToast('Request declined.');
                        const updated = await repo.getRequests(currentChildUid);
                        currentChildData.requests = updated;
                        renderRequestsTab(container);
                    } catch (err) {
                        showToast('Failed to decline request.');
                    }
                }
            });
        });
    }

    /* -------------------------------------------------------------------------
       TAB 6: CHALLENGES
    ------------------------------------------------------------------------- */
    function renderChallengesTab(container) {
        const section = document.createElement('div');
        section.className = 'tab-section';

        const challenges = currentChildData.challenges || [];
        section.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <h3 style="margin: 0;">🎯 Savings Challenges</h3>
                    <button type="button" class="btn btn-primary btn-sm" id="tabOfferChallengeBtn">+ Offer New Challenge</button>
                </div>
                <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.9rem;">
                    Reward positive budgeting habits with fun financial challenges.
                </p>
                ${challenges.length === 0 ? `
                    <p class="text-muted" style="padding: 2rem 0; text-align: center;">No active or completed challenges yet.</p>
                ` : `
                    <div class="challenges-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem;">
                        ${challenges.map(c => `
                            <div class="card challenge-item" style="border: 1px solid var(--border-color); padding: 1.2rem;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span class="badge badge-${c.status === 'completed' ? 'success' : (c.status === 'active' ? 'primary' : 'secondary')}">
                                        ${(c.status || 'active').toUpperCase()}
                                    </span>
                                    <span class="reward-pill" style="font-weight: 700; color: var(--primary-color);">🎁 Reward: ${formatCurrency(c.reward)}</span>
                                </div>
                                <h4 style="margin: 0.8rem 0 0.4rem 0;">${escapeHTML(c.title)}</h4>
                                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 0.8rem;">${escapeHTML(c.description || '')}</p>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                    Deadline: ${formatDate(c.deadline)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
        container.appendChild(section);

        const offerBtn = section.querySelector('#tabOfferChallengeBtn');
        if (offerBtn) {
            offerBtn.addEventListener('click', openOfferChallengeModal);
        }
    }

    /* -------------------------------------------------------------------------
       OFFER CHALLENGE MODAL
    ------------------------------------------------------------------------- */
    function openOfferChallengeModal() {
        let modal = document.getElementById('offerChallengeModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'offerChallengeModal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-dialog card" role="dialog" aria-modal="true" style="max-width: 480px;">
                    <div class="modal-header">
                        <h3>🎯 Offer a Savings Challenge</h3>
                        <button type="button" class="close-btn" id="closeOfferModalBtn">&times;</button>
                    </div>
                    <form id="offerChallengeForm">
                        <div class="modal-body" style="display: flex; flex-direction: column; gap: 1rem;">
                            <div class="form-group">
                                <label for="challengePreset">Challenge Template</label>
                                <select id="challengePreset" class="form-control">
                                    <option value="canteen">☕ Canteen Cap: Keep Canteen under ₹150/day for 7 days</option>
                                    <option value="weekend">🍕 Weekend Saver: Keep weekend spend under ₹500</option>
                                    <option value="nospend">🚫 Zero-Spend Day: 2 consecutive zero non-essential spend days</option>
                                    <option value="custom">✏️ Custom Challenge</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="offerChallengeTitle">Challenge Title *</label>
                                <input type="text" id="offerChallengeTitle" class="form-control" required value="Canteen Cap: Stay under ₹150/day">
                            </div>
                            <div class="form-group">
                                <label for="offerChallengeReward">Reward Amount (₹) *</label>
                                <input type="number" id="offerChallengeReward" class="form-control" required min="50" step="50" value="300">
                                <small class="text-muted">Bonus allowance added to budget when completed.</small>
                            </div>
                            <div class="form-group">
                                <label for="offerChallengeDays">Duration (Days)</label>
                                <input type="number" id="offerChallengeDays" class="form-control" min="3" max="30" value="7">
                            </div>
                        </div>
                        <div class="modal-actions" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.8rem;">
                            <button type="button" class="btn btn-secondary" id="cancelOfferModalBtn">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="submitOfferChallengeBtn">Send Challenge</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('#closeOfferModalBtn').addEventListener('click', () => closeModal(modal));
            modal.querySelector('#cancelOfferModalBtn').addEventListener('click', () => closeModal(modal));

            const presetSelect = modal.querySelector('#challengePreset');
            const titleInput = modal.querySelector('#offerChallengeTitle');
            const rewardInput = modal.querySelector('#offerChallengeReward');

            presetSelect.addEventListener('change', () => {
                switch (presetSelect.value) {
                    case 'canteen':
                        titleInput.value = 'Canteen Cap: Stay under ₹150/day';
                        rewardInput.value = '300';
                        break;
                    case 'weekend':
                        titleInput.value = 'Weekend Saver: Under ₹500 this weekend';
                        rewardInput.value = '400';
                        break;
                    case 'nospend':
                        titleInput.value = 'Zero-Spend Challenge: 2 No-Spend Days';
                        rewardInput.value = '250';
                        break;
                    case 'custom':
                        titleInput.value = '';
                        rewardInput.value = '200';
                        break;
                }
            });

            modal.querySelector('#offerChallengeForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = titleInput.value.trim();
                const reward = parseFloat(rewardInput.value) || 0;
                const days = parseInt(modal.querySelector('#offerChallengeDays').value, 10) || 7;

                if (!title || reward <= 0) return;

                const currentUser = auth.currentUser();
                const deadlineDate = new Date();
                deadlineDate.setDate(deadlineDate.getDate() + days);

                const newChallenge = {
                    childUid: currentChildUid,
                    parentUid: currentUser ? currentUser.uid : 'parent_1',
                    title,
                    reward,
                    type: presetSelect.value,
                    target: reward,
                    deadline: deadlineDate.toISOString().split('T')[0],
                    createdAt: new Date().toISOString()
                };

                try {
                    await createChallenge(newChallenge);
                    closeModal(modal);
                    showToast('Challenge offered to student!');
                    // Refresh challenges
                    const updated = await repo.getChallenges(currentChildUid);
                    currentChildData.challenges = updated;
                    refreshChildDetailContent();
                } catch (err) {
                    showToast('Failed to create challenge.');
                }
            });
        }

        openModal(modal);
    }

    /* -------------------------------------------------------------------------
       PRINTABLE WEEKLY REPORT
    ------------------------------------------------------------------------- */
    function renderPrintableWeeklyReport() {
        const curMonth = getMonthKey();
        const budget = currentChildData.budgets[curMonth] || 0;
        const curExpenses = currentChildData.expenses.filter(e => getMonthKeyFromDate(e.date) === curMonth);
        const spent = curExpenses.reduce((s, e) => s + (e.amount || 0), 0);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('Please allow popups to view the printable weekly report.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Weekly Student Spending Report — ${escapeHTML(currentChildData.name)}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; color: #222; }
                    .header { border-bottom: 2px solid #6c63ff; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; }
                    .metric-box { display: inline-block; width: 30%; background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-right: 2%; box-sizing: border-box; }
                    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .footer { margin-top: 2rem; font-size: 0.85rem; color: #666; border-top: 1px solid #eee; padding-top: 1rem; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>SmartSpend Weekly Financial Summary</h2>
                        <p>Student: <strong>${escapeHTML(currentChildData.name)}</strong> (${escapeHTML(currentChildData.email)})</p>
                    </div>
                    <div style="text-align: right;">
                        <p>Generated: ${new Date().toLocaleDateString('en-IN')}</p>
                        <p>Share Level: ${currentChildData.shareLevel === 'full' ? 'Full Transparency' : 'Summary Only'}</p>
                    </div>
                </div>

                <div>
                    <div class="metric-box">
                        <small>Monthly Budget</small>
                        <h3>₹${budget.toLocaleString('en-IN')}</h3>
                    </div>
                    <div class="metric-box">
                        <small>Current Month Spent</small>
                        <h3>₹${spent.toLocaleString('en-IN')}</h3>
                    </div>
                    <div class="metric-box">
                        <small>Remaining Funds</small>
                        <h3>₹${Math.max(0, budget - spent).toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                <h3>Recent Spending Records</h3>
                ${currentChildData.shareLevel === 'summary' ? `
                    <p><em>Individual transactions hidden per student's Summary-Only privacy setting.</em></p>
                ` : `
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${curExpenses.slice(0, 25).map(e => `
                                <tr>
                                    <td>${e.date}</td>
                                    <td>${escapeHTML(e.title)}</td>
                                    <td>${escapeHTML(e.category)}</td>
                                    <td>₹${e.amount.toLocaleString('en-IN')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}

                <div class="footer">
                    <p>SmartSpend Student Expense Manager — Empowering student independence and transparent family support.</p>
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * Helper to export child expenses to CSV
     */
    function exportChildExpensesCSV(expenses, childName) {
        if (!expenses || expenses.length === 0) {
            showToast('No expenses to export.');
            return;
        }

        const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Note'];
        const rows = expenses.map(e => [
            `"${(e.date || '').replace(/"/g, '""')}"`,
            `"${(e.title || '').replace(/"/g, '""')}"`,
            `"${(e.category || '').replace(/"/g, '""')}"`,
            (e.amount || 0).toFixed(2),
            `"${(e.note || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartSpend_${childName.replace(/\s+/g, '_')}_expenses_${getLocalDateString()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV report downloaded!');
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.SS.views.childDetail = Object.freeze({
        render: renderChildDetailView,
        cleanup: cleanupSubscriptions
    });
})();
