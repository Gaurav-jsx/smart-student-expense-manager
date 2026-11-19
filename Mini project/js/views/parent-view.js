/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/views/parent-view.js
   Namespace: window.SS.views.parent
   Parent Dashboard: Children Grid, Family Overview,
   Inbox (Alerts & Requests), and Add Child Flow.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.views = window.SS.views || {};

    const { t } = window.SS.i18n;
    const { repo, auth } = window.SS;
    const { formatCurrency, getMonthKey, formatDate } = window.SS.utils;
    const { showToast, openModal, closeModal } = window.SS.ui;
    const { decideRequest } = window.SS.features.requests;

    let activeSubscriptions = [];
    let linkedChildren = [];
    let familyData = {}; // childUid -> { expenses: [], budget: 0, requests: [], alerts: [] }

    function cleanupSubscriptions() {
        activeSubscriptions.forEach(unsub => {
            try { unsub(); } catch (e) {}
        });
        activeSubscriptions = [];
    }

    /**
     * Mounts the Parent Dashboard View.
     */
    async function renderParentView() {
        cleanupSubscriptions();

        document.querySelectorAll('.app-view').forEach(v => {
            v.hidden = (v.id !== 'parentViewContainer');
        });
        const container = document.getElementById('parentViewContainer');
        if (!container) return;
        container.classList.add('active-view');
        container.replaceChildren();

        const currentUser = auth.currentUser();
        if (!currentUser || currentUser.role !== 'parent') {
            window.SS.router.navigate('/login');
            return;
        }

        const shell = document.createElement('div');
        shell.className = 'container parent-dashboard-shell';

        // 1. Parent Welcome Header
        const header = document.createElement('div');
        header.className = 'parent-header';
        header.innerHTML = `
            <div class="parent-welcome-text">
                <h2>${t('parentDashboardTitle')}</h2>
                <p>${t('parentDashboardSubtitle')}</p>
            </div>
            <div class="parent-header-actions">
                <button type="button" class="btn btn-primary" id="openAddChildBtn">${t('addChildBtn')}</button>
            </div>
        `;

        // 2. Family Overview Section
        const familyOverview = document.createElement('section');
        familyOverview.className = 'card family-overview-card';
        familyOverview.id = 'familyOverviewCard';
        familyOverview.innerHTML = `
            <div class="family-overview-header">
                <div>
                    <h3>${t('weeklyDigest')}</h3>
                    <p id="familyDigestText">Loading family spending digest...</p>
                </div>
                <div class="family-stat-pill">
                    <span>Total Family Spend This Month:</span>
                    <strong id="totalFamilySpendAmount">₹0</strong>
                </div>
            </div>
        `;

        // 3. Children Grid
        const childrenSection = document.createElement('section');
        childrenSection.className = 'children-section';
        childrenSection.innerHTML = `
            <div class="section-heading">
                <h3>${t('childrenGridTitle')}</h3>
            </div>
            <div class="children-grid" id="childrenGrid">
                <div class="empty-state">${t('noChildrenLinked')}</div>
            </div>
        `;

        // 4. Inbox Section (Alerts & Requests)
        const inboxSection = document.createElement('section');
        inboxSection.className = 'card parent-inbox-section';
        inboxSection.innerHTML = `
            <div class="section-heading">
                <div>
                    <h3>${t('alertsAndRequests')}</h3>
                    <p>Real-time notifications and student allowance requests.</p>
                </div>
            </div>
            <div class="inbox-list" id="parentInboxList">
                <div class="empty-state-sm">No new alerts or requests.</div>
            </div>
        `;

        shell.appendChild(header);
        shell.appendChild(familyOverview);
        shell.appendChild(childrenSection);
        shell.appendChild(inboxSection);
        container.appendChild(shell);

        // Wire Add Child Modal
        wireAddChildModal(container, currentUser);

        // Subscribe to Parent's Links
        activeSubscriptions.push(
            repo.subscribeLinks(currentUser.uid, async (links) => {
                linkedChildren = links;
                await loadAllChildrenData(currentUser);
                renderChildrenGrid();
                renderFamilyOverview();
                renderInbox();
            })
        );
    }

    /**
     * Loads spending, requests, and alerts for all linked children.
     */
    async function loadAllChildrenData(parentUser) {
        familyData = {};
        for (const link of linkedChildren) {
            const childUid = link.childUid;
            familyData[childUid] = {
                link,
                expenses: [],
                budget: 0,
                requests: [],
                alerts: []
            };

            // Expenses (if full share)
            if (link.shareLevel === 'full') {
                activeSubscriptions.push(
                    repo.subscribeExpenses(childUid, (expenses) => {
                        if (familyData[childUid]) {
                            familyData[childUid].expenses = expenses;
                            renderChildrenGrid();
                            renderFamilyOverview();
                        }
                    })
                );
            }

            // Budgets
            activeSubscriptions.push(
                repo.subscribeBudgets(childUid, (budgets) => {
                    if (familyData[childUid]) {
                        const curMonth = getMonthKey();
                        familyData[childUid].budget = budgets[curMonth] || 0;
                        renderChildrenGrid();
                        renderFamilyOverview();
                    }
                })
            );

            // Requests
            activeSubscriptions.push(
                repo.subscribeRequests(childUid, (reqs) => {
                    if (familyData[childUid]) {
                        familyData[childUid].requests = reqs;
                        renderChildrenGrid();
                        renderInbox();
                    }
                })
            );

            // Alerts
            activeSubscriptions.push(
                repo.subscribeAlerts(childUid, (alerts) => {
                    if (familyData[childUid]) {
                        familyData[childUid].alerts = alerts;
                        renderChildrenGrid();
                        renderInbox();
                    }
                })
            );
        }
    }

    /**
     * Renders Child Cards in the Grid.
     */
    function renderChildrenGrid() {
        const grid = document.getElementById('childrenGrid');
        if (!grid) return;
        grid.replaceChildren();

        if (linkedChildren.length === 0) {
            grid.innerHTML = `<div class="empty-state">${t('noChildrenLinked')}</div>`;
            return;
        }

        const curMonth = getMonthKey();

        linkedChildren.forEach(link => {
            const data = familyData[link.childUid] || { expenses: [], budget: 0, requests: [], alerts: [] };
            const card = document.createElement('article');
            card.className = 'child-card card';

            const monthExpenses = (data.expenses || []).filter(e => e.date.startsWith(curMonth));
            const spent = window.SS.utils ? window.SS.utils.sumPaise(monthExpenses, 'amount') : 0;
            const budget = data.budget || 0;
            const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

            const pendingReqs = (data.requests || []).filter(r => r.status === 'pending').length;
            const unreadAlerts = (data.alerts || []).filter(a => !a.readBy || !a.readBy[auth.currentUser().uid]).length;

            const initials = (link.childName || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

            card.innerHTML = `
                <div class="child-card-header">
                    <div class="child-avatar">${initials}</div>
                    <div>
                        <h4>${link.childName}</h4>
                        <span class="share-badge ${link.shareLevel === 'full' ? 'badge-full' : 'badge-summary'}">
                            ${link.shareLevel === 'full' ? 'Full Transparency' : 'Summary Only'}
                        </span>
                    </div>
                    <div class="child-card-badges">
                        ${pendingReqs > 0 ? `<span class="badge-pill req-pill">${pendingReqs} Req</span>` : ''}
                        ${unreadAlerts > 0 ? `<span class="badge-pill alert-pill">${unreadAlerts} Alert</span>` : ''}
                    </div>
                </div>

                <div class="child-card-spending">
                    <div class="spend-label-row">
                        <span>Spent this month:</span>
                        <strong>${formatCurrency(spent)} ${budget > 0 ? `of ${formatCurrency(budget)}` : ''}</strong>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill ${pct >= 100 ? 'fill-danger' : (pct >= 80 ? 'fill-warning' : '')}" style="width: ${pct}%"></div>
                    </div>
                </div>

                <div class="child-card-footer">
                    <a href="#/parent/child/${link.childUid}" class="btn btn-primary btn-block">${t('viewChild')} →</a>
                </div>
            `;

            grid.appendChild(card);
        });
    }

    /**
     * Renders Family Aggregate Spending & Weekly Digest.
     */
    function renderFamilyOverview() {
        const totalAmountEl = document.getElementById('totalFamilySpendAmount');
        const digestTextEl = document.getElementById('familyDigestText');

        const curMonth = getMonthKey();
        let totalFamilySpent = 0;
        const childSummaries = [];

        Object.values(familyData).forEach(cd => {
            const mExpenses = (cd.expenses || []).filter(e => e.date.startsWith(curMonth));
            const childSpent = window.SS.utils ? window.SS.utils.sumPaise(mExpenses, 'amount') : 0;
            totalFamilySpent += childSpent;
            if (cd.link) {
                childSummaries.push({ name: cd.link.childName, spent: childSpent });
            }
        });

        if (totalAmountEl) {
            totalAmountEl.textContent = formatCurrency(totalFamilySpent);
        }

        if (digestTextEl) {
            if (childSummaries.length === 0) {
                digestTextEl.textContent = 'Add your student to monitor family spending and advisory allowances.';
            } else {
                const namesStr = childSummaries.map(c => `${c.name}: ${formatCurrency(c.spent)}`).join(' · ');
                digestTextEl.textContent = `Active allowances for ${formatMonthLabel(curMonth)} — ${namesStr}.`;
            }
        }
    }

    /**
     * Renders Parent Inbox (Alerts feed & Pending money requests).
     */
    function renderInbox() {
        const inboxList = document.getElementById('parentInboxList');
        if (!inboxList) return;
        inboxList.replaceChildren();

        const allItems = [];

        Object.entries(familyData).forEach(([childUid, cd]) => {
            const childName = cd.link ? cd.link.childName : 'Student';

            // Requests
            (cd.requests || []).forEach(r => {
                allItems.push({
                    type: 'request',
                    childUid,
                    childName,
                    item: r,
                    date: r.createdAt
                });
            });

            // Alerts
            (cd.alerts || []).forEach(a => {
                allItems.push({
                    type: 'alert',
                    childUid,
                    childName,
                    item: a,
                    date: a.createdAt
                });
            });
        });

        allItems.sort((a, b) => b.date - a.date);

        if (allItems.length === 0) {
            inboxList.innerHTML = '<div class="empty-state-sm">No alerts or requests in your inbox.</div>';
            return;
        }

        allItems.slice(0, 15).forEach(entry => {
            const row = document.createElement('div');
            row.className = `inbox-item-row ${entry.type === 'request' ? 'inbox-request-row' : 'inbox-alert-row'}`;

            if (entry.type === 'request') {
                const req = entry.item;
                const isPending = req.status === 'pending';
                row.innerHTML = `
                    <div class="inbox-item-main">
                        <span class="inbox-icon">💵</span>
                        <div>
                            <strong>${entry.childName} requested ${formatCurrency(req.amount)}</strong>
                            <p class="inbox-reason">"${req.reason}"</p>
                            <small class="inbox-meta">${formatDate(new Date(req.createdAt).toISOString().split('T')[0])} · Status: <strong>${req.status.toUpperCase()}</strong></small>
                        </div>
                    </div>
                    ${isPending ? `
                        <div class="inbox-actions">
                            <button type="button" class="btn btn-sm btn-primary approve-req-btn" data-child="${entry.childUid}" data-req="${req.id}" data-amt="${req.amount}">Approve</button>
                            <button type="button" class="btn btn-sm btn-secondary decline-req-btn" data-child="${entry.childUid}" data-req="${req.id}">Decline</button>
                        </div>
                    ` : `<span class="badge-status ${req.status}">${req.status}</span>`}
                `;
            } else {
                const alt = entry.item;
                row.innerHTML = `
                    <div class="inbox-item-main">
                        <span class="inbox-icon">🔔</span>
                        <div>
                            <strong>Alert for ${entry.childName}</strong>
                            <p class="inbox-reason">${alt.message}</p>
                            <small class="inbox-meta">${formatDate(new Date(alt.createdAt).toISOString().split('T')[0])}</small>
                        </div>
                    </div>
                `;
            }

            inboxList.appendChild(row);
        });

        // Wire Approve / Decline Buttons
        inboxList.querySelectorAll('.approve-req-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const childUid = btn.dataset.child;
                const reqId = btn.dataset.req;
                const amount = Number(btn.dataset.amt);
                const currentUser = auth.currentUser();

                const note = window.prompt(`Approve ${formatCurrency(amount)} for student? (Optional parent note):`, 'Approved for college expenses');
                if (note !== null) {
                    await decideRequest(childUid, reqId, {
                        status: 'approved',
                        parentNote: note,
                        decidedBy: currentUser.uid
                    });
                    showToast(`Approved request of ${formatCurrency(amount)}!`);
                }
            });
        });

        inboxList.querySelectorAll('.decline-req-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const childUid = btn.dataset.child;
                const reqId = btn.dataset.req;
                const currentUser = auth.currentUser();

                const note = window.prompt('Decline request with note (optional):', 'Please stick to your current monthly allowance');
                if (note !== null) {
                    await decideRequest(childUid, reqId, {
                        status: 'declined',
                        parentNote: note,
                        decidedBy: currentUser.uid
                    });
                    showToast('Request declined.');
                }
            });
        });
    }

    /**
     * Wires the Add Child dialog modal.
     */
    function wireAddChildModal(parentContainer, currentUser) {
        let modal = document.getElementById('addChildModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addChildModal';
            modal.className = 'modal-backdrop';
            modal.hidden = true;
            modal.innerHTML = `
                <div class="modal-dialog card" role="dialog" aria-modal="true" aria-labelledby="addChildTitle">
                    <div class="modal-header">
                        <h3 id="addChildTitle">${t('addChildBtn')}</h3>
                        <button type="button" class="close-btn" id="closeAddChildBtn">×</button>
                    </div>
                    <div class="modal-body">
                        <p class="settings-desc">Enter the 8-character invite code generated from your student's SmartSpend app (Settings → Parents &amp; Sharing).</p>
                        <div class="form-group" style="margin: 1.2rem 0;">
                            <label for="childInviteCodeInput">Student Invite Code</label>
                            <input type="text" id="childInviteCodeInput" placeholder="e.g. 7K9X2M4P" maxlength="8" style="text-transform: uppercase; font-weight: 700; letter-spacing: 2px;">
                        </div>
                        <div id="addChildConfirmBox" class="add-child-confirm-box" hidden></div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-primary" id="submitLinkCodeBtn">${t('linkChildBtn')}</button>
                        <button type="button" class="btn btn-secondary" id="cancelAddChildBtn">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const openBtn = document.getElementById('openAddChildBtn');
        const closeBtn = document.getElementById('closeAddChildBtn');
        const cancelBtn = document.getElementById('cancelAddChildBtn');
        const submitBtn = document.getElementById('submitLinkCodeBtn');
        const codeInput = document.getElementById('childInviteCodeInput');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                if (codeInput) codeInput.value = '';
                openModal(modal);
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(modal));

        if (submitBtn && codeInput) {
            submitBtn.addEventListener('click', async () => {
                const code = codeInput.value.trim().toUpperCase();
                if (code.length !== 8) {
                    showToast('Please enter an 8-character invite code.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Linking...';

                try {
                    const newLink = await repo.redeemInvite(currentUser.uid, currentUser.name || 'Parent', code);
                    closeModal(modal);
                    showToast(`Successfully linked with ${newLink.childName}!`);
                } catch (err) {
                    showToast(err.message || 'Could not link with student.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = t('linkChildBtn');
                }
            });
        }
    }

    window.SS.views.parent = Object.freeze({
        render: renderParentView,
        cleanup: cleanupSubscriptions
    });
})();
