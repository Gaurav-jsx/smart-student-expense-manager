/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/whatif.js
   Namespace: window.SS.features.whatIf
   "Can I Afford It?" Purchase Simulator
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const { getDaysInMonth, getLocalDateString, getMonthKey, formatCurrency, sumPaise } = window.SS.utils;
    const { calculateSafeToSpend } = window.SS.insights;

    /**
     * Simulates the financial consequence of an upcoming discretionary purchase.
     * @param {Object} params
     * @param {number} params.plannedAmount
     * @param {string} params.plannedCategory
     * @param {number} params.budget
     * @param {Array<Object>} params.expenses
     * @param {Array<Object>} params.goals
     * @param {string} [params.today=getLocalDateString()]
     */
    function simulatePurchase({ plannedAmount = 0, plannedCategory = 'Shopping', budget = 0, expenses = [], goals = [], today = getLocalDateString() }) {
        const curMonth = today.slice(0, 7);
        const totalDays = getDaysInMonth(curMonth);
        const dayOfMonth = parseInt(today.split('-')[2], 10) || 1;
        const daysLeft = Math.max(1, totalDays - dayOfMonth + 1);

        const currentSafe = calculateSafeToSpend({ budget, expenses, selectedMonth: curMonth, today });

        // Simulated expenses with planned purchase included today
        const simulatedExpenses = [
            ...expenses,
            { amount: plannedAmount, category: plannedCategory, date: today }
        ];

        const newSafe = calculateSafeToSpend({ budget, expenses: simulatedExpenses, selectedMonth: curMonth, today });

        // Month-end projection impact
        const monthSpent = sumPaise(expenses.filter(e => (e.date || '').startsWith(curMonth)), 'amount');
        const simulatedMonthSpent = monthSpent + plannedAmount;
        const currentProjected = Math.round((monthSpent / Math.max(1, dayOfMonth)) * totalDays);
        const simulatedProjected = Math.round((simulatedMonthSpent / Math.max(1, dayOfMonth)) * totalDays);

        // Goal impact: check if student has an active savings goal
        let delayedGoalInfo = null;
        const activeGoal = goals.find(g => g.saved < g.target);
        if (activeGoal) {
            const weeksDelay = (plannedAmount / 500).toFixed(1);
            delayedGoalInfo = {
                goalName: activeGoal.name,
                weeksDelay: Math.max(0.5, parseFloat(weeksDelay)),
                message: `This purchase equals ~${weeksDelay} weeks of savings contributions toward "${activeGoal.name}".`
            };
        }

        const isAffordable = budget > 0 ? (simulatedMonthSpent <= budget && simulatedProjected <= budget && newSafe.safeToday >= 0) : true;

        return {
            isAffordable,
            plannedAmount,
            currentSafeToday: currentSafe.safeToday,
            newSafeToday: newSafe.safeToday,
            safeTodayDiff: newSafe.safeToday - currentSafe.safeToday,
            currentProjected,
            simulatedProjected,
            projectedDiff: simulatedProjected - currentProjected,
            delayedGoalInfo,
            verdict: isAffordable
                ? `You can afford this! You'll still have ${formatCurrency(newSafe.safeToday)} daily safe allowance.`
                : `Caution: This will put you ${formatCurrency(Math.abs(budget - simulatedProjected))} over budget by month-end.`
        };
    }

    window.SS.features.whatIf = Object.freeze({
        simulatePurchase
    });
})();
