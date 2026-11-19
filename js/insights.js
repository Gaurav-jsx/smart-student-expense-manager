/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/insights.js
   Namespace: window.SS.insights
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const {
        toPaise,
        fromPaise,
        sumPaise,
        getMonthKey,
        getMonthKeyFromDate,
        getLocalDateString,
        getDaysInMonth,
        shiftMonthKey
    } = window.SS.utils;

    /**
     * Filters expenses belonging to a specific month.
     * Takes splitWith into account: user's share = amount / (splitWith + 1).
     * @param {Array<Object>} expenses
     * @param {string} monthKey YYYY-MM
     * @param {boolean} [myShareOnly=true]
     * @returns {Array<Object>}
     */
    function getExpensesForMonth(expenses, monthKey, myShareOnly = true) {
        if (!Array.isArray(expenses) || !monthKey) return [];
        return expenses.filter(e => {
            return e && getMonthKeyFromDate(e.date) === monthKey;
        }).map(e => {
            if (!myShareOnly) return e;
            const split = (typeof e.splitWith === 'number' && e.splitWith > 0) ? e.splitWith : 0;
            const myShare = Math.round((toPaise(e.amount) / (split + 1))) / 100;
            return {
                ...e,
                effectiveAmount: myShare,
                isSplit: split > 0,
                splitWith: split
            };
        });
    }

    /**
     * Computes the Safe-to-Spend Today amount.
     * Formula:
     *   daysInMonth, dayOfMonth, daysLeft = daysInMonth - dayOfMonth + 1
     *   safeToday = max(0, budget - spentBeforeToday) / daysLeft
     *   remainingToday = safeToday - spentToday (can go negative -> over by ₹X)
     * @param {Object} params
     * @returns {Object}
     */
    function calculateSafeToSpend({ budget = 0, expenses = [], selectedMonth, today = getLocalDateString() }) {
        const todayMonth = today.slice(0, 7);
        const month = selectedMonth || todayMonth;
        const isCurrentMonth = month === todayMonth;

        const totalDays = getDaysInMonth(month);
        let dayOfMonth = totalDays;
        if (isCurrentMonth) {
            dayOfMonth = parseInt(today.split('-')[2], 10) || 1;
        } else if (month > todayMonth) {
            dayOfMonth = 1;
        }

        const daysLeft = Math.max(1, totalDays - dayOfMonth + 1);

        const monthExpenses = getExpensesForMonth(expenses, month, true);
        const spentTodayPaise = monthExpenses
            .filter(e => e.date === today)
            .reduce((acc, e) => acc + toPaise(e.effectiveAmount || e.amount), 0);

        const spentBeforeTodayPaise = monthExpenses
            .filter(e => e.date < today)
            .reduce((acc, e) => acc + toPaise(e.effectiveAmount || e.amount), 0);

        const totalSpentPaise = spentBeforeTodayPaise + spentTodayPaise;
        const budgetPaise = toPaise(budget);

        if (budget <= 0) {
            return {
                hasBudget: false,
                safeToday: 0,
                spentToday: fromPaise(spentTodayPaise),
                remainingToday: 0,
                daysLeft,
                status: 'no_budget',
                message: 'Set a monthly budget to calculate your daily allowance.'
            };
        }

        const unspentBeforeTodayPaise = Math.max(0, budgetPaise - spentBeforeTodayPaise);
        const dailyAllowancePaise = Math.floor(unspentBeforeTodayPaise / daysLeft);
        const remainingTodayPaise = dailyAllowancePaise - spentTodayPaise;

        const safeToday = fromPaise(dailyAllowancePaise);
        const remainingToday = fromPaise(remainingTodayPaise);
        const spentToday = fromPaise(spentTodayPaise);

        let status = 'good';
        let message = `You can safely spend up to ₹${safeToday.toLocaleString('en-IN')} today.`;

        if (remainingTodayPaise < 0) {
            status = 'danger';
            message = `Over daily limit by ₹${Math.abs(remainingToday).toLocaleString('en-IN')} today.`;
        } else if (remainingTodayPaise === 0 && spentTodayPaise > 0) {
            status = 'warning';
            message = 'You have used up today’s safe allowance.';
        } else if (dailyAllowancePaise <= 0) {
            status = 'exceeded';
            message = 'Monthly budget already exceeded; limit further discretionary spends.';
        }

        return {
            hasBudget: true,
            isCurrentMonth,
            safeToday,
            spentToday,
            remainingToday,
            daysLeft,
            status,
            message
        };
    }

    /**
     * Computes Month-end projection and pace.
     * projection = spent / dayOfMonth * daysInMonth (for dayOfMonth >= 3)
     */
    function calculateProjection({ spent = 0, dayOfMonth = 1, daysInMonth = 30, budget = 0 }) {
        if (dayOfMonth < 3 || spent <= 0) {
            return null;
        }
        const dailyRate = spent / dayOfMonth;
        const projectedTotal = Math.round(dailyRate * daysInMonth);
        const hasBudget = budget > 0;
        const diff = hasBudget ? projectedTotal - budget : 0;

        return {
            dailyRate: Math.round(dailyRate),
            projectedTotal,
            hasBudget,
            diff,
            isOver: diff > 0,
            text: hasBudget
                ? (diff > 0
                    ? `At this pace you'll finish ₹${diff.toLocaleString('en-IN')} over budget.`
                    : `At this pace you'll finish ₹${Math.abs(diff).toLocaleString('en-IN')} under budget.`)
                : `Projected month-end spending: ₹${projectedTotal.toLocaleString('en-IN')}`
        };
    }

    /**
     * Calculates Money Health Score (0 - 100).
     * 40 pts budget adherence, 20 pts consistency, 20 pts category balance, 20 pts trend.
     */
    function calculateHealthScore({ budget = 0, expenses = [], selectedMonth, lastMonthExpenses = [], today = getLocalDateString() }) {
        const curMonth = getMonthKey();
        const month = selectedMonth || curMonth;
        const isCurrentMonth = month === curMonth;
        const totalDays = getDaysInMonth(month);
        const dayOfMonth = isCurrentMonth ? (parseInt(today.split('-')[2], 10) || 1) : totalDays;

        const currentExpenses = getExpensesForMonth(expenses, month, true);
        const spent = currentExpenses.reduce((sum, e) => sum + (e.effectiveAmount || e.amount), 0);

        if (currentExpenses.length === 0) {
            return {
                score: 70,
                rating: 'Good',
                improvementTip: 'Log daily expenses to unlock a detailed health assessment.',
                breakdown: { budgetScore: 40, consistencyScore: 10, balanceScore: 20, trendScore: 0 }
            };
        }

        // 1. Budget Adherence (40 pts)
        let budgetScore = 40;
        if (budget > 0) {
            const expectedPace = (budget / totalDays) * dayOfMonth;
            const ratio = spent / (expectedPace || 1);
            if (ratio <= 1.0) {
                budgetScore = 40;
            } else if (ratio >= 1.3) {
                budgetScore = 0;
            } else {
                budgetScore = Math.round(40 * (1 - (ratio - 1.0) / 0.3));
            }
        } else {
            // Scaled if no budget set
            budgetScore = null;
        }

        // 2. Consistency (20 pts) - logging on >= 70% of days up to current day
        const daysLogged = new Set(currentExpenses.map(e => e.date)).size;
        const consistencyRatio = Math.min(1, daysLogged / Math.max(1, dayOfMonth));
        const consistencyScore = consistencyRatio >= 0.7
            ? 20
            : Math.round(20 * (consistencyRatio / 0.7));

        // 3. Category Balance (20 pts) - no category > 50% except Food/Bills
        const catTotals = {};
        currentExpenses.forEach(e => {
            catTotals[e.category] = (catTotals[e.category] || 0) + (e.effectiveAmount || e.amount);
        });
        let balanceScore = 20;
        let dominantCat = '';
        Object.entries(catTotals).forEach(([cat, val]) => {
            const share = spent > 0 ? val / spent : 0;
            if (share > 0.50 && cat !== 'Food' && cat !== 'Bills') {
                balanceScore = 8;
                dominantCat = cat;
            }
        });

        // 4. Trend (20 pts) - pace <= last month's pace
        let trendScore = 15;
        if (lastMonthExpenses && lastMonthExpenses.length > 0) {
            const lastMonthSpent = lastMonthExpenses.reduce((sum, e) => sum + (e.effectiveAmount || e.amount), 0);
            const lastMonthPace = lastMonthSpent / getDaysInMonth(shiftMonthKey(month, -1));
            const curPace = spent / Math.max(1, dayOfMonth);
            trendScore = curPace <= lastMonthPace ? 20 : Math.max(5, Math.round(20 * (lastMonthPace / curPace)));
        }

        let totalScore = 0;
        if (budgetScore === null) {
            // 60 pts scaled to 100
            const rawScore = consistencyScore + balanceScore + trendScore;
            totalScore = Math.min(100, Math.round((rawScore / 60) * 100));
        } else {
            totalScore = Math.min(100, budgetScore + consistencyScore + balanceScore + trendScore);
        }

        let rating = 'Needs Attention';
        let improvementTip = 'Keep non-essential spending low and stick to your budget.';
        if (totalScore >= 80) {
            rating = 'Excellent';
            improvementTip = 'Superb financial discipline! You are well within your limits.';
        } else if (totalScore >= 60) {
            rating = 'Good';
            if (dominantCat) {
                improvementTip = `High spending on ${dominantCat}. Try pacing purchases.`;
            } else if (consistencyRatio < 0.7) {
                improvementTip = 'Log transactions daily to maintain accurate tracking.';
            } else {
                improvementTip = 'Moderate spending on discretionary activities to boost savings.';
            }
        }

        return {
            score: totalScore,
            rating,
            improvementTip,
            breakdown: {
                budgetScore: budgetScore !== null ? budgetScore : 0,
                consistencyScore,
                balanceScore,
                trendScore
            }
        };
    }

    /**
     * Anomaly detection: expense > 2.5 * category median (needs >= 5 entries in category).
     */
    function detectAnomalies(expenses, selectedMonth) {
        if (!Array.isArray(expenses) || expenses.length < 5) return [];
        const monthExpenses = getExpensesForMonth(expenses, selectedMonth, false);

        // Group by category
        const byCategory = {};
        monthExpenses.forEach(e => {
            if (!byCategory[e.category]) byCategory[e.category] = [];
            byCategory[e.category].push(e);
        });

        const anomalies = [];
        Object.entries(byCategory).forEach(([cat, list]) => {
            if (list.length >= 5) {
                const amounts = list.map(e => e.amount).sort((a, b) => a - b);
                const mid = Math.floor(amounts.length / 2);
                const median = amounts.length % 2 !== 0
                    ? amounts[mid]
                    : (amounts[mid - 1] + amounts[mid]) / 2;

                const threshold = 2.5 * median;
                list.forEach(e => {
                    if (e.amount > threshold && e.amount > 500) {
                        anomalies.push({
                            expense: e,
                            median,
                            ratio: (e.amount / median).toFixed(1)
                        });
                    }
                });
            }
        });

        return anomalies;
    }

    /**
     * Computes consecutive logging streaks and no-spend days.
     */
    function calculateStreaks(expenses, today = getLocalDateString()) {
        if (!Array.isArray(expenses) || expenses.length === 0) {
            return { currentStreak: 0, noSpendDaysThisMonth: 0 };
        }

        const datesLogged = new Set(expenses.map(e => e.date));

        // Calculate consecutive streak backwards from today
        let streak = 0;
        let checkDate = new Date(`${today}T00:00:00`);

        // If today is not logged yet, check if yesterday was logged to preserve streak
        const todayStr = getLocalDateString(checkDate);
        if (!datesLogged.has(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const str = getLocalDateString(checkDate);
            if (datesLogged.has(str)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // Calculate no-spend days for current month up to today
        const curMonth = getMonthKey();
        const curDay = parseInt(today.split('-')[2], 10) || 1;
        let noSpendCount = 0;
        for (let d = 1; d <= curDay; d++) {
            const dayStr = `${curMonth}-${String(d).padStart(2, '0')}`;
            if (!datesLogged.has(dayStr)) {
                noSpendCount++;
            }
        }

        return {
            currentStreak: streak,
            noSpendDaysThisMonth: noSpendCount
        };
    }

    /**
     * Evaluates which badges the student has unlocked based on real data.
     */
    function calculateBadges({ expenses = [], streaks = {}, budgets = {}, goals = [] }) {
        const unlocked = [];
        const totalCount = expenses.length;

        if (totalCount >= 1) {
            unlocked.push('first_expense');
        }
        if (streaks.currentStreak >= 7) {
            unlocked.push('streak_7');
        }
        if (totalCount >= 10) {
            unlocked.push('entries_10');
        }
        if (goals.some(g => g.saved >= g.target && g.target > 0)) {
            unlocked.push('goal_reached');
        }

        // Check if any prior month finished under budget
        const curMonth = getMonthKey();
        Object.entries(budgets).forEach(([mKey, bgt]) => {
            if (mKey < curMonth && bgt > 0) {
                const monthSpent = sumPaise(getExpensesForMonth(expenses, mKey, true), 'effectiveAmount');
                if (monthSpent > 0 && monthSpent <= bgt) {
                    if (!unlocked.includes('under_budget')) {
                        unlocked.push('under_budget');
                    }
                }
            }
        });

        return unlocked;
    }

    /**
     * Synthesizes actionable, contextual student financial insights.
     */
    function generateInsights({ budget = 0, expenses = [], categoryBudgets = {}, selectedMonth, today = getLocalDateString(), goals = [] }) {
        const monthExpenses = getExpensesForMonth(expenses, selectedMonth, true);
        const insights = [];

        if (monthExpenses.length < 3) {
            return [
                {
                    type: 'info',
                    icon: '💡',
                    title: 'Unlock Smart Insights',
                    text: 'Add at least 3 expenses in this month to unlock projections, anomalies, and student tips.'
                }
            ];
        }

        const totalSpent = sumPaise(monthExpenses, 'effectiveAmount');
        const daysInMonth = getDaysInMonth(selectedMonth);
        const isCur = selectedMonth === getMonthKey();
        const dayOfMonth = isCur ? (parseInt(today.split('-')[2], 10) || 1) : daysInMonth;

        // 1. Month-end Projection
        const proj = calculateProjection({ spent: totalSpent, dayOfMonth, daysInMonth, budget });
        if (proj) {
            insights.push({
                type: proj.isOver ? 'warning' : 'success',
                icon: proj.isOver ? '⚠️' : '📈',
                title: 'Spending Forecast',
                text: proj.text
            });
        }

        // 2. Top Spending Category
        const catMap = {};
        monthExpenses.forEach(e => {
            catMap[e.category] = (catMap[e.category] || 0) + (e.effectiveAmount || e.amount);
        });
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        if (sortedCats.length > 0 && totalSpent > 0) {
            const topCat = sortedCats[0];
            const share = Math.round((topCat[1] / totalSpent) * 100);
            insights.push({
                type: 'info',
                icon: '📊',
                title: 'Top Expenditure',
                text: `${topCat[0]} is your largest category at ₹${Math.round(topCat[1]).toLocaleString('en-IN')} (${share}% of this month).`
            });
        }

        // 3. Category Budgets Warnings
        if (categoryBudgets && typeof categoryBudgets === 'object') {
            Object.entries(categoryBudgets).forEach(([cat, cap]) => {
                if (cap > 0 && catMap[cat]) {
                    const pct = Math.round((catMap[cat] / cap) * 100);
                    if (pct >= 100) {
                        insights.push({
                            type: 'danger',
                            icon: '🚨',
                            title: `${cat} Cap Exceeded`,
                            text: `You have spent ₹${Math.round(catMap[cat]).toLocaleString('en-IN')} of your ₹${cap.toLocaleString('en-IN')} limit (${pct}%).`
                        });
                    } else if (pct >= 80) {
                        insights.push({
                            type: 'warning',
                            icon: '🔔',
                            title: `${cat} Warning`,
                            text: `You have reached ${pct}% of your ${cat} budget limit.`
                        });
                    }
                }
            });
        }

        // 4. Anomalies
        const anomalies = detectAnomalies(expenses, selectedMonth);
        if (anomalies.length > 0) {
            const topAnomaly = anomalies[0];
            insights.push({
                type: 'warning',
                icon: '⚡',
                title: 'Unusual Expense Detected',
                text: `"${topAnomaly.expense.title}" (₹${topAnomaly.expense.amount.toLocaleString('en-IN')}) is ${topAnomaly.ratio}x higher than typical ${topAnomaly.expense.category} spends.`
            });
        }

        // 5. Goals progress tip
        if (goals && goals.length > 0) {
            const activeGoal = goals.find(g => g.saved < g.target);
            if (activeGoal) {
                const remaining = activeGoal.target - activeGoal.saved;
                insights.push({
                    type: 'success',
                    icon: '🎯',
                    title: `Goal: ${activeGoal.name}`,
                    text: `₹${remaining.toLocaleString('en-IN')} left to reach your target. Keep up the momentum!`
                });
            }
        }

        return insights.slice(0, 5);
    }

    window.SS.insights = Object.freeze({
        getExpensesForMonth,
        calculateSafeToSpend,
        calculateProjection,
        calculateHealthScore,
        detectAnomalies,
        calculateStreaks,
        calculateBadges,
        generateInsights
    });
})();

