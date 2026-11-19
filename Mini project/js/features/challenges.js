/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/challenges.js
   Namespace: window.SS.features.challenges
   Parent-Child Savings Challenges:
   Rule Evaluation (daily_cap, category_cap, no_spend_days),
   CSS-only celebration, and reward claiming.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const { repo } = window.SS;
    const { getLocalDateString, sumPaise, formatCurrency } = window.SS.utils;

    /**
     * Evaluates challenge progress against a student's actual expenses.
     * @param {Object} challenge
     * @param {Array<Object>} expenses
     * @param {string} [today=getLocalDateString()]
     * @returns {{ status: string, progress: Object, completed: boolean, failed: boolean }}
     */
    function evaluateChallengeProgress(challenge, expenses = [], today = getLocalDateString()) {
        if (!challenge || challenge.status !== 'active') {
            return {
                status: challenge ? challenge.status : 'offered',
                progress: challenge ? challenge.progress : {},
                completed: challenge ? challenge.status === 'completed' : false,
                failed: challenge ? challenge.status === 'failed' : false
            };
        }

        const rule = challenge.rule || {};
        const startDate = challenge.startDate || today;
        const targetDays = rule.days || 7;

        // Filter expenses on or after start date
        const relevantExpenses = expenses.filter(e => e.date >= startDate && e.date <= today);

        // Map by date
        const spendByDate = {};
        relevantExpenses.forEach(e => {
            if (!spendByDate[e.date]) spendByDate[e.date] = 0;
            if (rule.type === 'category_cap' && rule.category) {
                if (e.category === rule.category) {
                    spendByDate[e.date] += e.amount;
                }
            } else {
                spendByDate[e.date] += e.amount;
            }
        });

        // Compute days since start
        const startD = new Date(`${startDate}T00:00:00`);
        const todayD = new Date(`${today}T00:00:00`);
        const daysPassed = Math.max(0, Math.floor((todayD - startD) / (86400000))) + 1;

        let successfulDays = 0;
        let failed = false;

        for (let i = 0; i < Math.min(daysPassed, targetDays); i++) {
            const checkD = new Date(startD);
            checkD.setDate(checkD.getDate() + i);
            const dateStr = getLocalDateString(checkD);
            const daySpent = spendByDate[dateStr] || 0;

            if (rule.type === 'daily_cap') {
                if (daySpent <= rule.value) {
                    successfulDays++;
                } else {
                    failed = true;
                    break;
                }
            } else if (rule.type === 'no_spend_days') {
                if (daySpent === 0) {
                    successfulDays++;
                } else {
                    failed = true;
                    break;
                }
            } else if (rule.type === 'category_cap') {
                if (daySpent <= rule.value) {
                    successfulDays++;
                } else {
                    failed = true;
                    break;
                }
            }
        }

        const completed = !failed && successfulDays >= targetDays;
        const newStatus = completed ? 'completed' : (failed ? 'failed' : 'active');

        return {
            status: newStatus,
            progress: {
                currentDays: successfulDays,
                targetDays: targetDays
            },
            completed,
            failed
        };
    }

    /**
     * Triggers a lightweight CSS-only celebration confetti effect.
     */
    function triggerCelebration() {
        const container = document.createElement('div');
        container.className = 'confetti-container';

        const colors = ['#6c63ff', '#20b486', '#f5a623', '#4b8df8', '#e879b9'];
        for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}vw`;
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDuration = `${1.5 + Math.random() * 2}s`;
            piece.style.animationDelay = `${Math.random() * 0.5}s`;
            container.appendChild(piece);
        }

        document.body.appendChild(container);
        setTimeout(() => {
            container.remove();
        }, 4000);
    }

    window.SS.features.challenges = Object.freeze({
        evaluateChallengeProgress,
        triggerCelebration
    });
})();
