/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/parser.js
   Namespace: window.SS.parser
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const {
        CATEGORIES,
        KEYWORD_MAP
    } = window.SS.constants;

    const {
        getLocalDateString
    } = window.SS.utils;

    /**
     * Parses natural language quick-add text.
     * Examples:
     * - "chai 20"
     * - "auto 40 yesterday"
     * - "pizza 450 with 3 friends"
     * - "kal mess 1500"
     * - "netflix 199"
     *
     * @param {string} input Raw text input
     * @param {string} [today=getLocalDateString()] Current reference date
     * @returns {{ ok: boolean, title: string, amount: number, category: string, date: string, splitWith: number, confidence: number, errors: string[] }}
     */
    function parseQuickAdd(input, today = getLocalDateString()) {
        const errors = [];
        if (!input || typeof input !== 'string' || !input.trim()) {
            return {
                ok: false,
                title: '',
                amount: 0,
                category: 'Other',
                date: today,
                splitWith: 0,
                confidence: 0,
                errors: ['Please enter an expense description.']
            };
        }

        let text = input.trim();
        let confidenceScore = 0;

        // 1. Parse Split With Friends
        // Patterns: "with 3 friends", "split 4", "with friends", "split with roommates", "split with 2 roommates"
        let splitWith = 0;
        const splitRegexes = [
            /(?:split\s+(?:with\s+)?(\d+)\s*(?:friends?|roommates?|people)?)/i,
            /(?:with\s+(\d+)\s*(?:friends?|roommates?|people))/i,
            /(?:with\s+(?:friends?|roommates?))/i,
            /(?:split\s+with\s+(?:friends?|roommates?))/i
        ];

        for (const regex of splitRegexes) {
            const match = text.match(regex);
            if (match) {
                if (match[1]) {
                    splitWith = parseInt(match[1], 10);
                } else {
                    splitWith = 1; // "with friends" defaults to 1 friend
                }
                text = text.replace(match[0], ' ');
                confidenceScore += 15;
                break;
            }
        }

        // 2. Parse Date
        // Keywords: today, aaj, yesterday, kal, parso, day before yesterday, or dates like YYYY-MM-DD, DD/MM, DD Month
        let parsedDate = today;
        const refDate = new Date(`${today}T00:00:00`);

        const datePatterns = [
            { regex: /\b(aaj|today)\b/i, offset: 0 },
            { regex: /\b(yesterday|kal)\b/i, offset: -1 },
            { regex: /\b(parso|day\s+before\s+yesterday)\b/i, offset: -2 }
        ];

        let dateFound = false;
        for (const dp of datePatterns) {
            if (dp.regex.test(text)) {
                const d = new Date(refDate);
                d.setDate(d.getDate() + dp.offset);
                parsedDate = getLocalDateString(d);
                text = text.replace(dp.regex, ' ');
                dateFound = true;
                confidenceScore += 20;
                break;
            }
        }

        // Check for ISO date: YYYY-MM-DD
        if (!dateFound) {
            const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
            if (isoMatch) {
                const candidate = isoMatch[1];
                if (candidate <= today) {
                    parsedDate = candidate;
                    text = text.replace(isoMatch[0], ' ');
                    dateFound = true;
                    confidenceScore += 25;
                } else {
                    errors.push('Future dates are not allowed.');
                }
            }
        }

        // Check for DD/MM or DD-MM format
        if (!dateFound) {
            const slashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
            if (slashMatch) {
                const day = parseInt(slashMatch[1], 10);
                const month = parseInt(slashMatch[2], 10);
                let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : refDate.getFullYear();
                if (year < 100) year += 2000;

                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (candidate <= today) {
                        parsedDate = candidate;
                        text = text.replace(slashMatch[0], ' ');
                        dateFound = true;
                        confidenceScore += 25;
                    } else {
                        errors.push('Future dates are not allowed.');
                    }
                }
            }
        }

        // Check for DD Mon (e.g., "12 oct", "5 november")
        if (!dateFound) {
            const monthNames = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';
            const monMatch = text.match(new RegExp(`\\b(\\d{1,2})\\s*(${monthNames})\\b`, 'i'));
            if (monMatch) {
                const day = parseInt(monMatch[1], 10);
                const monStr = monMatch[2].toLowerCase().slice(0, 3);
                const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monStr);
                if (monthIndex >= 0 && day >= 1 && day <= 31) {
                    const year = refDate.getFullYear();
                    const candidate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (candidate <= today) {
                        parsedDate = candidate;
                        text = text.replace(monMatch[0], ' ');
                        dateFound = true;
                        confidenceScore += 25;
                    } else {
                        errors.push('Future dates are not allowed.');
                    }
                }
            }
        }

        // 3. Parse Amount
        // Support: ₹200, 200rs, rs.200, inr 200, 200/-, 1.5k, 2k, 1,200, or bare numbers
        let parsedAmount = 0;
        let amountMatch = null;

        // First look for explicitly tagged currency amounts
        const taggedCurrencyRegex = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?\s*k?)|([\d,]+(?:\.\d+)?\s*k?)\s*(?:₹|rs\.?|inr|\/-|rupees)/i;
        const taggedMatch = text.match(taggedCurrencyRegex);

        if (taggedMatch) {
            const rawVal = taggedMatch[1] || taggedMatch[2];
            amountMatch = {
                raw: rawVal,
                fullMatch: taggedMatch[0]
            };
            confidenceScore += 30;
        } else {
            // Find numbers with 'k' (e.g. 1.5k, 2k) or general numbers
            const allNumMatches = [...text.matchAll(/\b([\d,]+(?:\.\d+)?\s*k?)\b/gi)];
            if (allNumMatches.length > 0) {
                // Prefer the last number in the expression
                const last = allNumMatches[allNumMatches.length - 1];
                amountMatch = {
                    raw: last[1],
                    fullMatch: last[0]
                };
                confidenceScore += 20;
            }
        }

        if (amountMatch) {
            let numStr = amountMatch.raw.replace(/,/g, '').trim().toLowerCase();
            let multiplier = 1;
            if (numStr.endsWith('k')) {
                multiplier = 1000;
                numStr = numStr.slice(0, -1).trim();
            }
            const numericValue = parseFloat(numStr) * multiplier;
            if (Number.isFinite(numericValue) && numericValue > 0) {
                parsedAmount = Math.round(numericValue * 100) / 100;
                text = text.replace(amountMatch.fullMatch, ' ');
            } else {
                errors.push('Invalid amount format.');
            }
        } else {
            errors.push('Could not find expense amount.');
        }

        // 4. Parse Category from Keyword Map
        let detectedCategory = 'Other';
        let earliestKeywordIndex = Infinity;
        let bestKeywordLength = 0;
        const cleanLowerText = text.toLowerCase();
        const tokens = cleanLowerText.match(/[a-z0-9]+/g) || [];

        // Check for keyword matches across categories, preferring the keyword that appears earliest in the phrase
        for (const cat of CATEGORIES) {
            const keywords = KEYWORD_MAP[cat] || [];
            for (const kw of keywords) {
                const kwLower = kw.toLowerCase();
                let matchIdx = -1;

                if (kwLower.includes(' ')) {
                    matchIdx = cleanLowerText.indexOf(kwLower);
                } else {
                    const tokenIdx = tokens.indexOf(kwLower);
                    if (tokenIdx !== -1) {
                        // Find the character index of this token in cleanLowerText
                        const wordRegex = new RegExp(`\\b${kwLower}\\b`, 'i');
                        const m = cleanLowerText.match(wordRegex);
                        if (m) matchIdx = m.index;
                    }
                }

                if (matchIdx !== -1) {
                    // Prefer earlier keyword; if same index, prefer longer phrase (more specific)
                    if (matchIdx < earliestKeywordIndex || (matchIdx === earliestKeywordIndex && kwLower.length > bestKeywordLength)) {
                        earliestKeywordIndex = matchIdx;
                        bestKeywordLength = kwLower.length;
                        detectedCategory = cat;
                        confidenceScore += 25;
                    }
                }
            }
        }

        // 5. Construct Clean Title
        // Remaining words in text
        let titleWords = text
            .replace(/[^\w\s]/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(w => w.length > 0);

        let finalTitle = '';
        if (titleWords.length > 0) {
            finalTitle = titleWords.join(' ');
            // Capitalize title
            finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
            if (finalTitle.length > 80) {
                finalTitle = finalTitle.slice(0, 80).trim();
            }
        } else {
            finalTitle = detectedCategory !== 'Other' ? detectedCategory : 'Expense';
        }

        const isOk = errors.length === 0 && parsedAmount > 0;
        const confidence = Math.min(100, Math.max(0, confidenceScore));

        return {
            ok: isOk,
            title: finalTitle,
            amount: parsedAmount,
            category: detectedCategory,
            date: parsedDate,
            splitWith,
            confidence,
            errors
        };
    }

    window.SS.parser = Object.freeze({
        parseQuickAdd
    });
})();
