/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/features/xp.js
   Namespace: window.SS.features.xp
   Gamification Engine: XP Levels, 30+ Student Money Tips,
   and Weekly Financial Literacy Quiz.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.features = window.SS.features || {};

    const LEVELS = [
        { level: 1, name: 'Saver Sprout 🌱', minXP: 0, maxXP: 250 },
        { level: 2, name: 'Budget Boss 💼', minXP: 251, maxXP: 750 },
        { level: 3, name: 'Money Master 🏆', minXP: 751, maxXP: 99999 }
    ];

    const STUDENT_TIPS = [
        "Buying second-hand semester textbooks or borrowing from the college library can save you ₹2,000 to ₹4,000 every term.",
        "Always check for student discounts! Spotify, Apple, GitHub Student Pack, and Amazon Prime offer 50%+ off for college emails.",
        "A daily ₹35 cutting chai and puff adds up to over ₹1,000 a month. Track it diligently so it doesn't sneak up on you.",
        "Share auto-rickshaws or take the campus metro instead of individual cabs—it cuts commute expenses by 70%.",
        "Set an advisory limit on food delivery apps. Cooking hostel maggi or canteen thali twice a week saves ₹500 weekly.",
        "Split Netflix, Spotify, or cloud storage costs with hostel roommates using family or group subscription plans.",
        "Pay your mobile recharge on 84-day or annual plans rather than 28-day packs to get lower effective daily data rates.",
        "Before making an impulse shopping purchase over ₹500, wait 48 hours. 60% of the time, the urge will naturally fade.",
        "Use UPI Lite for transactions under ₹200 to keep your main bank passbook clean and minimize failed transaction stress.",
        "Always review your mess bill adjustments before going home for semester breaks to claim meal rebate credits.",
        "Keep a ₹1,000 emergency cash buffer in your hostel room for medical emergencies or unexpected travel.",
        "Invest in a good water bottle and keep refilling on campus—spending ₹20 daily on bottled water is ₹600/month wasted.",
        "Take printouts in bulk from the college xerox shop rather than commercial street cyber cafes.",
        "Track shared outings immediately. Unsettled roommate splits are the #1 source of unrecovered student money.",
        "Never sign up for free trials with auto-debit cards without setting an immediate reminder to cancel 2 days prior.",
        "Make use of college Wi-Fi for downloading course lectures and large software updates instead of mobile hotspot data.",
        "Cook meals with hostel wing mates on weekends—shared potluck cooking costs 1/3rd of restaurant dining.",
        "Sell your previous year's lab coats, drafters, and reference textbooks to incoming juniors.",
        "Avoid ordering late-night snacks on delivery apps after 11 PM—surge pricing and delivery fees double the bill.",
        "Set a weekly cash or UPI budget every Monday morning. Once your safe daily allowance is used up, stay home.",
        "Opt for student bank accounts with zero minimum balance and free debit cards to avoid quarterly penalty deductions.",
        "Use free open-source software (VS Code, LibreOffice, GIMP) instead of paying for commercial productivity licenses.",
        "Buy stationery and lab journals in bulk from wholesale markets near campus rather than individual retail shops.",
        "Always check hostel noticeboards for student-run garage sales before buying furniture, kettles, or room coolers.",
        "When eating out with friends, volunteer to calculate the split right away so no one underpays their share.",
        "Pay college semester fees online through platforms that offer zero transaction surcharges and cashback rewards.",
        "Pack dry fruits and roasted chana in your backpack—healthy snacks prevent expensive canteen impulse purchases.",
        "Track small cash transactions! Cash vanishes quickly because it doesn't leave an automatic SMS trail.",
        "Participate in college technical fests and hackathons—many offer free meals, swag, and prize money bonuses!",
        "Learning basic personal finance in college sets up financial freedom for your entire engineering career."
    ];

    const QUIZ_QUESTIONS = [
        {
            q: "What is the recommended student rule of thumb for safe daily spending?",
            options: [
                "Spend whatever is left in the bank account today",
                "Divide remaining budget by remaining days in the month",
                "Spend equally every single day regardless of past spending",
                "Save everything until the final week of the month"
            ],
            correct: 1,
            explanation: "Dividing your remaining budget by remaining days auto-adjusts your daily allowance if you overspend or underspend!"
        },
        {
            q: "Why is a 50% student discount subscription better than an individual full-price plan?",
            options: [
                "It has fewer features",
                "It gives the exact same service while saving ₹600–₹1,200 annually",
                "It is only valid for 1 month",
                "It requires parental co-signing"
            ],
            correct: 1,
            explanation: "Student tier subscriptions provide full premium access at half the cost simply by verifying your college ID or .edu email."
        },
        {
            q: "What should you do before making an impulse purchase of ₹1,000+?",
            options: [
                "Borrow money immediately from roommates",
                "Use a credit card with high interest",
                "Wait 48 hours to see if you genuinely need it",
                "Buy it and skip hostel meals for a week"
            ],
            correct: 2,
            explanation: "The 48-hour rule eliminates emotional buying impulses and saves hundreds of rupees every semester."
        }
    ];

    /**
     * Computes XP based on student tracking activity.
     */
    function calculateXP({ expenses = [], streaks = {}, budgets = {}, challenges = [] }) {
        let xp = 50; // Starter XP

        // Streak XP: +20 XP per streak day
        if (streaks && streaks.currentStreak) {
            xp += streaks.currentStreak * 20;
        }

        // Expense logging XP: +5 XP per logged expense (up to 300 XP)
        xp += Math.min(300, (expenses || []).length * 5);

        // Completed challenges: +150 XP each
        const completedChallenges = (challenges || []).filter(c => c.status === 'completed');
        xp += completedChallenges.length * 150;

        // Determine level
        let userLevel = LEVELS[0];
        for (const lvl of LEVELS) {
            if (xp >= lvl.minXP) {
                userLevel = lvl;
            }
        }

        const nextLevel = LEVELS.find(l => l.level === userLevel.level + 1) || null;
        const progressPct = nextLevel
            ? Math.min(100, Math.round(((xp - userLevel.minXP) / (userLevel.maxXP - userLevel.minXP)) * 100))
            : 100;

        return {
            totalXP: xp,
            currentXP: xp,
            level: userLevel.level,
            levelName: userLevel.name,
            progressPct,
            nextLevelName: nextLevel ? nextLevel.name : 'Max Level'
        };
    }

    /**
     * Returns today's rotating student financial tip.
     */
    function getDailyTip(dayIndex = null) {
        const idx = dayIndex !== null ? dayIndex : (new Date().getDate() % STUDENT_TIPS.length);
        return STUDENT_TIPS[idx];
    }

    /**
     * Returns the 3-question weekly financial quiz.
     */
    function getWeeklyQuiz() {
        return QUIZ_QUESTIONS;
    }

    window.SS.features.xp = Object.freeze({
        calculateXP,
        getDailyTip,
        getWeeklyQuiz
    });
})();
