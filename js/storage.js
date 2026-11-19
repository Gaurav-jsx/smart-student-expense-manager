/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/storage.js
   Namespace: window.SS.storage
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const {
        SCHEMA_VERSION,
        STORAGE_KEY,
        LEGACY_EXPENSES_KEY,
        LEGACY_BUDGET_KEY,
        BACKUP_PREFIX,
        QUARANTINE_KEY,
        MAX_BACKUPS,
        CATEGORIES,
        DEFAULT_CURRENCY
    } = window.SS.constants;

    const {
        getLocalDateString,
        getMonthKey,
        createId
    } = window.SS.utils;

    let storageListeners = [];

    /**
     * Checks if localStorage is available and writable.
     * @returns {boolean}
     */
    function isStorageAvailable() {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return false;
            }
            const testKey = '__ss_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Returns an empty, valid v2 state structure.
     * @returns {Object}
     */
    function createInitialState() {
        return {
            schemaVersion: SCHEMA_VERSION,
            expenses: [],
            budgets: {},
            categoryBudgets: {},
            recurring: [],
            goals: [],
            settings: {
                theme: 'system',
                onboarded: false,
                demoMode: false,
                currency: DEFAULT_CURRENCY
            },
            meta: {
                lastBackupAt: null,
                migratedFromV1: false
            }
        };
    }

    /**
     * Validates an expense item according to Data Model v2 specs.
     * @param {any} item
     * @param {string} [today]
     * @returns {{ valid: boolean, expense?: Object, reason?: string }}
     */
    function validateExpense(item, today = getLocalDateString()) {
        if (!item || typeof item !== 'object') {
            return { valid: false, reason: 'Not an object' };
        }

        const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : createId();
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        const amount = Number(item.amount);
        const category = typeof item.category === 'string' ? item.category.trim() : '';
        const date = typeof item.date === 'string' ? item.date.trim() : '';
        const note = typeof item.note === 'string' ? item.note.trim().slice(0, 200) : (item.note ? String(item.note).slice(0, 200) : '');

        if (!title || title.length > 80) {
            return { valid: false, reason: 'Invalid title length (1-80 chars)' };
        }
        if (!Number.isFinite(amount) || amount < 0.01 || amount > 1000000) {
            return { valid: false, reason: 'Amount out of range (0.01 - 1,000,000)' };
        }
        // Round amount to 2 decimal places maximum
        const roundedAmount = Math.round(amount * 100) / 100;

        if (!CATEGORIES.includes(category)) {
            return { valid: false, reason: 'Invalid category' };
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return { valid: false, reason: 'Invalid date format' };
        }
        if (date > today) {
            return { valid: false, reason: 'Date is in the future' };
        }

        const now = Date.now();
        const createdAt = (typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)) ? item.createdAt : now;
        const updatedAt = (typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)) ? item.updatedAt : now;
        const recurringId = typeof item.recurringId === 'string' ? item.recurringId : null;
        const splitWith = (typeof item.splitWith === 'number' && item.splitWith >= 0) ? Math.floor(item.splitWith) : 0;

        return {
            valid: true,
            expense: {
                id,
                title,
                amount: roundedAmount,
                category,
                date,
                note,
                createdAt,
                updatedAt,
                recurringId,
                splitWith
            }
        };
    }

    /**
     * Creates a timestamped backup in localStorage and trims old backups.
     * @param {Object} state
     * @returns {boolean}
     */
    function createBackup(state) {
        if (!isStorageAvailable() || !state) return false;
        try {
            const timestamp = Date.now();
            const backupKey = `${BACKUP_PREFIX}${timestamp}`;
            window.localStorage.setItem(backupKey, JSON.stringify(state));

            // Prune excess backups beyond MAX_BACKUPS
            const allKeys = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k && k.startsWith(BACKUP_PREFIX)) {
                    allKeys.push(k);
                }
            }
            allKeys.sort(); // oldest first by timestamp
            while (allKeys.length > MAX_BACKUPS) {
                const oldest = allKeys.shift();
                window.localStorage.removeItem(oldest);
            }
            return true;
        } catch (e) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn('[SmartSpend] Failed to create automatic backup:', e);
            }
            return false;
        }
    }

    /**
     * Migrates legacy data (smartSpendExpenses and smartSpendMonthlyBudget) non-destructively.
     * @returns {{ migrated: boolean, quarantinedCount: number }}
     */
    function migrateLegacyData(state) {
        if (!isStorageAvailable()) return { migrated: false, quarantinedCount: 0 };
        try {
            const legacyExpensesRaw = window.localStorage.getItem(LEGACY_EXPENSES_KEY);
            const legacyBudgetRaw = window.localStorage.getItem(LEGACY_BUDGET_KEY);

            if (!legacyExpensesRaw && !legacyBudgetRaw) {
                return { migrated: false, quarantinedCount: 0 };
            }

            const today = getLocalDateString();
            const currentMonth = getMonthKey();
            const quarantined = [];

            // Migrate expenses
            if (legacyExpensesRaw) {
                try {
                    const parsed = JSON.parse(legacyExpensesRaw);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(item => {
                            const res = validateExpense(item, today);
                            if (res.valid) {
                                state.expenses.push(res.expense);
                            } else {
                                quarantined.push({ item, reason: res.reason, quarantinedAt: Date.now() });
                            }
                        });
                    }
                } catch (e) {
                    quarantined.push({ raw: legacyExpensesRaw, error: String(e), quarantinedAt: Date.now() });
                }
            }

            // Migrate monthly budget
            if (legacyBudgetRaw) {
                const oldBudget = Number(legacyBudgetRaw);
                if (Number.isFinite(oldBudget) && oldBudget > 0) {
                    state.budgets[currentMonth] = Math.round(oldBudget);
                }
            }

            // Record quarantined items if any
            if (quarantined.length > 0) {
                try {
                    window.localStorage.setItem(QUARANTINE_KEY, JSON.stringify(quarantined));
                } catch (e) {
                    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                        console.warn('[SmartSpend] Could not save quarantine log:', e);
                    }
                }
            }

            state.meta.migratedFromV1 = true;
            return { migrated: true, quarantinedCount: quarantined.length };
        } catch (e) {
            if (typeof console !== 'undefined' && typeof console.error === 'function') {
                console.error('[SmartSpend] Migration failed:', e);
            }
            return { migrated: false, quarantinedCount: 0 };
        }
    }

    /**
     * Loads application state with validation, quarantine, and migration.
     * @returns {{ state: Object, warning: string|null }}
     */
    function load() {
        const state = createInitialState();
        let warning = null;

        if (!isStorageAvailable()) {
            return {
                state,
                warning: 'Local storage is unavailable or blocked in this browser. Changes will not be saved.'
            };
        }

        try {
            const rawV2 = window.localStorage.getItem(STORAGE_KEY);
            if (rawV2) {
                const parsed = JSON.parse(rawV2);
                if (parsed && typeof parsed === 'object') {
                    // Populate fields
                    state.schemaVersion = SCHEMA_VERSION;
                    const today = getLocalDateString();
                    const quarantined = [];

                    if (Array.isArray(parsed.expenses)) {
                        state.expenses = [];
                        parsed.expenses.forEach(item => {
                            const res = validateExpense(item, today);
                            if (res.valid) {
                                state.expenses.push(res.expense);
                            } else {
                                quarantined.push({ item, reason: res.reason, quarantinedAt: Date.now() });
                            }
                        });
                    }

                    if (quarantined.length > 0) {
                        warning = `${quarantined.length} corrupted ${quarantined.length === 1 ? 'entry was' : 'entries were'} quarantined.`;
                        try {
                            const prevQ = JSON.parse(window.localStorage.getItem(QUARANTINE_KEY) || '[]');
                            window.localStorage.setItem(QUARANTINE_KEY, JSON.stringify(prevQ.concat(quarantined)));
                        } catch (e) {}
                    }

                    if (parsed.budgets && typeof parsed.budgets === 'object') {
                        state.budgets = { ...parsed.budgets };
                    }
                    if (parsed.categoryBudgets && typeof parsed.categoryBudgets === 'object') {
                        state.categoryBudgets = { ...parsed.categoryBudgets };
                    }
                    if (Array.isArray(parsed.recurring)) {
                        state.recurring = parsed.recurring.filter(r => r && typeof r.title === 'string' && Number(r.amount) > 0);
                    }
                    if (Array.isArray(parsed.goals)) {
                        state.goals = parsed.goals.filter(g => g && typeof g.name === 'string');
                    }
                    if (parsed.settings && typeof parsed.settings === 'object') {
                        state.settings = { ...state.settings, ...parsed.settings };
                    }
                    if (parsed.meta && typeof parsed.meta === 'object') {
                        state.meta = { ...state.meta, ...parsed.meta };
                    }
                    return { state, warning };
                }
            }

            // No v2 found: attempt migration from legacy keys
            const migrationResult = migrateLegacyData(state);
            if (migrationResult.migrated) {
                save(state);
                if (migrationResult.quarantinedCount > 0) {
                    warning = `Migrated existing data. ${migrationResult.quarantinedCount} corrupted entries were quarantined.`;
                }
            }
        } catch (err) {
            if (typeof console !== 'undefined' && typeof console.error === 'function') {
                console.error('[SmartSpend] Failed to parse stored state:', err);
            }
            // Move corrupted raw data to quarantine
            try {
                const corruptedRaw = window.localStorage.getItem(STORAGE_KEY);
                if (corruptedRaw) {
                    window.localStorage.setItem(QUARANTINE_KEY, JSON.stringify([{ raw: corruptedRaw, error: String(err), quarantinedAt: Date.now() }]));
                }
            } catch (e) {}
            warning = 'Stored data was corrupted and has been safely quarantined. A fresh workspace was initialized.';
        }

        return { state, warning };
    }

    /**
     * Saves the entire state to localStorage safely.
     * @param {Object} state
     * @returns {{ ok: boolean, error?: string }}
     */
    function save(state) {
        if (!isStorageAvailable()) {
            return { ok: false, error: 'Storage unavailable' };
        }
        try {
            state.schemaVersion = SCHEMA_VERSION;
            const serialized = JSON.stringify(state);
            window.localStorage.setItem(STORAGE_KEY, serialized);
            return { ok: true };
        } catch (error) {
            if (typeof console !== 'undefined' && typeof console.error === 'function') {
                console.error('[SmartSpend] Storage save failed:', error);
            }
            const isQuota = error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
            return {
                ok: false,
                error: isQuota ? 'Storage quota exceeded. Please export and clean up older entries.' : 'Could not save data to browser storage.'
            };
        }
    }

    /**
     * Subscribes to storage changes across tabs.
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    function onStorageChange(callback) {
        if (typeof window === 'undefined') return () => {};
        const handler = (event) => {
            if (event.key === STORAGE_KEY && event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    callback(parsed);
                } catch (e) {}
            }
        };
        window.addEventListener('storage', handler);
        storageListeners.push(handler);
        return () => {
            window.removeEventListener('storage', handler);
            storageListeners = storageListeners.filter(h => h !== handler);
        };
    }

    /**
     * Generates a JSON export string of the current state.
     * @param {Object} state
     * @returns {string}
     */
    function exportJSON(state) {
        return JSON.stringify({
            app: 'SmartSpend',
            exportedAt: new Date().toISOString(),
            version: SCHEMA_VERSION,
            data: state
        }, null, 2);
    }

    /**
     * Imports state from a JSON string with validation and choice of merge or replace.
     * Creates an automatic backup before modifying.
     * @param {string} jsonString
     * @param {Object} currentState
     * @param {'merge'|'replace'} mode
     * @returns {{ ok: boolean, state?: Object, error?: string, counts?: Object }}
     */
    function importJSON(jsonString, currentState, mode = 'merge') {
        if (!jsonString || typeof jsonString !== 'string') {
            return { ok: false, error: 'Invalid or empty JSON file.' };
        }
        let parsedPayload;
        try {
            parsedPayload = JSON.parse(jsonString);
        } catch (e) {
            return { ok: false, error: 'File is not valid JSON.' };
        }

        const source = parsedPayload.data || parsedPayload;
        if (!source || typeof source !== 'object') {
            return { ok: false, error: 'Unrecognized SmartSpend backup structure.' };
        }

        // Backup existing state
        createBackup(currentState);

        const targetState = mode === 'replace' ? createInitialState() : JSON.parse(JSON.stringify(currentState));
        const today = getLocalDateString();
        let addedExpenses = 0;

        if (Array.isArray(source.expenses)) {
            const existingIds = new Set(targetState.expenses.map(e => e.id));
            source.expenses.forEach(item => {
                const res = validateExpense(item, today);
                if (res.valid) {
                    if (mode === 'replace' || !existingIds.has(res.expense.id)) {
                        targetState.expenses.push(res.expense);
                        existingIds.add(res.expense.id);
                        addedExpenses++;
                    }
                }
            });
        }

        if (source.budgets && typeof source.budgets === 'object') {
            targetState.budgets = { ...targetState.budgets, ...source.budgets };
        }
        if (source.categoryBudgets && typeof source.categoryBudgets === 'object') {
            targetState.categoryBudgets = { ...targetState.categoryBudgets, ...source.categoryBudgets };
        }
        if (Array.isArray(source.recurring)) {
            targetState.recurring = mode === 'replace' ? source.recurring : [...targetState.recurring, ...source.recurring.filter(r => !targetState.recurring.some(tr => tr.id === r.id))];
        }
        if (Array.isArray(source.goals)) {
            targetState.goals = mode === 'replace' ? source.goals : [...targetState.goals, ...source.goals.filter(g => !targetState.goals.some(tg => tg.id === g.id))];
        }

        const saveRes = save(targetState);
        if (!saveRes.ok) {
            return { ok: false, error: saveRes.error };
        }

        return {
            ok: true,
            state: targetState,
            counts: {
                expenses: addedExpenses,
                totalExpenses: targetState.expenses.length
            }
        };
    }

    /**
     * Converts a list of expenses to CSV format.
     * @param {Array<Object>} expenses
     * @returns {string}
     */
    function exportCSV(expenses) {
        const headers = ['ID', 'Date', 'Title', 'Category', 'Amount (INR)', 'Note', 'Split With (People)', 'Recurring'];
        const rows = [headers.join(',')];

        (expenses || []).forEach(e => {
            const row = [
                `"${(e.id || '').replace(/"/g, '""')}"`,
                `"${e.date || ''}"`,
                `"${(e.title || '').replace(/"/g, '""')}"`,
                `"${(e.category || '').replace(/"/g, '""')}"`,
                e.amount !== undefined ? e.amount : '',
                `"${(e.note || '').replace(/"/g, '""')}"`,
                e.splitWith || 0,
                e.recurringId ? 'Yes' : 'No'
            ];
            rows.push(row.join(','));
        });

        return rows.join('\r\n');
    }

    window.SS.storage = Object.freeze({
        isStorageAvailable,
        createInitialState,
        validateExpense,
        createBackup,
        load,
        save,
        onStorageChange,
        exportJSON,
        importJSON,
        exportCSV
    });
})();
