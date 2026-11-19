/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/repo.js
   Namespace: window.SS.repo
   Repository Facade: Seamlessly delegates all data requests
   to either the Cloud (Firebase) or Local Demo adapter.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    function getActiveAdapter() {
        const fb = window.SS.adapters && window.SS.adapters.firebase;
        if (fb && fb.isCloudActive()) {
            return fb.repo;
        }
        return window.SS.adapters.local.repo;
    }

    const repo = {
        // --- Profile ---
        getProfile(uid) {
            return getActiveAdapter().getProfile(uid);
        },
        updateProfile(uid, data) {
            return getActiveAdapter().updateProfile(uid, data);
        },

        // --- Expenses ---
        subscribeExpenses(uid, cb) {
            return getActiveAdapter().subscribeExpenses(uid, cb);
        },
        getExpenses(uid) {
            return getActiveAdapter().getExpenses(uid);
        },
        addExpense(uid, expense) {
            return getActiveAdapter().addExpense(uid, expense);
        },
        updateExpense(uid, expense) {
            return getActiveAdapter().updateExpense(uid, expense);
        },
        removeExpense(uid, expenseId) {
            return getActiveAdapter().removeExpense(uid, expenseId);
        },
        bulkImportExpenses(uid, expenses) {
            return getActiveAdapter().bulkImportExpenses(uid, expenses);
        },

        // --- Budgets ---
        subscribeBudgets(uid, cb) {
            return getActiveAdapter().subscribeBudgets(uid, cb);
        },
        getBudgets(uid) {
            return getActiveAdapter().getBudgets(uid);
        },
        setMonthBudget(uid, monthKey, amount) {
            return getActiveAdapter().setMonthBudget(uid, monthKey, amount);
        },

        // --- Category Budgets & Caps ---
        subscribeCategoryBudgets(uid, cb) {
            return getActiveAdapter().subscribeCategoryBudgets(uid, cb);
        },
        setCategoryBudgets(uid, caps) {
            return getActiveAdapter().setCategoryBudgets(uid, caps);
        },

        // --- Goals ---
        subscribeGoals(uid, cb) {
            return getActiveAdapter().subscribeGoals(uid, cb);
        },
        getGoals(uid) {
            return getActiveAdapter().getGoals ? getActiveAdapter().getGoals(uid) : Promise.resolve([]);
        },
        saveGoals(uid, goals) {
            return getActiveAdapter().saveGoals(uid, goals);
        },

        // --- Recurring ---
        subscribeRecurring(uid, cb) {
            return getActiveAdapter().subscribeRecurring(uid, cb);
        },
        getRecurring(uid) {
            return getActiveAdapter().getRecurring ? getActiveAdapter().getRecurring(uid) : Promise.resolve([]);
        },
        saveRecurring(uid, recurring) {
            return getActiveAdapter().saveRecurring(uid, recurring);
        },

        // --- Linking & Invites ---
        createInvite(childUid, childName) {
            return getActiveAdapter().createInvite(childUid, childName);
        },
        redeemInvite(parentUid, parentName, code) {
            return getActiveAdapter().redeemInvite(parentUid, parentName, code);
        },
        listLinksForChild(childUid) {
            return getActiveAdapter().listLinksForChild(childUid);
        },
        listLinksForParent(parentUid) {
            return getActiveAdapter().listLinksForParent(parentUid);
        },
        getLinks(uid) {
            return getActiveAdapter().getLinks ? getActiveAdapter().getLinks(uid) : getActiveAdapter().listLinksForParent(uid);
        },
        subscribeLinks(uid, cb) {
            return getActiveAdapter().subscribeLinks(uid, cb);
        },
        setShareLevel(childUid, parentUid, shareLevel) {
            return getActiveAdapter().setShareLevel(childUid, parentUid, shareLevel);
        },
        revokeLink(childUid, parentUid) {
            return getActiveAdapter().revokeLink(childUid, parentUid);
        },

        // --- Controls ---
        subscribeControls(childUid, parentUid, cb) {
            return getActiveAdapter().subscribeControls(childUid, parentUid, cb);
        },
        getControls(childUid, parentUid) {
            return getActiveAdapter().getControls(childUid, parentUid);
        },
        setControls(childUid, parentUid, data) {
            return getActiveAdapter().setControls(childUid, parentUid, data);
        },
        saveControls(childUid, data, parentUid) {
            return getActiveAdapter().saveControls ? getActiveAdapter().saveControls(childUid, data, parentUid) : getActiveAdapter().setControls(childUid, parentUid || 'parent_1', data);
        },

        // --- Requests ---
        subscribeRequests(childUid, cb) {
            return getActiveAdapter().subscribeRequests(childUid, cb);
        },
        getRequests(childUid) {
            return getActiveAdapter().getRequests ? getActiveAdapter().getRequests(childUid) : Promise.resolve([]);
        },
        createRequest(childUid, data) {
            return getActiveAdapter().createRequest(childUid, data);
        },
        decideRequest(childUid, requestId, decision) {
            return getActiveAdapter().decideRequest(childUid, requestId, decision);
        },
        markRequestApplied(childUid, requestId) {
            return getActiveAdapter().markRequestApplied(childUid, requestId);
        },

        // --- Challenges ---
        subscribeChallenges(childUid, cb) {
            return getActiveAdapter().subscribeChallenges(childUid, cb);
        },
        getChallenges(childUid) {
            return getActiveAdapter().getChallenges ? getActiveAdapter().getChallenges(childUid) : Promise.resolve([]);
        },
        offerChallenge(childUid, data) {
            return getActiveAdapter().offerChallenge(childUid, data);
        },
        respondChallenge(childUid, challengeId, status) {
            return getActiveAdapter().respondChallenge(childUid, challengeId, status);
        },

        // --- Alerts ---
        subscribeAlerts(childUid, cb) {
            return getActiveAdapter().subscribeAlerts(childUid, cb);
        },
        getAlerts(childUid) {
            return getActiveAdapter().getAlerts ? getActiveAdapter().getAlerts(childUid) : Promise.resolve([]);
        },
        raiseAlert(childUid, alert) {
            return getActiveAdapter().raiseAlert(childUid, alert);
        },
        markAlertRead(childUid, alertId, parentUid) {
            return getActiveAdapter().markAlertRead(childUid, alertId, parentUid);
        }
    };

    window.SS.repo = Object.freeze(repo);
})();
