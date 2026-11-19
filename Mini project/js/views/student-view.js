/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/views/student-view.js
   Namespace: window.SS.views.student
   Student Dashboard, Parent Monitoring Banner,
   UPI Importer, Simulator, and Student Linking UI.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.views = window.SS.views || {};

    const { t } = window.SS.i18n;
    const { repo, auth } = window.SS;
    const {
        getLocalDateString,
        getMonthKey,
        getMonthKeyFromDate,
        formatCurrency,
        formatDate,
        formatMonthLabel,
        shiftMonthKey
    } = window.SS.utils;
    const { showToast, openModal, closeModal } = window.SS.ui;
    const { parseUPIsms } = window.SS.features.upiParser;
    const { simulatePurchase } = window.SS.features.whatIf;
    const { calculateXP, getDailyTip, getWeeklyQuiz } = window.SS.features.xp;
    const { evaluateAlerts } = window.SS.features.alerts;
    const { submitRequest } = window.SS.features.requests;
    const { renderSpendingHeatmap } = window.SS.features.heatmap;

    let activeSubscriptions = [];
    let currentStudentExpenses = [];
    let currentStudentBudgets = {};
    let currentStudentGoals = [];
    let currentStudentRecurring = [];
    let currentStudentLinks = [];
    let activeSelectedMonth = getMonthKey();

    function cleanupSubscriptions() {
        activeSubscriptions.forEach(unsub => {
            try { unsub(); } catch (e) {}
        });
        activeSubscriptions = [];
    }

    /**
     * Mounts the Student View.
     */
    function renderStudentView() {
        cleanupSubscriptions();

        // Reveal student container, hide others
        document.querySelectorAll('.app-view').forEach(v => {
            v.hidden = (v.id !== 'studentViewContainer');
        });
        const container = document.getElementById('studentViewContainer');
        if (!container) return;
        container.classList.add('active-view');

        const currentUser = auth.currentUser();
        const uid = (currentUser && currentUser.uid) || 'guest_user';

        // Subscribe to student data
        if (currentUser && !currentUser.isGuest) {
            activeSubscriptions.push(
                repo.subscribeExpenses(uid, (list) => {
                    currentStudentExpenses = list;
                    refreshStudentDashboard();
                })
            );
            activeSubscriptions.push(
                repo.subscribeBudgets(uid, (budgets) => {
                    currentStudentBudgets = budgets;
                    refreshStudentDashboard();
                })
            );
            activeSubscriptions.push(
                repo.subscribeGoals(uid, (goals) => {
                    currentStudentGoals = goals;
                    refreshStudentDashboard();
                })
            );
            activeSubscriptions.push(
                repo.subscribeRecurring(uid, (rec) => {
                    currentStudentRecurring = rec;
                    refreshStudentDashboard();
                })
            );
            activeSubscriptions.push(
                repo.subscribeLinks(uid, (links) => {
                    currentStudentLinks = links;
                    renderParentMonitoringBanner();
                })
            );
        } else {
            // Guest mode: load from localStorage
            const localState = window.SS.storage ? window.SS.storage.load().state : {};
            currentStudentExpenses = localState.expenses || [];
            currentStudentBudgets = localState.budgets || {};
            currentStudentGoals = localState.goals || [];
            currentStudentRecurring = localState.recurring || [];
            currentStudentLinks = [];
            refreshStudentDashboard();
            renderParentMonitoringBanner();
        }

        wireStudentControls();
        refreshStudentDashboard();
    }

    /**
     * Renders the persistent Parent Monitoring banner when linked.
     */
    function renderParentMonitoringBanner() {
        const banner = document.getElementById('parentMonitoringBanner');
        if (!banner) return;

        if (currentStudentLinks.length > 0) {
            const parentNames = currentStudentLinks.map(l => l.parentName || 'Parent').join(', ');
            banner.innerHTML = `
                <div class="container parent-banner-content">
                    <span>👪 <strong>${t('parentConsentBanner', { parentName: parentNames })}</strong></span>
                    <a href="#/link" class="btn btn-sm btn-outline-light">${t('manageSharing')}</a>
                </div>
            `;
            banner.hidden = false;
        } else {
            banner.hidden = true;
        }
    }

    /**
     * Refreshes all dashboard cards, charts, and gamification metrics.
     */
    function refreshStudentDashboard() {
        const budget = currentStudentBudgets[activeSelectedMonth] || 0;

        // Run alert rules on client side
        const currentUser = auth.currentUser();
        if (currentUser && !currentUser.isGuest) {
            evaluateAlerts(currentUser.uid, currentStudentExpenses, budget);
        }

        // Render XP & Daily Tip
        const streaks = window.SS.insights ? window.SS.insights.calculateStreaks(currentStudentExpenses) : { currentStreak: 0 };
        const xpData = calculateXP({
            expenses: currentStudentExpenses,
            streaks,
            budgets: currentStudentBudgets
        });

        const levelBadge = document.getElementById('studentLevelBadge');
        const xpFill = document.getElementById('studentXpFill');
        const dailyTipEl = document.getElementById('studentDailyTipText');

        if (levelBadge) levelBadge.textContent = xpData.levelName;
        if (xpFill) xpFill.style.width = `${xpData.progressPct}%`;
        if (dailyTipEl) dailyTipEl.textContent = getDailyTip();

        // Render Heatmap in Student Dashboard
        const heatmapContainer = document.getElementById('studentSpendingHeatmap');
        if (heatmapContainer) {
            renderSpendingHeatmap({
                container: heatmapContainer,
                expenses: currentStudentExpenses,
                monthKey: activeSelectedMonth,
                onSelectDate: (date, items) => {
                    showToast(`${formatDate(date)}: ${items.length} ${items.length === 1 ? 'expense' : 'expenses'} logged.`);
                }
            });
        }

        // Trigger controller refresh if present
        if (window.SS.controller && typeof window.SS.controller.refresh === 'function') {
            window.SS.controller.refresh();
        }
    }

    /**
     * Wires modals: UPI paste, "Can I afford it?" simulator, Money requests.
     */
    function wireStudentControls() {
        // UPI SMS Importer Button
        const upiBtn = document.getElementById('openUpiImporterBtn');
        const upiModal = document.getElementById('upiModal');
        const closeUpiBtn = document.getElementById('closeUpiBtn');
        const parseUpiBtn = document.getElementById('parseUpiBtn');
        const upiTextarea = document.getElementById('upiTextarea');
        const upiPreview = document.getElementById('upiPreview');
        const saveUpiExpenseBtn = document.getElementById('saveUpiExpenseBtn');

        let parsedCandidate = null;

        if (upiBtn && upiModal) {
            upiBtn.addEventListener('click', () => {
                if (upiTextarea) upiTextarea.value = '';
                if (upiPreview) upiPreview.hidden = true;
                openModal(upiModal);
            });
        }
        if (closeUpiBtn && upiModal) {
            closeUpiBtn.addEventListener('click', () => closeModal(upiModal));
        }
        if (parseUpiBtn && upiTextarea) {
            parseUpiBtn.addEventListener('click', () => {
                const res = parseUPIsms(upiTextarea.value);
                parsedCandidate = res;
                if (res.ok) {
                    if (upiPreview) {
                        upiPreview.innerHTML = `
                            <div class="upi-preview-card">
                                <strong>${res.merchant}</strong> — <span class="badge-amount">${formatCurrency(res.amount)}</span>
                                <div class="upi-meta">Category: <strong>${res.category}</strong> · Date: <strong>${res.date}</strong> ${res.refNo ? `· Ref: ${res.refNo}` : ''}</div>
                            </div>
                        `;
                        upiPreview.hidden = false;
                    }
                } else {
                    showToast(res.errors[0] || 'Could not parse transaction SMS.');
                }
            });
        }
        if (saveUpiExpenseBtn) {
            saveUpiExpenseBtn.addEventListener('click', async () => {
                if (!parsedCandidate || !parsedCandidate.ok) {
                    showToast('Please parse a valid SMS first.');
                    return;
                }
                const newExp = {
                    id: window.SS.utils.createId(),
                    title: parsedCandidate.merchant,
                    amount: parsedCandidate.amount,
                    category: parsedCandidate.category,
                    date: parsedCandidate.date,
                    note: parsedCandidate.refNo ? `UPI Ref: ${parsedCandidate.refNo}` : 'Imported via UPI SMS',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    recurringId: null,
                    splitWith: 0
                };

                const currentUser = auth.currentUser();
                if (currentUser && !currentUser.isGuest) {
                    await repo.addExpense(currentUser.uid, newExp);
                } else {
                    currentStudentExpenses.unshift(newExp);
                    if (window.SS.storage) window.SS.storage.save({ expenses: currentStudentExpenses, budgets: currentStudentBudgets });
                }

                closeModal(upiModal);
                refreshStudentDashboard();
                showToast(`Saved UPI expense "${newExp.title}"!`);
            });
        }

        // "Can I Afford It?" Simulator Modal
        const simBtn = document.getElementById('openSimulatorBtn');
        const simModal = document.getElementById('simulatorModal');
        const closeSimBtn = document.getElementById('closeSimulatorBtn');
        const runSimBtn = document.getElementById('runSimBtn');
        const simAmountInput = document.getElementById('simAmountInput');
        const simCategorySelect = document.getElementById('simCategorySelect');
        const simResultBox = document.getElementById('simResultBox');

        if (simBtn && simModal) {
            simBtn.addEventListener('click', () => {
                if (simAmountInput) simAmountInput.value = '';
                if (simResultBox) simResultBox.hidden = true;
                openModal(simModal);
            });
        }
        if (closeSimBtn && simModal) {
            closeSimBtn.addEventListener('click', () => closeModal(simModal));
        }
        if (runSimBtn && simAmountInput) {
            runSimBtn.addEventListener('click', () => {
                const amt = Number(simAmountInput.value);
                if (!amt || amt <= 0) {
                    showToast('Enter planned amount.');
                    return;
                }
                const cat = (simCategorySelect && simCategorySelect.value) || 'Shopping';
                const budget = currentStudentBudgets[activeSelectedMonth] || 0;

                const sim = simulatePurchase({
                    plannedAmount: amt,
                    plannedCategory: cat,
                    budget,
                    expenses: currentStudentExpenses,
                    goals: currentStudentGoals
                });

                if (simResultBox) {
                    simResultBox.innerHTML = `
                        <div class="sim-verdict ${sim.isAffordable ? 'verdict-good' : 'verdict-bad'}">
                            <h4>${sim.isAffordable ? '✅ Safe to Purchase' : '⚠️ Budget Warning'}</h4>
                            <p>${sim.verdict}</p>
                            <div class="sim-stats">
                                <div>Daily Safe Today: <strong>${formatCurrency(sim.newSafeToday)}</strong> (was ${formatCurrency(sim.currentSafeToday)})</div>
                                <div>Month-end Forecast: <strong>${formatCurrency(sim.simulatedProjected)}</strong></div>
                                ${sim.delayedGoalInfo ? `<div class="sim-goal-alert">🎯 <em>${sim.delayedGoalInfo.message}</em></div>` : ''}
                            </div>
                        </div>
                    `;
                    simResultBox.hidden = false;
                }
            });
        }

        // Money Request Button
        const reqBtn = document.getElementById('openRequestMoneyBtn');
        const reqModal = document.getElementById('requestMoneyModal');
        const closeReqBtn = document.getElementById('closeRequestMoneyBtn');
        const reqForm = document.getElementById('requestMoneyForm');
        const reqAmountInput = document.getElementById('reqAmountInput');
        const reqReasonInput = document.getElementById('reqReasonInput');
        const reqTypeSelect = document.getElementById('reqTypeSelect');

        if (reqBtn && reqModal) {
            reqBtn.addEventListener('click', () => {
                const currentUser = auth.currentUser();
                if (currentUser && currentUser.isGuest) {
                    showToast('Sign in to send money requests to your linked parent.');
                    window.SS.router.navigate('/login');
                    return;
                }
                if (currentStudentLinks.length === 0) {
                    showToast('No parent linked. Invite your parent first from Settings → Parents.');
                    window.SS.router.navigate('/link');
                    return;
                }
                if (reqAmountInput) reqAmountInput.value = '';
                if (reqReasonInput) reqReasonInput.value = '';
                openModal(reqModal);
            });
        }
        if (closeReqBtn && reqModal) {
            closeReqBtn.addEventListener('click', () => closeModal(reqModal));
        }
        if (reqForm) {
            reqForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const amt = Number(reqAmountInput.value);
                const reason = reqReasonInput.value.trim();
                const type = (reqTypeSelect && reqTypeSelect.value) || 'extra_money';
                const currentUser = auth.currentUser();

                if (!amt || amt <= 0 || !reason) {
                    showToast('Please fill all request fields.');
                    return;
                }

                try {
                    await submitRequest(currentUser.uid, { type, amount: amt, reason });
                    closeModal(reqModal);
                    showToast('Money request submitted to linked parent!');
                } catch (err) {
                    showToast(err.message || 'Could not submit request.');
                }
            });
        }
    }

    /**
     * Renders Student Linking Page (Invite code generation, active links, share level, revocation).
     */
    async function renderStudentLinkPage() {
        cleanupSubscriptions();

        document.querySelectorAll('.app-view').forEach(v => {
            v.hidden = (v.id !== 'linkViewContainer');
        });
        const container = document.getElementById('linkViewContainer');
        if (!container) return;
        container.classList.add('active-view');
        container.replaceChildren();

        const currentUser = auth.currentUser();
        if (!currentUser || currentUser.isGuest) {
            container.innerHTML = `
                <div class="card" style="max-width: 500px; margin: 3rem auto; text-align: center;">
                    <h3>Sign In Required</h3>
                    <p>Parent linking requires a student account.</p>
                    <a href="#/login" class="btn btn-primary" style="margin-top: 1rem;">Sign In</a>
                </div>
            `;
            return;
        }

        const linkShell = document.createElement('div');
        linkShell.className = 'container link-page-shell';

        const header = document.createElement('div');
        header.className = 'link-page-header';
        header.innerHTML = `
            <h2>${t('inviteParent')}</h2>
            <p>Share your college budget with your parent with complete transparency and consent.</p>
        `;

        // Code Generation Card
        const codeCard = document.createElement('div');
        codeCard.className = 'card link-code-card';
        codeCard.innerHTML = `
            <h3>Generate Invite Code</h3>
            <p>Give this 8-character single-use code to your parent. It expires in 15 minutes.</p>
            <div class="invite-code-display" id="inviteCodeBox">------</div>
            <div class="invite-actions">
                <button type="button" class="btn btn-primary" id="genInviteBtn">Generate Code</button>
                <button type="button" class="btn btn-secondary" id="copyInviteBtn" disabled>📋 Copy</button>
            </div>
            <small id="inviteExpiresLabel" class="expires-label"></small>
        `;

        // Active Parents Card
        const activeCard = document.createElement('div');
        activeCard.className = 'card link-active-card';
        activeCard.innerHTML = `
            <h3>Linked Parents &amp; Guardians</h3>
            <p>You can adjust share levels or revoke parental access at any time.</p>
            <div id="linkedParentsList" class="linked-parents-list">
                <div class="empty-state-sm">No parents linked yet.</div>
            </div>
        `;

        linkShell.appendChild(header);
        linkShell.appendChild(codeCard);
        linkShell.appendChild(activeCard);
        container.appendChild(linkShell);

        // Fetch active links
        const linksList = document.getElementById('linkedParentsList');
        const refreshLinks = async () => {
            const links = await repo.listLinksForChild(currentUser.uid);
            if (linksList) {
                linksList.replaceChildren();
                if (links.length === 0) {
                    linksList.innerHTML = '<div class="empty-state-sm">No parents linked yet.</div>';
                } else {
                    links.forEach(l => {
                        const row = document.createElement('div');
                        row.className = 'linked-parent-row';
                        row.innerHTML = `
                            <div class="parent-info">
                                <strong>${l.parentName || 'Parent'}</strong>
                                <small>Linked on ${formatDate(new Date(l.createdAt).toISOString().split('T')[0])}</small>
                            </div>
                            <div class="parent-sharing-controls">
                                <select class="share-level-select" data-parent="${l.parentUid}">
                                    <option value="full" ${l.shareLevel === 'full' ? 'selected' : ''}>Full Transparency</option>
                                    <option value="summary" ${l.shareLevel === 'summary' ? 'selected' : ''}>Summary Only</option>
                                </select>
                                <button type="button" class="btn btn-sm btn-danger revoke-link-btn" data-parent="${l.parentUid}">Revoke</button>
                            </div>
                        `;
                        linksList.appendChild(row);
                    });

                    // Wire share level changes and revoke
                    linksList.querySelectorAll('.share-level-select').forEach(sel => {
                        sel.addEventListener('change', async (e) => {
                            const pUid = sel.dataset.parent;
                            await repo.setShareLevel(currentUser.uid, pUid, sel.value);
                            showToast(`Updated sharing level to ${sel.value === 'full' ? 'Full' : 'Summary'}.`);
                        });
                    });

                    linksList.querySelectorAll('.revoke-link-btn').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const pUid = btn.dataset.parent;
                            const confirmed = window.confirm('Revoke access? Your parent will immediately lose access to your data.');
                            if (confirmed) {
                                await repo.revokeLink(currentUser.uid, pUid);
                                showToast('Parental access revoked.');
                                refreshLinks();
                            }
                        });
                    });
                }
            }
        };

        refreshLinks();

        // Wire Code Generation
        const genBtn = document.getElementById('genInviteBtn');
        const copyBtn = document.getElementById('copyInviteBtn');
        const codeBox = document.getElementById('inviteCodeBox');
        const expLabel = document.getElementById('inviteExpiresLabel');

        let activeCode = '';

        if (genBtn) {
            genBtn.addEventListener('click', async () => {
                genBtn.disabled = true;
                genBtn.textContent = 'Generating...';
                try {
                    const invite = await repo.createInvite(currentUser.uid, currentUser.name || 'Student');
                    activeCode = invite.code;
                    if (codeBox) codeBox.textContent = invite.code;
                    if (copyBtn) copyBtn.disabled = false;
                    if (expLabel) expLabel.textContent = 'Expires in 15 minutes. Single-use only.';
                    showToast('Invite code generated! Share this with your parent.');
                } catch (err) {
                    showToast('Could not create invite code.');
                } finally {
                    genBtn.disabled = false;
                    genBtn.textContent = 'Regenerate Code';
                }
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                if (activeCode) {
                    navigator.clipboard.writeText(activeCode);
                    showToast('Code copied to clipboard!');
                }
            });
        }
    }

    window.SS.views.student = Object.freeze({
        render: renderStudentView,
        renderLinkPage: renderStudentLinkPage,
        refresh: refreshStudentDashboard,
        cleanup: cleanupSubscriptions
    });
})();
