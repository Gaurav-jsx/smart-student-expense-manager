/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/auth.js
   Namespace: window.SS.auth
   Authentication Facade: Friendly error mapping,
   password strength evaluation, client-side cooldown,
   and guest mode state management.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const GUEST_KEY = 'smartSpend_isGuest';
    const ATTEMPTS_KEY = 'smartSpend_failedAttempts';
    const COOLDOWN_KEY = 'smartSpend_cooldownUntil';

    function getActiveAuthAdapter() {
        const fb = window.SS.adapters && window.SS.adapters.firebase;
        if (fb && fb.isCloudActive()) {
            return fb.auth;
        }
        return window.SS.adapters.local.auth;
    }

    // -------------------------------------------------------------------------
    // Failed Login Attempt Cooldown Logic
    // -------------------------------------------------------------------------
    function getCooldownRemainingMs() {
        try {
            const until = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
            const now = Date.now();
            return until > now ? until - now : 0;
        } catch (e) {
            return 0;
        }
    }

    function recordFailedAttempt() {
        try {
            let attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) || 0) + 1;
            sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));

            if (attempts >= 5) {
                // Exponential backoff: 30s, 60s, up to 5 mins
                const multiplier = Math.min(attempts - 4, 10);
                const cooldownMs = multiplier * 30 * 1000;
                sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + cooldownMs));
            }
        } catch (e) {}
    }

    function resetFailedAttempts() {
        try {
            sessionStorage.removeItem(ATTEMPTS_KEY);
            sessionStorage.removeItem(COOLDOWN_KEY);
        } catch (e) {}
    }

    // -------------------------------------------------------------------------
    // Password Strength Meter
    // -------------------------------------------------------------------------
    function evaluatePasswordStrength(password) {
        if (!password || typeof password !== 'string') {
            return { score: 0, label: 'Weak', class: 'weak', hint: 'Enter a password' };
        }

        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score++;
        if (password.length >= 12 && /[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 1) {
            return { score: 1, label: 'Weak', class: 'weak', hint: 'Needs at least 8 characters with letters & numbers.' };
        } else if (score === 2) {
            return { score: 2, label: 'Medium', class: 'medium', hint: 'Good! Add special characters or more length for extra strength.' };
        } else {
            return { score: 3, label: 'Strong', class: 'strong', hint: 'Excellent and secure password.' };
        }
    }

    // -------------------------------------------------------------------------
    // Human-Friendly Error Mapping
    // -------------------------------------------------------------------------
    function mapAuthError(err) {
        if (!err) return 'An unexpected error occurred. Please try again.';
        const code = err.code || '';
        const msg = err.message || '';

        switch (code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Incorrect email or password. Please try again.';
            case 'auth/email-already-in-use':
                return 'This email address is already registered. Please log in instead.';
            case 'auth/weak-password':
                return 'Password is too weak. Please use at least 8 characters with letters and numbers.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Access temporarily blocked due to repeated failures. Please wait a few minutes or reset your password.';
            case 'auth/network-request-failed':
                return 'Network connection error. Please check your internet or continue in Guest mode.';
            case 'auth/popup-closed-by-user':
                return 'Sign-in cancelled.';
            case 'invite/not-found':
                return 'Invite code not found. Please double-check the 8-character code.';
            case 'invite/already-used':
                return 'This invite code has already been redeemed.';
            case 'invite/expired':
                return 'This invite code has expired. Please ask your student for a new code.';
            case 'invite/self-link':
                return 'You cannot link to your own account.';
            case 'invite/already-linked':
                return 'You are already linked with this student.';
            default:
                return msg || 'Authentication request failed. Please check your credentials.';
        }
    }

    // -------------------------------------------------------------------------
    // Guest Mode State Management
    // -------------------------------------------------------------------------
    function isGuest() {
        try {
            return localStorage.getItem(GUEST_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    function setGuest(active = true) {
        try {
            if (active) {
                localStorage.setItem(GUEST_KEY, 'true');
            } else {
                localStorage.removeItem(GUEST_KEY);
            }
        } catch (e) {}
    }

    // -------------------------------------------------------------------------
    // Public Auth Facade
    // -------------------------------------------------------------------------
    const authFacade = {
        isGuest,
        setGuest,
        evaluatePasswordStrength,
        mapAuthError,
        getCooldownRemainingMs,

        async signUp({ email, password, name, role }) {
            setGuest(false);
            try {
                const user = await getActiveAuthAdapter().signUp({ email, password, name, role });
                resetFailedAttempts();
                return user;
            } catch (err) {
                throw new Error(mapAuthError(err));
            }
        },

        async signIn({ email, password, remember = true }) {
            const cooldownMs = getCooldownRemainingMs();
            if (cooldownMs > 0) {
                const secs = Math.ceil(cooldownMs / 1000);
                throw new Error(`Too many failed attempts. Please wait ${secs} seconds before trying again.`);
            }

            setGuest(false);
            try {
                const user = await getActiveAuthAdapter().signIn({ email, password, remember });
                resetFailedAttempts();
                return user;
            } catch (err) {
                recordFailedAttempt();
                throw new Error(mapAuthError(err));
            }
        },

        async signInWithGoogle() {
            setGuest(false);
            try {
                const user = await getActiveAuthAdapter().signInWithGoogle();
                resetFailedAttempts();
                return user;
            } catch (err) {
                throw new Error(mapAuthError(err));
            }
        },

        async signOut() {
            setGuest(false);
            await getActiveAuthAdapter().signOut();
            if (window.SS.router) {
                window.SS.router.navigate('/login');
            }
            return true;
        },

        async sendReset(email) {
            try {
                return await getActiveAuthAdapter().sendReset(email);
            } catch (err) {
                throw new Error(mapAuthError(err));
            }
        },

        onAuthChange(cb) {
            return getActiveAuthAdapter().onAuthChange(cb);
        },

        currentUser() {
            if (isGuest()) {
                return {
                    uid: 'guest_user',
                    name: 'Guest Student',
                    role: 'student',
                    isGuest: true
                };
            }
            return getActiveAuthAdapter().currentUser();
        },

        async reloadUser() {
            return await getActiveAuthAdapter().reloadUser();
        },

        async resendVerification() {
            return await getActiveAuthAdapter().resendVerification();
        }
    };

    window.SS.auth = Object.freeze(authFacade);
})();
