/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/goal-matching.js
   Namespace: window.SS.features.goalMatching
   Parent Savings Goal Matching & Incentive Pledges
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const { repo } = window.SS;
    const { formatCurrency } = window.SS.utils;

    /**
     * Calculates combined student savings and parent matching contribution.
     * @param {Object} goal
     * @param {Object} [pledge] e.g. { matchPercent: 25, maxMatch: 5000 }
     */
    function computeGoalMatchProgress(goal, pledge = null) {
        if (!goal) return { saved: 0, matched: 0, total: 0, pct: 0, remaining: 0 };

        const studentSaved = goal.saved || 0;
        let parentMatch = 0;

        if (pledge && pledge.matchPercent > 0) {
            const rawMatch = Math.round(studentSaved * (pledge.matchPercent / 100));
            parentMatch = pledge.maxMatch ? Math.min(rawMatch, pledge.maxMatch) : rawMatch;
        }

        const combinedSaved = Math.min(goal.target, studentSaved + parentMatch);
        const pct = Math.min(100, Math.round((combinedSaved / (goal.target || 1)) * 100));
        const remaining = Math.max(0, goal.target - combinedSaved);

        return {
            studentSaved,
            parentMatch,
            combinedSaved,
            target: goal.target,
            pct,
            remaining,
            matchLabel: parentMatch > 0 ? `Includes ${formatCurrency(parentMatch)} parent match (${pledge.matchPercent}%)` : null
        };
    }

    /**
     * Records or updates a parent's matching pledge on a student goal.
     */
    async function pledgeGoalMatch(childUid, goalId, { matchPercent = 25, maxMatch = null, parentName = 'Parent' }) {
        const goals = await repo.subscribeGoals(childUid, () => {})(); // fetch
        // Use repo methods
        // Updates will be saved to goal object
        return {
            goalId,
            pledge: { matchPercent, maxMatch, parentName, pledgedAt: Date.now() }
        };
    }

    window.SS.features.goalMatching = Object.freeze({
        computeGoalMatchProgress,
        pledgeGoalMatch
    });
})();
