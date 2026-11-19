/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/demo.js
   Namespace: window.SS.demo
   Deterministic, realistic 90-day student demo dataset
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const {
        getLocalDateString,
        getMonthKey,
        shiftMonthKey
    } = window.SS.utils;

    /**
     * Simple seeded pseudo-random number generator for deterministic demo data.
     * @param {number} seed
     */
    function createRNG(seed = 123456789) {
        let s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    /**
     * Generates ~90 days of realistic student financial history.
     * Includes mess fees, chai, auto, metro, recharge, books, streaming, a weekend trip, and savings goals.
     * @param {string} [today=getLocalDateString()]
     * @returns {Object} v2 State payload
     */
    function generateDemoData(today = getLocalDateString()) {
        const rng = createRNG(42);
        const refDate = new Date(`${today}T00:00:00`);
        const curMonth = getMonthKey(refDate);
        const lastMonth = shiftMonthKey(curMonth, -1);
        const twoMonthsAgo = shiftMonthKey(curMonth, -2);

        const expenses = [];
        let idCounter = 1;

        // Routine daily/weekly templates
        const studentActivities = [
            { title: "Cutting Chai & Bun Maska", amount: 35, category: "Food", prob: 0.7 },
            { title: "Hostel Canteen Lunch", amount: 80, category: "Food", prob: 0.6 },
            { title: "Shared Auto to Campus", amount: 40, category: "Travel", prob: 0.5 },
            { title: "Evening Samosa & Tea", amount: 30, category: "Food", prob: 0.4 },
            { title: "College Xerox & Notes", amount: 45, category: "Education", prob: 0.25 },
            { title: "Metro Ride", amount: 32, category: "Travel", prob: 0.35 },
            { title: "Late Night Maggi", amount: 40, category: "Food", prob: 0.3 },
            { title: "Zomato Biryani Treat", amount: 260, category: "Food", prob: 0.1, splitWith: 2 },
            { title: "Stationery & Pen refills", amount: 65, category: "Education", prob: 0.15 }
        ];

        // Generate past 90 days of expenses
        for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
            const date = new Date(refDate);
            date.setDate(date.getDate() - daysAgo);
            const dateStr = getLocalDateString(date);
            const dayOfMonth = date.getDate();

            // Monthly Mess Fee on 1st of month
            if (dayOfMonth === 1) {
                expenses.push({
                    id: `demo-mess-${dateStr}`,
                    title: "Monthly Mess Advance",
                    amount: 3200,
                    category: "Food",
                    date: dateStr,
                    note: "Hostel Mess Dues",
                    createdAt: date.getTime(),
                    updatedAt: date.getTime(),
                    recurringId: "rec-mess",
                    splitWith: 0
                });
            }

            // Monthly Jio / Airtel Recharge on 15th
            if (dayOfMonth === 15) {
                expenses.push({
                    id: `demo-recharge-${dateStr}`,
                    title: "Mobile 5G Data Pack",
                    amount: 299,
                    category: "Bills",
                    date: dateStr,
                    note: "28-day validity pack",
                    createdAt: date.getTime(),
                    updatedAt: date.getTime(),
                    recurringId: "rec-recharge",
                    splitWith: 0
                });
            }

            // Monthly Netflix / Spotify on 20th
            if (dayOfMonth === 20) {
                expenses.push({
                    id: `demo-sub-${dateStr}`,
                    title: "Spotify Student Premium",
                    amount: 59,
                    category: "Entertainment",
                    date: dateStr,
                    note: "Student discount tier",
                    createdAt: date.getTime(),
                    updatedAt: date.getTime(),
                    recurringId: null,
                    splitWith: 0
                });
            }

            // Routine activities
            studentActivities.forEach((act) => {
                if (rng() < act.prob) {
                    const jitter = Math.floor((rng() - 0.5) * 10);
                    const finalAmount = Math.max(10, act.amount + jitter);
                    expenses.push({
                        id: `demo-exp-${idCounter++}`,
                        title: act.title,
                        amount: finalAmount,
                        category: act.category,
                        date: dateStr,
                        note: "",
                        createdAt: date.getTime(),
                        updatedAt: date.getTime(),
                        recurringId: null,
                        splitWith: act.splitWith || 0
                    });
                }
            });
        }

        // Add 2 special student milestones / anomalies
        // 1. Weekend Trek Trip 25 days ago
        const trekDate = new Date(refDate);
        trekDate.setDate(trekDate.getDate() - 25);
        expenses.push({
            id: `demo-trek-${idCounter++}`,
            title: "Lonavala Weekend Trek Bus & Stay",
            amount: 1850,
            category: "Travel",
            date: getLocalDateString(trekDate),
            note: "College club weekend trek with batchmates",
            createdAt: trekDate.getTime(),
            updatedAt: trekDate.getTime(),
            recurringId: null,
            splitWith: 3
        });

        // 2. Semester Reference Books 45 days ago
        const bookDate = new Date(refDate);
        bookDate.setDate(bookDate.getDate() - 45);
        expenses.push({
            id: `demo-book-${idCounter++}`,
            title: "Operating Systems & Algorithms Textbooks",
            amount: 1200,
            category: "Education",
            date: getLocalDateString(bookDate),
            note: "Standard semester textbooks from college bookstore",
            createdAt: bookDate.getTime(),
            updatedAt: bookDate.getTime(),
            recurringId: null,
            splitWith: 0
        });

        // Budgets for the 3 active months
        const budgets = {};
        budgets[twoMonthsAgo] = 8500;
        budgets[lastMonth] = 8500;
        budgets[curMonth] = 8500;

        // Category budgets
        const categoryBudgets = {
            Food: 4500,
            Travel: 1500,
            Education: 1500,
            Entertainment: 600,
            Shopping: 1000,
            Bills: 600
        };

        // Recurring subscriptions
        const recurring = [
            {
                id: "rec-mess",
                title: "Monthly Mess Advance",
                amount: 3200,
                category: "Food",
                dayOfMonth: 1,
                active: true,
                lastAppliedMonth: curMonth
            },
            {
                id: "rec-recharge",
                title: "Mobile 5G Data Pack",
                amount: 299,
                category: "Bills",
                dayOfMonth: 15,
                active: true,
                lastAppliedMonth: curMonth
            }
        ];

        // Savings Goals
        const goals = [
            {
                id: "goal-laptop",
                name: "Coding Laptop Upgrade (M3 Mac)",
                target: 45000,
                saved: 24000,
                deadline: "2027-04-30"
            },
            {
                id: "goal-goa",
                name: "Post-Exam Goa Trip",
                target: 8000,
                saved: 5500,
                deadline: "2026-12-20"
            }
        ];

        return {
            schemaVersion: 2,
            expenses: expenses.sort((a, b) => b.date.localeCompare(a.date)),
            budgets,
            categoryBudgets,
            recurring,
            goals,
            settings: {
                theme: "system",
                onboarded: true,
                demoMode: true,
                currency: "INR"
            },
            meta: {
                lastBackupAt: Date.now(),
                isDemo: true
            }
        };
    }

    window.SS.demo = Object.freeze({
        generate: generateDemoData
    });
})();

