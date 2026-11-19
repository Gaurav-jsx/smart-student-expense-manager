/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/constants.js
   Namespace: window.SS.constants
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const CATEGORIES = [
        "Food",
        "Travel",
        "Education",
        "Shopping",
        "Entertainment",
        "Bills",
        "Other"
    ];

    const CATEGORY_COLORS = {
        Food: "#6c63ff",
        Travel: "#20b486",
        Education: "#f5a623",
        Shopping: "#4b8df8",
        Entertainment: "#e879b9",
        Bills: "#ff785a",
        Other: "#9ca3af"
    };

    const CATEGORY_ICONS = {
        Food: "🍔",
        Travel: "🚌",
        Education: "📚",
        Shopping: "🛍️",
        Entertainment: "🎬",
        Bills: "⚡",
        Other: "🏷️"
    };

    const KEYWORD_MAP = {
        Food: [
            "chai", "tea", "coffee", "samosa", "maggi", "lunch", "dinner",
            "breakfast", "mess", "canteen", "pizza", "burger", "biryani",
            "zomato", "swiggy", "snacks", "juice", "khana", "nashta",
            "roti", "thali", "dosa", "idli", "roll", "sandwich", "momos",
            "icecream", "ice cream", "water bottle", "snack"
        ],
        Travel: [
            "auto", "bus", "metro", "train", "cab", "ola", "uber", "rapido",
            "petrol", "diesel", "ticket", "irctc", "rickshaw", "flight",
            "toll", "pass", "fuel"
        ],
        Education: [
            "book", "books", "notes", "notebook", "xerox", "photocopy",
            "printout", "course", "udemy", "coursera", "exam", "fees",
            "tuition", "lab", "stationery", "pen", "pencil", "assignment",
            "calculator", "college", "semester"
        ],
        Shopping: [
            "shirt", "shoes", "jeans", "tshirt", "amazon", "flipkart",
            "myntra", "meesho", "bag", "charger", "earphones", "headphones",
            "clothes", "jacket", "cable", "watch"
        ],
        Entertainment: [
            "movie", "cinema", "netflix", "spotify", "prime", "hotstar",
            "youtube", "game", "gaming", "steam", "party", "concert",
            "outing", "club", "bowling", "ipl"
        ],
        Bills: [
            "recharge", "wifi", "electricity", "rent", "mobile", "jio",
            "airtel", "vi", "bill", "laundry", "broadband", "cylinder",
            "gas", "water bill", "maintenance"
        ],
        Other: [
            "misc", "other", "cash", "atm", "donation", "gift", "medical", "medicine", "doctor", "gym"
        ]
    };

    const BADGES = [
        { id: "first_expense", name: "First Step", desc: "Logged your first expense", icon: "🌱" },
        { id: "streak_7", name: "Habit Builder", desc: "7-day logging streak", icon: "🔥" },
        { id: "under_budget", name: "Budget Master", desc: "Finished a month under budget", icon: "🏆" },
        { id: "entries_10", name: "Double Digits", desc: "Logged 10+ expenses", icon: "📝" },
        { id: "goal_reached", name: "Goal Crusher", desc: "Reached a savings goal", icon: "🎯" },
        { id: "no_spend_weekend", name: "Frugal Weekend", desc: "No spend weekend logged", icon: "🛡️" }
    ];

    window.SS.constants = Object.freeze({
        SCHEMA_VERSION: 2,
        STORAGE_KEY: "smartSpend.v2",
        LEGACY_EXPENSES_KEY: "smartSpendExpenses",
        LEGACY_BUDGET_KEY: "smartSpendMonthlyBudget",
        BACKUP_PREFIX: "smartSpend.backup.",
        QUARANTINE_KEY: "smartSpend.quarantine",
        MAX_BACKUPS: 3,
        CATEGORIES,
        CATEGORY_COLORS,
        CATEGORY_ICONS,
        KEYWORD_MAP,
        BADGES,
        DEFAULT_CURRENCY: "INR",
        THEMES: ["light", "dark", "system"]
    });
})();
