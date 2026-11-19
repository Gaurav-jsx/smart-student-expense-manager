/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/utils.js
   Namespace: window.SS.utils
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    /**
     * Converts a rupee amount (which may have up to 2 decimals) into integer paise.
     * @param {number} rupees
     * @returns {number} Integer paise
     */
    function toPaise(rupees) {
        if (typeof rupees !== 'number' || !Number.isFinite(rupees)) {
            return 0;
        }
        return Math.round((rupees + Number.EPSILON) * 100);
    }

    /**
     * Converts integer paise back into rupees with floating precision.
     * @param {number} paise
     * @returns {number} Rupees
     */
    function fromPaise(paise) {
        if (typeof paise !== 'number' || !Number.isFinite(paise)) {
            return 0;
        }
        return Math.round(paise) / 100;
    }

    /**
     * Sums an array of items or numbers in paise.
     * @param {Array<number|Object>} list
     * @param {string} [prop] Optional property name if list contains objects
     * @returns {number} Sum in rupees
     */
    function sumPaise(list, prop) {
        if (!Array.isArray(list) || list.length === 0) {
            return 0;
        }
        const totalPaise = list.reduce((acc, item) => {
            const val = prop ? (item && item[prop]) : item;
            const num = Number(val);
            if (Number.isFinite(num)) {
                return acc + toPaise(num);
            }
            return acc;
        }, 0);
        return fromPaise(totalPaise);
    }

    /**
     * Formats rupee amount as Indian currency (INR).
     * Omit paise if whole number (e.g. ₹120 instead of ₹120.00).
     * @param {number} amount
     * @returns {string} Formatted string
     */
    function formatCurrency(amount) {
        const num = Number(amount);
        if (!Number.isFinite(num)) {
            return '₹0';
        }
        const hasPaise = Math.round(num * 100) % 100 !== 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: hasPaise ? 2 : 0,
            maximumFractionDigits: 2
        }).format(num);
    }

    /**
     * Compact currency representation (e.g., ₹1.5k, ₹2.4L).
     * @param {number} amount
     * @returns {string}
     */
    function formatCompactCurrency(amount) {
        const num = Number(amount);
        if (!Number.isFinite(num)) {
            return '\u20B90';
        }
        const abs = Math.abs(num);
        const sign = num < 0 ? '-' : '';

        if (abs >= 100000) {
            const val = (abs / 100000).toFixed(1).replace(/\.0$/, '');
            return `${sign}\u20B9${val}L`;
        }
        if (abs >= 1000) {
            const val = (abs / 1000).toFixed(1).replace(/\.0$/, '');
            return `${sign}\u20B9${val}k`;
        }
        return `${sign}\u20B9${Math.round(abs)}`;
    }

    /**
     * Returns local date string in YYYY-MM-DD.
     * @param {Date} [date=new Date()]
     * @returns {string}
     */
    function getLocalDateString(date = new Date()) {
        const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Returns month key YYYY-MM from Date.
     * @param {Date} [date=new Date()]
     * @returns {string}
     */
    function getMonthKey(date = new Date()) {
        const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    /**
     * Extracts YYYY-MM from YYYY-MM-DD string.
     * @param {string} dateString
     * @returns {string}
     */
    function getMonthKeyFromDate(dateString) {
        if (typeof dateString === 'string' && /^\d{4}-\d{2}/.test(dateString)) {
            return dateString.slice(0, 7);
        }
        return getMonthKey();
    }

    /**
     * Formats a YYYY-MM-DD date string nicely.
     * @param {string} dateString
     * @returns {string}
     */
    function formatDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);

        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    /**
     * Formats a YYYY-MM key into human-readable e.g. "October 2026".
     * @param {string} monthKey
     * @returns {string}
     */
    function formatMonthLabel(monthKey) {
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return '';
        const [yearStr, monthStr] = monthKey.split('-');
        const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        return date.toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric'
        });
    }

    /**
     * Get total days in a month for a YYYY-MM key.
     * @param {string} monthKey YYYY-MM
     * @returns {number}
     */
    function getDaysInMonth(monthKey) {
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return 30;
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10); // 1-based, passing to Day 0 of next month gives last day
        return new Date(year, month, 0).getDate();
    }

    /**
     * Checks if a date string is strictly in the future compared to reference date (default today).
     * @param {string} dateString YYYY-MM-DD
     * @param {string} [refDateString] YYYY-MM-DD
     * @returns {boolean}
     */
    function isFutureDate(dateString, refDateString = getLocalDateString()) {
        if (!dateString || !refDateString) return false;
        return dateString > refDateString;
    }

    /**
     * Shifts a YYYY-MM key by offset months.
     * @param {string} monthKey
     * @param {number} offset
     * @returns {string}
     */
    function shiftMonthKey(monthKey, offset) {
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
            monthKey = getMonthKey();
        }
        const [y, m] = monthKey.split('-').map(Number);
        const date = new Date(y, m - 1 + offset, 1);
        return getMonthKey(date);
    }

    /**
     * Escapes HTML entities for safe inclusion.
     * @param {string} str
     * @returns {string}
     */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Generates a unique ID with feature detection.
     * @returns {string}
     */
    function createId() {
        if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
            try {
                return window.crypto.randomUUID();
            } catch (e) {
                // fallback below
            }
        }
        return 'ss_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    }

    /**
     * Debounces a function execution.
     * @param {Function} func
     * @param {number} waitMs
     * @returns {Function}
     */
    function debounce(func, waitMs = 150) {
        let timeoutId = null;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, waitMs);
        };
    }

    /**
     * Clamps a number between min and max.
     * @param {number} val
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    function clamp(val, min, max) {
        return Math.min(Math.max(val, min), max);
    }

    window.SS.utils = Object.freeze({
        toPaise,
        fromPaise,
        sumPaise,
        formatCurrency,
        formatCompactCurrency,
        getLocalDateString,
        getMonthKey,
        getMonthKeyFromDate,
        formatDate,
        formatMonthLabel,
        getDaysInMonth,
        isFutureDate,
        shiftMonthKey,
        escapeHTML,
        createId,
        debounce,
        clamp
    });
})();
