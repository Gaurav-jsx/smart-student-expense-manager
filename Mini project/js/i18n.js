/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/i18n.js
   Namespace: window.SS.i18n
   Bilingual English / Hindi Localization Engine
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    let currentLang = 'en';
    const listeners = [];

    const translations = {
        en: {
            // App & Brand
            appName: 'SmartSpend',
            appTagline: 'Student Expense Manager',
            demoBanner: 'Local Demo Mode — accounts & data are stored only in this browser.',
            guestBanner: 'Guest Mode — your transactions stay on this device.',
            offlineNotice: 'You are offline. Showing cached records.',
            
            // Navigation & Header
            dashboard: 'Dashboard',
            family: 'Family',
            inbox: 'Inbox',
            insights: 'Insights',
            settings: 'Settings',
            logout: 'Sign Out',
            login: 'Log In',
            signup: 'Sign Up',
            guestContinue: 'Continue as Guest',
            installApp: 'Install App',
            
            // Roles
            roleStudent: 'Student',
            roleParent: 'Parent / Guardian',
            studentDesc: 'Track allowances, safe-to-spend limits, and financial goals.',
            parentDesc: 'Support your college child with transparent, consent-based budgeting.',
            
            // Auth Screen
            welcomeBack: 'Welcome Back',
            loginSubtitle: 'Manage your college budget or support your child smartly.',
            emailLabel: 'Email Address',
            emailPlaceholder: 'you@college.edu',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Enter your password',
            confirmPasswordLabel: 'Confirm Password',
            confirmPasswordPlaceholder: 'Re-enter your password',
            fullNameLabel: 'Full Name',
            fullNamePlaceholder: 'e.g. Aarav Sharma',
            rememberMe: 'Remember me on this device',
            forgotPassword: 'Forgot password?',
            dontHaveAccount: "Don't have an account?",
            alreadyHaveAccount: 'Already have an account?',
            createAccount: 'Create Account',
            signInBtn: 'Sign In',
            orDivider: 'or',
            googleSignIn: 'Continue with Google',
            demoStudentBtn: 'Demo Student (Aarav)',
            demoParentBtn: 'Demo Parent (Mr. Sharma)',
            termsConsentStudent: 'I understand my linked parent can view my shared expenses, and I can modify or revoke this consent at any time.',
            termsConsentParent: 'I agree to only monitor children who have explicitly given their consent.',
            resetPasswordTitle: 'Reset Password',
            resetPasswordDesc: 'Enter your registered email to receive recovery instructions.',
            sendResetLink: 'Send Reset Link',
            backToLogin: 'Back to Login',
            
            // Password Strength
            pwdWeak: 'Weak password',
            pwdMedium: 'Medium strength',
            pwdStrong: 'Strong password',
            pwdHint: 'At least 8 characters, mixing letters and numbers.',
            
            // Safe-to-Spend & Dashboard
            safeTodayTitle: 'Safe-to-Spend Today',
            overDailyLimit: 'Over Daily Limit',
            limitReached: 'Limit Reached',
            noBudgetSet: 'No Budget Set',
            dailySafeFormula: 'Daily Allowance = Remaining Budget ÷ Remaining Days',
            spentToday: "Today's Spending",
            totalExpenses: 'Total Expenses',
            thisMonth: 'This Month',
            remainingBudget: 'Remaining Budget',
            monthlyBudget: 'Monthly Budget',
            setBudget: 'Set Budget',
            editBudget: 'Edit Budget',
            
            // Quick Add & Voice
            quickAddTitle: 'Quick Add',
            quickAddSubtitle: "Type or speak in English or Hinglish (e.g. 'chai 20', 'metro 40 yesterday')",
            quickAddPlaceholder: "Try: 'chai 20', 'auto 40 yesterday', 'books 650'...",
            parse: 'Parse',
            saveExpense: 'Save Expense',
            editInForm: 'Edit in Form',
            
            // Parent Experience
            parentDashboardTitle: 'Family Overview',
            parentDashboardSubtitle: 'Empowering your student with financial responsibility & trust.',
            childrenGridTitle: 'Your Linked Children',
            addChildBtn: '+ Add Child',
            noChildrenLinked: 'No children linked yet. Ask your child for an invite code from their app!',
            viewChild: 'View Details',
            weeklyDigest: 'Weekly Digest',
            alertsAndRequests: 'Alerts & Requests',
            approve: 'Approve',
            decline: 'Decline',
            approved: 'Approved',
            declined: 'Declined',
            pending: 'Pending',
            controlsTab: 'Advisory Limits',
            requestsTab: 'Money Requests',
            challengesTab: 'Challenges',
            overviewTab: 'Overview',
            expensesTab: 'Transactions',
            trendsTab: 'Trends & Heatmap',
            
            // Advisory Controls
            advisoryNotice: 'These limits guide your student and trigger alerts. They do not block bank or UPI transfers.',
            monthlyAllowance: 'Monthly Allowance (₹)',
            largeExpenseAlert: 'Large Expense Alert Threshold (₹)',
            saveControls: 'Save Advisory Limits',
            
            // Linking & Consent
            parentConsentBanner: 'Monitored by: {parentName} · Active sharing',
            manageSharing: 'Manage',
            inviteParent: 'Invite a Parent / Guardian',
            inviteCodeLabel: 'Your Single-Use Link Code',
            codeExpiresIn: 'Expires in {minutes} minutes',
            regenerateCode: 'Regenerate Code',
            shareLevel: 'Sharing Level',
            shareLevelFull: 'Full Details (All expenses, categories, dates)',
            shareLevelSummary: 'Summary Only (Category totals and budget progress only)',
            revokeLink: 'Revoke Access',
            revokeConfirm: 'Are you sure you want to stop sharing your expenses with {name}?',
            enterInviteCode: 'Enter 8-character child invite code',
            linkChildBtn: 'Link Child',
            
            // Money Requests
            requestMoneyTitle: 'Request Extra Money / Allowance',
            requestReasonPlaceholder: 'e.g., Semester exam fees, reference textbooks',
            requestAmount: 'Amount (₹)',
            submitRequest: 'Send Request',
            
            // Challenges
            createChallenge: 'Offer a Saving Challenge',
            challengeTitle: 'Challenge Title',
            challengeGoal: 'Target Rule',
            challengeReward: 'Reward Bonus (₹)',
            acceptChallenge: 'Accept Challenge',
            declineChallenge: 'Decline Challenge',
            
            // Common Actions & Toasts
            undo: 'Undo',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            close: 'Close',
            save: 'Save',
            searchPlaceholder: 'Search expenses, categories, notes...',
            printReport: 'Print Report'
        },
        hi: {
            // App & Brand
            appName: 'SmartSpend',
            appTagline: 'छात्र खर्च और बजट प्रबंधक',
            demoBanner: 'स्थानीय डेमो मोड — खाते और डेटा केवल इस ब्राउज़र में सुरक्षित हैं।',
            guestBanner: 'गेस्ट मोड — आपके लेन-देन केवल इसी डिवाइस पर सुरक्षित हैं।',
            offlineNotice: 'आप ऑफ़लाइन हैं। सहेजे गए रिकॉर्ड दिखाए जा रहे हैं।',
            
            // Navigation & Header
            dashboard: 'डैशबोर्ड',
            family: 'परिवार',
            inbox: 'सूचनाएं',
            insights: 'इनसाइट्स',
            settings: 'सेटिंग्स',
            logout: 'लॉग आउट',
            login: 'लॉग इन',
            signup: 'साइन अप',
            guestContinue: 'गेस्ट के रूप में जारी रखें',
            installApp: 'ऐप इंस्टॉल करें',
            
            // Roles
            roleStudent: 'छात्र (Student)',
            roleParent: 'अभिभावक (Parent)',
            studentDesc: 'पॉकेट मनी, दैनिक सुरक्षित खर्च सीमा और वित्तीय लक्ष्य ट्रैक करें।',
            parentDesc: 'सहमति और पारदर्शिता के साथ अपने बच्चे का वित्तीय मार्गदर्शन करें।',
            
            // Auth Screen
            welcomeBack: 'वापसी पर स्वागत है',
            loginSubtitle: 'कॉलेज बजट प्रबंधित करें या अपने बच्चे को सहायता दें।',
            emailLabel: 'ईमेल पता',
            emailPlaceholder: 'you@college.edu',
            passwordLabel: 'पासवर्ड',
            passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
            confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
            confirmPasswordPlaceholder: 'पासवर्ड पुनः दर्ज करें',
            fullNameLabel: 'पूरा नाम',
            fullNamePlaceholder: 'उदा. आरव शर्मा',
            rememberMe: 'मुझे इस डिवाइस पर याद रखें',
            forgotPassword: 'पासवर्ड भूल गए?',
            dontHaveAccount: 'खाता नहीं है?',
            alreadyHaveAccount: 'पहले से खाता है?',
            createAccount: 'खाता बनाएं',
            signInBtn: 'साइन इन करें',
            orDivider: 'या',
            googleSignIn: 'Google के साथ जारी रखें',
            demoStudentBtn: 'डेमो छात्र (आरव)',
            demoParentBtn: 'डेमो पेरेंट (मिस्टर शर्मा)',
            termsConsentStudent: 'मैं समझता हूं कि मेरे लिंक किए गए अभिभावक मेरे साझा किए गए खर्च देख सकते हैं, और मैं इसे कभी भी बदल या हटा सकता हूं।',
            termsConsentParent: 'मैं केवल उन बच्चों की निगरानी करने के लिए सहमत हूं जिन्होंने स्पष्ट रूप से सहमति दी है।',
            resetPasswordTitle: 'पासवर्ड रीसेट करें',
            resetPasswordDesc: 'पुनर्प्राप्ति निर्देश प्राप्त करने के लिए अपना पंजीकृत ईमेल दर्ज करें।',
            sendResetLink: 'रीसेट लिंक भेजें',
            backToLogin: 'लॉगिन पर वापस जाएं',
            
            // Password Strength
            pwdWeak: 'कमजोर पासवर्ड',
            pwdMedium: 'मध्यम पासवर्ड',
            pwdStrong: 'मजबूत पासवर्ड',
            pwdHint: 'कम से कम 8 अक्षर, जिसमें अक्षर और संख्या दोनों हों।',
            
            // Safe-to-Spend & Dashboard
            safeTodayTitle: 'आज का सुरक्षित खर्च (Safe-to-Spend)',
            overDailyLimit: 'दैनिक सीमा से अधिक',
            limitReached: 'सीमा समाप्त',
            noBudgetSet: 'बजट सेट नहीं है',
            dailySafeFormula: 'दैनिक भत्ता = शेष बजट ÷ महीने के शेष दिन',
            spentToday: 'आज का खर्च',
            totalExpenses: 'कुल खर्च',
            thisMonth: 'इस महीने',
            remainingBudget: 'शेष बजट',
            monthlyBudget: 'मासिक बजट',
            setBudget: 'बजट सेट करें',
            editBudget: 'बजट बदलें',
            
            // Quick Add & Voice
            quickAddTitle: 'त्वरित जोड़ें (Quick Add)',
            quickAddSubtitle: "अंग्रेजी या हिंग्लिश में लिखें या बोलें (उदा. 'chai 20', 'metro 40 yesterday')",
            quickAddPlaceholder: "लिखें: 'chai 20', 'auto 40 yesterday', 'books 650'...",
            parse: 'जांचें (Parse)',
            saveExpense: 'खर्च सहेजें',
            editInForm: 'फॉर्म में बदलें',
            
            // Parent Experience
            parentDashboardTitle: 'पारिवारिक सारांश',
            parentDashboardSubtitle: 'विश्वास और वित्तीय जिम्मेदारी के साथ छात्र का मार्गदर्शन।',
            childrenGridTitle: 'लिंक किए गए बच्चे',
            addChildBtn: '+ बच्चा जोड़ें',
            noChildrenLinked: 'अभी कोई बच्चा लिंक नहीं है। अपने बच्चे के ऐप से इनवाइट कोड मांगें!',
            viewChild: 'विवरण देखें',
            weeklyDigest: 'साप्ताहिक रिपोर्ट',
            alertsAndRequests: 'अलर्ट और अनुरोध',
            approve: 'स्वीकार करें',
            decline: 'अस्वीकार करें',
            approved: 'स्वीकृत',
            declined: 'अस्वीकृत',
            pending: 'लंबित',
            controlsTab: 'सलाहकारी सीमाएं',
            requestsTab: 'पैसे के अनुरोध',
            challengesTab: 'चुनौतियां (Challenges)',
            overviewTab: 'सारांश',
            expensesTab: 'लेन-देन',
            trendsTab: 'ट्रेंड्स और हीटमैप',
            
            // Advisory Controls
            advisoryNotice: 'ये सीमाएं छात्र को मार्गदर्शन देती हैं और अलर्ट भेजती हैं। ये वास्तविक बैंक भुगतान को नहीं रोकती हैं।',
            monthlyAllowance: 'मासिक पॉकेट मनी (₹)',
            largeExpenseAlert: 'बड़े खर्च की अलर्ट सीमा (₹)',
            saveControls: 'सीमाएं सहेजें',
            
            // Linking & Consent
            parentConsentBanner: 'निगरानी: {parentName} द्वारा · सक्रिय साझाकरण',
            manageSharing: 'प्रबंधित करें',
            inviteParent: 'अभिभावक को आमंत्रित करें',
            inviteCodeLabel: 'आपका 1-बार उपयोग कोड',
            codeExpiresIn: '{minutes} मिनट में समाप्त होगा',
            regenerateCode: 'नया कोड बनाएं',
            shareLevel: 'साझाकरण स्तर',
            shareLevelFull: 'पूर्ण विवरण (सभी खर्च, श्रेणी, तारीखें)',
            shareLevelSummary: 'केवल सारांश (केवल श्रेणी कुल और बजट स्थिति)',
            revokeLink: 'पहुंच समाप्त करें (Revoke)',
            revokeConfirm: 'क्या आप सुनिश्चित हैं कि {name} के साथ खर्च साझा करना बंद करना चाहते हैं?',
            enterInviteCode: '8-अक्षर का इनवाइट कोड दर्ज करें',
            linkChildBtn: 'बच्चा लिंक करें',
            
            // Money Requests
            requestMoneyTitle: 'अतिरिक्त पैसे / भत्ते का अनुरोध',
            requestReasonPlaceholder: 'उदा. सेमेस्टर परीक्षा शुल्क, पुस्तकें',
            requestAmount: 'राशि (₹)',
            submitRequest: 'अनुरोध भेजें',
            
            // Challenges
            createChallenge: 'बचत चुनौती दें',
            challengeTitle: 'चुनौती का शीर्षक',
            challengeGoal: 'लक्ष्य नियम',
            challengeReward: 'इनाम बोनस (₹)',
            acceptChallenge: 'चुनौती स्वीकार करें',
            declineChallenge: 'अस्वीकार करें',
            
            // Common Actions & Toasts
            undo: 'पूर्ववत (Undo)',
            cancel: 'रद्द करें',
            delete: 'हटाएं',
            edit: 'संपादित करें',
            close: 'बंद करें',
            save: 'सहेजें',
            searchPlaceholder: 'खर्च, श्रेणी, नोट खोजें...',
            printReport: 'रिपोर्ट प्रिंट करें'
        }
    };

    /**
     * Translates a string key with optional parameter interpolation.
     * @param {string} key
     * @param {Object} [params]
     * @returns {string}
     */
    function t(key, params = {}) {
        const langDict = translations[currentLang] || translations.en;
        let str = langDict[key] || translations.en[key] || key;

        if (params && typeof params === 'object') {
            Object.entries(params).forEach(([paramKey, val]) => {
                str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
            });
        }
        return str;
    }

    /**
     * Sets active application language ('en' or 'hi').
     * @param {'en'|'hi'} lang
     */
    function setLanguage(lang) {
        if (!translations[lang]) lang = 'en';
        currentLang = lang;
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('lang', lang);
        }
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('smartSpend_lang', lang);
            }
        } catch (e) {}

        listeners.forEach(cb => {
            try { cb(currentLang); } catch (e) {}
        });
    }

    /**
     * Returns the active language code.
     * @returns {'en'|'hi'}
     */
    function getLanguage() {
        return currentLang;
    }

    /**
     * Subscribes to language switch events.
     * @param {Function} cb
     * @returns {Function} unsubscribe function
     */
    function onLanguageChange(cb) {
        listeners.push(cb);
        return () => {
            const idx = listeners.indexOf(cb);
            if (idx !== -1) listeners.splice(idx, 1);
        };
    }

    // Auto-initialize from storage
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem('smartSpend_lang');
            if (saved === 'hi' || saved === 'en') {
                currentLang = saved;
            }
        }
    } catch (e) {}

    window.SS.i18n = Object.freeze({
        t,
        setLanguage,
        getLanguage,
        onLanguageChange
    });
})();
