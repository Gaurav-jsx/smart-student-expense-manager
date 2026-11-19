/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/alerts.js
   Namespace: window.SS.features.alerts
   Client-side Idempotent Alert Evaluator &
   Browser Push Notification Bridge.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const { repo } = window.SS;
    const { getMonthKey, sumPaise, formatCurrency } = window.SS.utils;

    /**
     * Evaluates whether any alert thresholds have been triggered for a student,
     * and idempotently raises alerts using deterministic IDs.
     */
    async function evaluateAlerts(childUid, expenses = [], budget = 0, controls = {}) {
        if (!childUid || !Array.isArray(expenses)) return;

        const curMonth = getMonthKey();
        const monthExpenses = expenses.filter(e => e.date.startsWith(curMonth));
        const totalSpent = sumPaise(monthExpenses, 'amount');

        // 1. Budget 80% and 100% Alerts
        if (budget > 0) {
            const pct = (totalSpent / budget) * 100;
            if (pct >= 100) {
                await repo.raiseAlert(childUid, {
                    id: `${curMonth}_budget100`,
                    type: 'budget100',
                    message: `Monthly budget exceeded by ${formatCurrency(totalSpent - budget)}.`,
                    amount: totalSpent
                });
            } else if (pct >= 80) {
                await repo.raiseAlert(childUid, {
                    id: `${curMonth}_budget80`,
                    type: 'budget80',
                    message: `Monthly budget has reached ${pct.toFixed(0)}% (${formatCurrency(totalSpent)} of ${formatCurrency(budget)}).`,
                    amount: totalSpent
                });
            }
        }

        // 2. Large Expense Alert Threshold (Default ₹500 or set by parent)
        const largeThreshold = (controls && controls.largeExpenseThreshold) || 500;
        monthExpenses.forEach(async (exp) => {
            if (exp.amount >= largeThreshold) {
                await repo.raiseAlert(childUid, {
                    id: `${curMonth}_large_exp_${exp.id}`,
                    type: 'large_expense',
                    message: `Large expense logged: ${formatCurrency(exp.amount)} on ${exp.category} ("${exp.title}").`,
                    amount: exp.amount,
                    expenseId: exp.id
                });
            }
        });

        // 3. Category Limits Alert
        if (controls && controls.categoryLimits) {
            const catTotals = {};
            monthExpenses.forEach(e => {
                catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
            });

            for (const [cat, limit] of Object.entries(controls.categoryLimits)) {
                if (limit > 0 && catTotals[cat] && catTotals[cat] >= limit) {
                    await repo.raiseAlert(childUid, {
                        id: `${curMonth}_cat_limit_${cat}`,
                        type: 'category_limit',
                        message: `Advisory cap reached for ${cat}: ${formatCurrency(catTotals[cat])} (limit was ${formatCurrency(limit)}).`,
                        amount: catTotals[cat]
                    });
                }
            }
        }
    }

    /**
     * Requests browser permission and sends an in-browser notification to parent.
     */
    async function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }

    function sendDesktopNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: 'icons/icon.svg'
                });
            } catch (e) {}
        }
    }

    window.SS.features.alerts = Object.freeze({
        evaluateAlerts,
        requestNotificationPermission,
        sendDesktopNotification
    });
})();
