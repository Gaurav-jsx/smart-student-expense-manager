/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/requests.js
   Namespace: window.SS.features.requests
   Money Requests Engine: Extra money, limit increases,
   goal matching, and idempotent budget application.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const { repo } = window.SS;
    const { getMonthKey, formatCurrency } = window.SS.utils;
    const showToast = (msg) => {
        if (window.SS && window.SS.ui && typeof window.SS.ui.showToast === 'function') {
            window.SS.ui.showToast(msg);
        }
    };

    /**
     * Submits a new money request from student to linked parent.
     */
    async function submitRequest(childUid, { type = 'extra_money', amount, reason }) {
        if (!amount || amount <= 0) {
            throw new Error('Please enter a valid amount greater than ₹0.');
        }
        if (!reason || reason.trim().length === 0) {
            throw new Error('Please provide a reason for your request.');
        }

        const req = await repo.createRequest(childUid, {
            type,
            amount: Math.round(amount),
            reason: reason.trim().slice(0, 200)
        });

        // Also raise an alert to the linked parent
        await repo.raiseAlert(childUid, {
            id: `req_alert_${req.id}`,
            type: 'request_created',
            message: `New request: ₹${req.amount.toLocaleString('en-IN')} for "${req.reason}"`,
            amount: req.amount
        });

        return req;
    }

    /**
     * Parent decides a request (Approve or Decline, with optional note or modified amount).
     */
    async function decideRequest(childUid, requestId, { status, parentNote = '', approvedAmount = null, decidedBy }) {
        const decided = await repo.decideRequest(childUid, requestId, {
            status,
            parentNote: parentNote.trim().slice(0, 200),
            approvedAmount: approvedAmount ? Math.round(approvedAmount) : null,
            decidedBy
        });

        // If approved and not yet applied, apply extra money to the student's current-month budget
        if (status === 'approved') {
            await applyApprovedRequestToBudget(childUid, requestId);
        }

        return decided;
    }

    /**
     * Idempotently applies an approved request to the student's current-month budget.
     */
    async function applyApprovedRequestToBudget(childUid, requestId) {
        const requests = await repo.subscribeRequests(childUid, () => {})(); // read current
        // To be safe, fetch direct from repo
        const curMonth = getMonthKey();
        const budgets = await repo.getBudgets(childUid);
        const curBudget = budgets[curMonth] || 0;

        // Fetch requests for child
        const linkPath = `users/${childUid}/requests`;
        const localDoc = window.SS.adapters.local ? window.SS.adapters.local.repo : null;

        // Use repo method
        let targetReq = null;
        const unsub = repo.subscribeRequests(childUid, (list) => {
            targetReq = (list || []).find(r => r.id === requestId);
        });
        unsub();

        if (targetReq && targetReq.status === 'approved' && !targetReq.applied) {
            const addedAmount = targetReq.approvedAmount || targetReq.amount;
            const newTotal = curBudget + addedAmount;
            await repo.setMonthBudget(childUid, curMonth, newTotal);
            await repo.markRequestApplied(childUid, requestId);

            showToast(`Approved allowance of ${formatCurrency(addedAmount)} added to monthly budget!`);
            return true;
        }
        return false;
    }

    window.SS.features.requests = Object.freeze({
        submitRequest,
        decideRequest,
        applyApprovedRequestToBudget
    });
})();
