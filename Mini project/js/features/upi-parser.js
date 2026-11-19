/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/upi-parser.js
   Namespace: window.SS.features.upiParser
   Pure-JS SMS & UPI Paste Importer
   Supports Indian Banks: HDFC, SBI, ICICI, Axis,
   Paytm, PhonePe, Google Pay, CRED
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const { CATEGORIES, KEYWORD_MAP } = window.SS.constants;
    const { getLocalDateString } = window.SS.utils;

    /**
     * Parses a bank/UPI transaction SMS text into an expense candidate.
     * @param {string} text Raw SMS or UPI text
     * @param {string} [refDate=getLocalDateString()]
     * @returns {{ ok: boolean, amount: number, merchant: string, category: string, date: string, refNo: string, raw: string, errors: string[] }}
     */
    function parseUPIsms(text, refDate = getLocalDateString()) {
        const errors = [];
        if (!text || typeof text !== 'string' || !text.trim()) {
            return {
                ok: false,
                amount: 0,
                merchant: '',
                category: 'Other',
                date: refDate,
                refNo: '',
                raw: '',
                errors: ['Empty SMS text']
            };
        }

        const clean = text.trim();

        // 1. Check if this is a DEBIT transaction
        // Reject credit / deposit alerts
        const isCredit = /\b(credited|deposited|received|refund)\b/i.test(clean) && !/\bdebited\b/i.test(clean);
        if (isCredit) {
            return {
                ok: false,
                amount: 0,
                merchant: '',
                category: 'Other',
                date: refDate,
                refNo: '',
                raw: clean,
                errors: ['SMS appears to be a credit/refund alert. Only debit expenses are logged.']
            };
        }

        // 2. Parse Amount
        // Patterns: "Rs. 150.00", "INR 450", "Rs 35.50 debited", "debited by 200.00", "debited with Rs 120", "VPA ... for Rs.250"
        let parsedAmount = 0;
        const amountRegexes = [
            /(?:rs\.?|inr|inr\.)\s*([\d,]+(?:\.\d{1,2})?)/i,
            /(?:debited\s*(?:by|with|for)?\s*(?:rs\.?|inr)?\s*)([\d,]+(?:\.\d{1,2})?)/i,
            /([\d,]+(?:\.\d{1,2})?)\s*(?:debited|spent|paid)/i
        ];

        for (const regex of amountRegexes) {
            const m = clean.match(regex);
            if (m && m[1]) {
                const num = parseFloat(m[1].replace(/,/g, ''));
                if (Number.isFinite(num) && num > 0) {
                    parsedAmount = Math.round(num * 100) / 100;
                    break;
                }
            }
        }

        if (parsedAmount <= 0) {
            errors.push('Could not detect debited amount.');
        }

        // 3. Parse Merchant / Payee / VPA
        // Patterns: "to VPA xyz@okaxis", "to SWIGGY", "at CAFE COFFEE DAY", "towards METRO", "paid to Aarav"
        let merchant = '';
        const merchantRegexes = [
            /(?:to\s+(?:vpa\s+)?|at\s+|towards\s+|paid\s+to\s+)([a-zA-Z0-9_\-\.\s]{2,35}?)(?:\s+(?:on|via|ref|upi|avl|bal|using|from|\.))/i,
            /(?:to\s+)([a-zA-Z0-9_\-\.]{2,35}@[a-zA-Z]{2,10})/i
        ];

        for (const regex of merchantRegexes) {
            const m = clean.match(regex);
            if (m && m[1]) {
                let cand = m[1].trim();
                // Clean common trailing tokens
                cand = cand.replace(/\b(vpa|ref|no|avl|bal|ac|account)\b/gi, '').trim();
                if (cand.length >= 2) {
                    merchant = cand;
                    break;
                }
            }
        }

        if (!merchant) {
            merchant = 'UPI Payment';
        }

        // 4. Parse Date
        // Patterns: "on 12-10-2026", "on 12/10/26", "on 12-Oct-26", "on 12-Oct-2026"
        let date = refDate;
        const dateMatch = clean.match(/\b(\d{1,2})[-/](\d{1,2}|[a-zA-Z]{3})[-/](\d{2,4})\b/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1], 10);
            let month = 0;
            const monPart = dateMatch[2];

            if (/^\d+$/.test(monPart)) {
                month = parseInt(monPart, 10);
            } else {
                const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                const idx = monthNames.indexOf(monPart.toLowerCase().slice(0, 3));
                if (idx !== -1) month = idx + 1;
            }

            let year = parseInt(dateMatch[3], 10);
            if (year < 100) year += 2000;

            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const candDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (candDate <= refDate) {
                    date = candDate;
                }
            }
        }

        // 5. Parse Reference / UTR Number
        let refNo = '';
        const refMatch = clean.match(/\b(?:ref|utr|txn|upi\s+ref)(?:\s+no)?[:\s]+([0-9a-zA-Z]{6,16})\b/i);
        if (refMatch && refMatch[1]) {
            refNo = refMatch[1].trim();
        }

        // 6. Intelligent Category Suggestion
        let suggestedCategory = 'Other';
        const combinedText = `${merchant} ${clean}`.toLowerCase();

        for (const cat of CATEGORIES) {
            const kws = KEYWORD_MAP[cat] || [];
            for (const kw of kws) {
                const kwLower = kw.toLowerCase();
                if (combinedText.includes(kwLower)) {
                    suggestedCategory = cat;
                    break;
                }
            }
            if (suggestedCategory !== 'Other') break;
        }

        // Standard Indian Merchant mappings
        if (/zomato|swiggy|canteen|mcdonald|domino|starbucks|chai|bakery|restaurant|food/i.test(combinedText)) {
            suggestedCategory = 'Food';
        } else if (/uber|ola|rapido|metro|irctc|redbus|petrol|fuel|indianoil|hpcl|bpcl/i.test(combinedText)) {
            suggestedCategory = 'Travel';
        } else if (/amazon|flipkart|myntra|meesho|zara|h&m|decathlon/i.test(combinedText)) {
            suggestedCategory = 'Shopping';
        } else if (/netflix|spotify|bookmyshow|pvr|inox|prime|hotstar/i.test(combinedText)) {
            suggestedCategory = 'Entertainment';
        } else if (/airtel|jio|vi|bescom|electricity|broadband|wifi/i.test(combinedText)) {
            suggestedCategory = 'Bills';
        } else if (/book|xerox|photocopy|college|tuition|udemy|coursera|exam/i.test(combinedText)) {
            suggestedCategory = 'Education';
        }

        return {
            ok: errors.length === 0 && parsedAmount > 0,
            amount: parsedAmount,
            merchant,
            title: merchant,
            category: suggestedCategory,
            date,
            refNo,
            raw: clean,
            errors
        };
    }

    window.SS.features.upiParser = Object.freeze({
        parseUPIsms
    });
})();
