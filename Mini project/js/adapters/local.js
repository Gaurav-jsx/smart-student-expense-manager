/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/adapters/local.js
   Namespace: window.SS.adapters.local
   Local Demo Mode: Multi-account simulation, PBKDF2 hashing,
   In-tab realtime event bus, and pre-seeded parent/student demo data.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.adapters = window.SS.adapters || {};

    const USERS_KEY = 'smartSpend_local_users';
    const SESSIONS_KEY = 'smartSpend_local_session';
    const DATA_PREFIX = 'smartSpend_local_data_';
    const INVITES_KEY = 'smartSpend_local_invites';
    const LINKS_KEY = 'smartSpend_local_links';

    // In-memory Event Bus for Realtime Subscriptions in Local Mode
    const busListeners = new Map();

    function emitBus(channel, data) {
        if (busListeners.has(channel)) {
            const cbs = busListeners.get(channel);
            cbs.forEach(cb => {
                try { cb(data); } catch (e) { console.warn('[LocalAdapter Bus Error]', e); }
            });
        }
    }

    function subscribeBus(channel, cb) {
        if (!busListeners.has(channel)) {
            busListeners.set(channel, new Set());
        }
        busListeners.get(channel).add(cb);
        return () => {
            if (busListeners.has(channel)) {
                busListeners.get(channel).delete(cb);
                if (busListeners.get(channel).size === 0) {
                    busListeners.delete(channel);
                }
            }
        };
    }

    // Cross-tab storage synchronization
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith(DATA_PREFIX)) {
                const subPath = e.key.replace(DATA_PREFIX, '');
                let parsed = null;
                try { parsed = JSON.parse(e.newValue); } catch (err) {}
                emitBus(subPath, parsed);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Cryptographic Password Hashing (PBKDF2 SHA-256 >= 100k iterations)
    // -------------------------------------------------------------------------
    async function hashPasswordPBKDF2(password, saltHex = null) {
        const enc = new TextEncoder();
        let salt;
        if (saltHex) {
            salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        } else {
            salt = crypto.getRandomValues(new Uint8Array(16));
        }

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );

        const hashHex = Array.from(new Uint8Array(derivedBits))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        const saltOutHex = Array.from(salt)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return { hash: hashHex, salt: saltOutHex };
    }

    // -------------------------------------------------------------------------
    // Internal Storage Helpers
    // -------------------------------------------------------------------------
    function getStoredJSON(key, defaultVal) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultVal;
        } catch (e) {
            return defaultVal;
        }
    }

    function setStoredJSON(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error('[LocalAdapter] Storage write failed:', e);
        }
    }

    function getDataPath(path) {
        return `${DATA_PREFIX}${path}`;
    }

    function getDoc(path) {
        return getStoredJSON(getDataPath(path), null);
    }

    function setDoc(path, data) {
        setStoredJSON(getDataPath(path), data);
        emitBus(path, data);
    }

    // -------------------------------------------------------------------------
    // Pre-seed Demo Accounts & Pre-linked Parent ↔ Student Data
    // -------------------------------------------------------------------------
    async function seedDemoDataIfMissing() {
        const users = getStoredJSON(USERS_KEY, {});

        if (!users['demo_student_aarav']) {
            const studentCreds = await hashPasswordPBKDF2('DemoStudent123');
            users['demo_student_aarav'] = {
                uid: 'demo_student_aarav',
                email: 'aarav@college.edu',
                name: 'Aarav Sharma',
                role: 'student',
                createdAt: Date.now() - 90 * 86400000,
                emailVerified: true,
                hash: studentCreds.hash,
                salt: studentCreds.salt,
                theme: 'system',
                language: 'en',
                shareLevelDefault: 'full'
            };

            // Seed student expenses, budgets, and goals using demo generator
            const demoGen = window.SS.demo ? window.SS.demo.generate() : null;
            if (demoGen) {
                setDoc('users/demo_student_aarav/expenses', demoGen.expenses);
                setDoc('users/demo_student_aarav/budgets', demoGen.budgets);
                setDoc('users/demo_student_aarav/goals', demoGen.goals);
                setDoc('users/demo_student_aarav/recurring', demoGen.recurring);
                setDoc('users/demo_student_aarav/categoryBudgets', demoGen.categoryBudgets);
            }
        }

        if (!users['demo_parent_sharma']) {
            const parentCreds = await hashPasswordPBKDF2('DemoParent123');
            users['demo_parent_sharma'] = {
                uid: 'demo_parent_sharma',
                email: 'sharma@parent.com',
                name: 'Mr. Sharma (Parent)',
                role: 'parent',
                createdAt: Date.now() - 90 * 86400000,
                emailVerified: true,
                hash: parentCreds.hash,
                salt: parentCreds.salt,
                theme: 'system',
                language: 'en'
            };
        }

        setStoredJSON(USERS_KEY, users);

        // Pre-link Aarav and Mr. Sharma
        const links = getStoredJSON(LINKS_KEY, []);
        const linkId = 'demo_student_aarav_demo_parent_sharma';
        if (!links.some(l => l.id === linkId)) {
            links.push({
                id: linkId,
                childUid: 'demo_student_aarav',
                parentUid: 'demo_parent_sharma',
                childName: 'Aarav Sharma',
                parentName: 'Mr. Sharma',
                status: 'active',
                shareLevel: 'full',
                createdAt: Date.now() - 30 * 86400000,
                inviteCode: 'DEMO2026'
            });
            setStoredJSON(LINKS_KEY, links);
        }

        // Seed an advisory control
        const controlPath = 'users/demo_student_aarav/parentControls/demo_parent_sharma';
        if (!getDoc(controlPath)) {
            setDoc(controlPath, {
                monthlyAllowance: 8500,
                largeExpenseThreshold: 500,
                categoryLimits: { Food: 4500, Travel: 1500, Entertainment: 600 },
                updatedAt: Date.now() - 10 * 86400000
            });
        }

        // Seed a pending request from Aarav
        const requestsPath = 'users/demo_student_aarav/requests';
        if (!getDoc(requestsPath)) {
            setDoc(requestsPath, [
                {
                    id: 'req_demo_1',
                    type: 'extra_money',
                    amount: 1200,
                    reason: 'College semester lab exam fees & textbook xerox dues',
                    status: 'pending',
                    parentNote: '',
                    createdAt: Date.now() - 2 * 86400000,
                    decidedAt: null,
                    decidedBy: null,
                    applied: false
                }
            ]);
        }

        // Seed an active saving challenge offered by Mr. Sharma
        const challengesPath = 'users/demo_student_aarav/challenges';
        if (!getDoc(challengesPath)) {
            setDoc(challengesPath, [
                {
                    id: 'chal_demo_1',
                    title: 'Midterm Budget Sprint',
                    description: 'Spend ≤ ₹200 daily for 7 consecutive days',
                    rule: { type: 'daily_cap', value: 200, days: 7 },
                    reward: { amount: 250, note: 'Bonus pocket money allowance' },
                    createdBy: 'demo_parent_sharma',
                    status: 'active',
                    startDate: window.SS.utils ? window.SS.utils.getLocalDateString() : '2026-11-01',
                    endDate: '2026-11-07',
                    progress: { currentDays: 4, targetDays: 7 }
                }
            ]);
        }

        // Seed deterministic alerts
        const alertsPath = 'users/demo_student_aarav/alerts';
        if (!getDoc(alertsPath)) {
            setDoc(alertsPath, [
                {
                    id: '2026-11_large_expense_trek',
                    type: 'large_expense',
                    message: 'Aarav logged a large expense: ₹1,850 on Travel (Weekend Trek Bus & Stay)',
                    amount: 1850,
                    createdAt: Date.now() - 3 * 86400000,
                    readBy: {}
                },
                {
                    id: '2026-11_budget80',
                    type: 'budget80',
                    message: 'Monthly budget has reached 80% usage.',
                    createdAt: Date.now() - 1 * 86400000,
                    readBy: {}
                }
            ]);
        }
    }

    // Auto-seed on load
    seedDemoDataIfMissing();

    // -------------------------------------------------------------------------
    // Session State
    // -------------------------------------------------------------------------
    let currentUserState = getStoredJSON(SESSIONS_KEY, null);
    const authSubscribers = new Set();

    function notifyAuth(user) {
        currentUserState = user;
        authSubscribers.forEach(cb => {
            try { cb(user); } catch (e) {}
        });
    }

    // -------------------------------------------------------------------------
    // Adapter Implementation: Auth
    // -------------------------------------------------------------------------
    const auth = {
        async signUp({ email, password, name, role }) {
            await seedDemoDataIfMissing();
            const users = getStoredJSON(USERS_KEY, {});
            const normalizedEmail = email.trim().toLowerCase();

            if (Object.values(users).some(u => u.email.toLowerCase() === normalizedEmail)) {
                const err = new Error('Email address already registered.');
                err.code = 'auth/email-already-in-use';
                throw err;
            }

            const { hash, salt } = await hashPasswordPBKDF2(password);
            const uid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

            const newUser = {
                uid,
                email: normalizedEmail,
                name: name.trim(),
                role: role === 'parent' ? 'parent' : 'student',
                createdAt: Date.now(),
                emailVerified: true, // Auto-verified in local mode
                hash,
                salt,
                theme: 'system',
                language: 'en',
                shareLevelDefault: 'full'
            };

            users[uid] = newUser;
            setStoredJSON(USERS_KEY, users);

            const safeUser = { uid: newUser.uid, email: newUser.email, name: newUser.name, role: newUser.role, emailVerified: true };
            setStoredJSON(SESSIONS_KEY, safeUser);
            notifyAuth(safeUser);
            return safeUser;
        },

        async signIn({ email, password, remember = true }) {
            await seedDemoDataIfMissing();
            const users = getStoredJSON(USERS_KEY, {});
            const normalizedEmail = email.trim().toLowerCase();

            const userDoc = Object.values(users).find(u => u.email.toLowerCase() === normalizedEmail);
            if (!userDoc) {
                const err = new Error('Incorrect email or password.');
                err.code = 'auth/invalid-credential';
                throw err;
            }

            const { hash } = await hashPasswordPBKDF2(password, userDoc.salt);
            if (hash !== userDoc.hash) {
                const err = new Error('Incorrect email or password.');
                err.code = 'auth/invalid-credential';
                throw err;
            }

            const safeUser = {
                uid: userDoc.uid,
                email: userDoc.email,
                name: userDoc.name,
                role: userDoc.role,
                emailVerified: userDoc.emailVerified
            };

            if (remember) {
                setStoredJSON(SESSIONS_KEY, safeUser);
            }
            notifyAuth(safeUser);
            return safeUser;
        },

        async signInWithGoogle() {
            throw new Error('Google sign-in is only available in Cloud Mode.');
        },

        async signOut() {
            localStorage.removeItem(SESSIONS_KEY);
            notifyAuth(null);
            return true;
        },

        async sendReset(email) {
            return { message: `Demo reset link simulated for ${email}. You can sign in using your existing demo password.` };
        },

        onAuthChange(cb) {
            authSubscribers.add(cb);
            cb(currentUserState);
            return () => authSubscribers.delete(cb);
        },

        currentUser() {
            return currentUserState;
        },

        async reloadUser() {
            if (!currentUserState) return null;
            const users = getStoredJSON(USERS_KEY, {});
            const userDoc = users[currentUserState.uid];
            if (userDoc) {
                const safeUser = {
                    uid: userDoc.uid,
                    email: userDoc.email,
                    name: userDoc.name,
                    role: userDoc.role,
                    emailVerified: userDoc.emailVerified
                };
                setStoredJSON(SESSIONS_KEY, safeUser);
                notifyAuth(safeUser);
                return safeUser;
            }
            return null;
        },

        async resendVerification() {
            return true;
        }
    };

    // -------------------------------------------------------------------------
    // Adapter Implementation: Repository (Data Operations)
    // -------------------------------------------------------------------------
    const repo = {
        // --- Profile ---
        async getProfile(uid) {
            const users = getStoredJSON(USERS_KEY, {});
            const u = users[uid];
            return u ? { uid: u.uid, name: u.name, email: u.email, role: u.role, theme: u.theme, language: u.language } : null;
        },

        async updateProfile(uid, data) {
            const users = getStoredJSON(USERS_KEY, {});
            if (users[uid]) {
                // Ensure role is never mutated
                const safeUpdates = { ...data };
                delete safeUpdates.role;
                delete safeUpdates.uid;
                delete safeUpdates.email;

                users[uid] = { ...users[uid], ...safeUpdates };
                setStoredJSON(USERS_KEY, users);

                if (currentUserState && currentUserState.uid === uid) {
                    notifyAuth({ ...currentUserState, ...safeUpdates });
                }
                return users[uid];
            }
            throw new Error('User not found');
        },

        // --- Expenses ---
        subscribeExpenses(uid, cb) {
            const path = `users/${uid}/expenses`;
            const initial = getDoc(path) || [];
            cb(initial);
            return subscribeBus(path, (data) => cb(data || []));
        },

        async getExpenses(uid) {
            return getDoc(`users/${uid}/expenses`) || [];
        },

        async addExpense(uid, expense) {
            const path = `users/${uid}/expenses`;
            const list = getDoc(path) || [];
            list.unshift(expense);
            setDoc(path, list);
            return expense;
        },

        async updateExpense(uid, expense) {
            const path = `users/${uid}/expenses`;
            const list = getDoc(path) || [];
            const idx = list.findIndex(e => e.id === expense.id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...expense };
                setDoc(path, list);
                return list[idx];
            }
            throw new Error('Expense not found');
        },

        async removeExpense(uid, expenseId) {
            const path = `users/${uid}/expenses`;
            const list = getDoc(path) || [];
            const updated = list.filter(e => e.id !== expenseId);
            setDoc(path, updated);
            return true;
        },

        async bulkImportExpenses(uid, expenses) {
            const path = `users/${uid}/expenses`;
            const list = getDoc(path) || [];
            const existingIds = new Set(list.map(e => e.id));
            let added = 0;
            expenses.forEach(e => {
                if (!existingIds.has(e.id)) {
                    list.push(e);
                    existingIds.add(e.id);
                    added++;
                }
            });
            list.sort((a, b) => b.date.localeCompare(a.date));
            setDoc(path, list);
            return { count: added, total: list.length };
        },

        // --- Budgets ---
        subscribeBudgets(uid, cb) {
            const path = `users/${uid}/budgets`;
            const initial = getDoc(path) || {};
            cb(initial);
            return subscribeBus(path, (data) => cb(data || {}));
        },

        async getBudgets(uid) {
            return getDoc(`users/${uid}/budgets`) || {};
        },

        async setMonthBudget(uid, monthKey, amount) {
            const path = `users/${uid}/budgets`;
            const budgets = getDoc(path) || {};
            budgets[monthKey] = Math.round(amount);
            setDoc(path, budgets);
            return budgets;
        },

        // --- Category Budgets & Caps ---
        subscribeCategoryBudgets(uid, cb) {
            const path = `users/${uid}/categoryBudgets`;
            const initial = getDoc(path) || {};
            cb(initial);
            return subscribeBus(path, (data) => cb(data || {}));
        },

        async setCategoryBudgets(uid, caps) {
            const path = `users/${uid}/categoryBudgets`;
            setDoc(path, caps);
            return caps;
        },

        // --- Goals ---
        subscribeGoals(uid, cb) {
            const path = `users/${uid}/goals`;
            const initial = getDoc(path) || [];
            cb(initial);
            return subscribeBus(path, (data) => cb(data || []));
        },

        async getGoals(uid) {
            return getDoc(`users/${uid}/goals`) || [];
        },

        async saveGoals(uid, goals) {
            const path = `users/${uid}/goals`;
            setDoc(path, goals);
            return goals;
        },

        // --- Recurring ---
        subscribeRecurring(uid, cb) {
            const path = `users/${uid}/recurring`;
            const initial = getDoc(path) || [];
            cb(initial);
            return subscribeBus(path, (data) => cb(data || []));
        },

        async getRecurring(uid) {
            return getDoc(`users/${uid}/recurring`) || [];
        },

        async saveRecurring(uid, recurring) {
            const path = `users/${uid}/recurring`;
            setDoc(path, recurring);
            return recurring;
        },

        // --- Linking & Invites ---
        async createInvite(childUid, childName) {
            const invites = getStoredJSON(INVITES_KEY, {});
            const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 8; i++) {
                code += charset.charAt(Math.floor(Math.random() * charset.length));
            }

            const inviteData = {
                code,
                childUid,
                childName,
                createdAt: Date.now(),
                expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins expiry
                used: false,
                usedBy: null
            };

            invites[code] = inviteData;
            setStoredJSON(INVITES_KEY, invites);
            return inviteData;
        },

        async redeemInvite(parentUid, parentName, code) {
            const cleanCode = (code || '').trim().toUpperCase();
            const invites = getStoredJSON(INVITES_KEY, {});
            const invite = invites[cleanCode];

            if (!invite) {
                const err = new Error('Invalid invite code. Please check and try again.');
                err.code = 'invite/not-found';
                throw err;
            }

            if (invite.used) {
                const err = new Error('This invite code has already been redeemed.');
                err.code = 'invite/already-used';
                throw err;
            }

            if (Date.now() > invite.expiresAt) {
                const err = new Error('This invite code has expired. Please ask your child for a new code.');
                err.code = 'invite/expired';
                throw err;
            }

            if (invite.childUid === parentUid) {
                const err = new Error('You cannot link with your own account.');
                err.code = 'invite/self-link';
                throw err;
            }

            const links = getStoredJSON(LINKS_KEY, []);
            const linkId = `${invite.childUid}_${parentUid}`;

            // Check if already actively linked
            const existing = links.find(l => l.id === linkId);
            if (existing && existing.status === 'active') {
                const err = new Error('You are already linked with this student.');
                err.code = 'invite/already-linked';
                throw err;
            }

            // Atomically mark invite used and create link
            invite.used = true;
            invite.usedBy = parentUid;
            invites[cleanCode] = invite;
            setStoredJSON(INVITES_KEY, invites);

            const newLink = {
                id: linkId,
                childUid: invite.childUid,
                parentUid: parentUid,
                childName: invite.childName,
                parentName: parentName,
                status: 'active',
                shareLevel: 'full',
                createdAt: Date.now(),
                inviteCode: cleanCode
            };

            const updatedLinks = links.filter(l => l.id !== linkId);
            updatedLinks.push(newLink);
            setStoredJSON(LINKS_KEY, updatedLinks);

            // Notify channels
            emitBus('links_changed', updatedLinks);
            return newLink;
        },

        async listLinksForChild(childUid) {
            const links = getStoredJSON(LINKS_KEY, []);
            return links.filter(l => l.childUid === childUid && l.status === 'active');
        },

        async listLinksForParent(parentUid) {
            const links = getStoredJSON(LINKS_KEY, []);
            return links.filter(l => l.parentUid === parentUid && l.status === 'active');
        },

        async getLinks(uid) {
            const links = getStoredJSON(LINKS_KEY, []);
            return links.filter(l => (l.childUid === uid || l.parentUid === uid) && l.status === 'active');
        },

        subscribeLinks(uid, cb) {
            const check = () => {
                const links = getStoredJSON(LINKS_KEY, []);
                const myLinks = links.filter(l => (l.childUid === uid || l.parentUid === uid) && l.status === 'active');
                cb(myLinks);
            };
            check();
            return subscribeBus('links_changed', () => check());
        },

        async setShareLevel(childUid, parentUid, shareLevel) {
            const links = getStoredJSON(LINKS_KEY, []);
            const linkId = `${childUid}_${parentUid}`;
            const link = links.find(l => l.id === linkId);
            if (link) {
                link.shareLevel = shareLevel;
                setStoredJSON(LINKS_KEY, links);
                emitBus('links_changed', links);
                return link;
            }
            throw new Error('Link not found');
        },

        async revokeLink(childUid, parentUid) {
            const links = getStoredJSON(LINKS_KEY, []);
            const linkId = `${childUid}_${parentUid}`;
            const link = links.find(l => l.id === linkId);
            if (link) {
                link.status = 'revoked';
                setStoredJSON(LINKS_KEY, links);
                emitBus('links_changed', links);
                return true;
            }
            return false;
        },

        // --- Parent Controls ---
        subscribeControls(childUid, parentUid, cb) {
            const path = `users/${childUid}/parentControls/${parentUid}`;
            const initial = getDoc(path) || { monthlyAllowance: 0, categoryLimits: {}, largeExpenseThreshold: 500 };
            cb(initial);
            return subscribeBus(path, (data) => cb(data || {}));
        },

        async getControls(childUid, parentUid) {
            const path = `users/${childUid}/parentControls/${parentUid}`;
            return getDoc(path) || { monthlyAllowance: 0, categoryLimits: {}, largeExpenseThreshold: 500 };
        },

        async setControls(childUid, parentUid, controlsData) {
            const path = `users/${childUid}/parentControls/${parentUid || 'parent_1'}`;
            const updated = { ...controlsData, updatedAt: Date.now() };
            setDoc(path, updated);
            return updated;
        },

        async saveControls(childUid, controlsData, parentUid) {
            return repo.setControls(childUid, parentUid || 'parent_1', controlsData);
        },

        // --- Money Requests ---
        subscribeRequests(childUid, cb) {
            const path = `users/${childUid}/requests`;
            const initial = getDoc(path) || [];
            cb(initial);
            return subscribeBus(path, (data) => cb(data || []));
        },

        async getRequests(childUid) {
            return getDoc(`users/${childUid}/requests`) || [];
        },

        async createRequest(childUid, requestData) {
            const path = `users/${childUid}/requests`;
            const requests = getDoc(path) || [];
            const newReq = {
                id: 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
                childUid,
                status: 'pending',
                parentNote: '',
                createdAt: Date.now(),
                decidedAt: null,
                decidedBy: null,
                applied: false,
                ...requestData
            };
            requests.unshift(newReq);
            setDoc(path, requests);
            return newReq;
        },

        async decideRequest(childUid, requestId, { status, parentNote = '', approvedAmount = null, decidedBy }) {
            const path = `users/${childUid}/requests`;
            const requests = getDoc(path) || [];
            const req = requests.find(r => r.id === requestId);
            if (!req) throw new Error('Request not found');

            req.status = status; // 'approved' | 'declined'
            req.parentNote = parentNote;
            req.decidedAt = Date.now();
            req.decidedBy = decidedBy;

            if (approvedAmount !== null && Number.isFinite(approvedAmount)) {
                req.approvedAmount = approvedAmount;
            }

            setDoc(path, requests);
            return req;
        },

        async markRequestApplied(childUid, requestId) {
            const path = `users/${childUid}/requests`;
            const requests = getDoc(path) || [];
            const req = requests.find(r => r.id === requestId);
            if (req) {
                req.applied = true;
                setDoc(path, requests);
                return req;
            }
            return null;
        },

        // --- Challenges ---
        subscribeChallenges(childUid, cb) {
            const path = `users/${childUid}/challenges`;
            const initial = getDoc(path) || [];
            cb(initial);
            return subscribeBus(path, (data) => cb(data || []));
        },

        async getChallenges(childUid) {
            return getDoc(`users/${childUid}/challenges`) || [];
        },

        async offerChallenge(childUid, challengeData) {
            const path = `users/${childUid}/challenges`;
            const list = getDoc(path) || [];
            const newChal = {
                id: 'chal_' + Date.now().toString(36),
                status: 'offered',
                createdAt: Date.now(),
                progress: { currentDays: 0, targetDays: challengeData.rule.days || 7 },
                ...challengeData
            };
            list.unshift(newChal);
            setDoc(path, list);
            return newChal;
        },

        async respondChallenge(childUid, challengeId, status) {
            const path = `users/${childUid}/challenges`;
            const list = getDoc(path) || [];
            const c = list.find(item => item.id === challengeId);
            if (c) {
                c.status = status; // 'active' | 'declined' | 'completed' | 'failed'
                setDoc(path, list);
                return c;
            }
            throw new Error('Challenge not found');
        },

        // --- Alerts (Deterministic & Idempotent) ---
        subscribeAlerts(childUid, cb) {
            const path = `users/${childUid}/alerts`;
            const initial = getDoc(path) || [];
            cb(initial);
            return subscribeBus(path, (data) => cb(data || []));
        },

        async getAlerts(childUid) {
            return getDoc(`users/${childUid}/alerts`) || [];
        },

        async raiseAlert(childUid, alertData) {
            const path = `users/${childUid}/alerts`;
            const alerts = getDoc(path) || [];
            const dedupeKey = alertData.id;

            // Idempotent: check if dedupeKey exists
            if (alerts.some(a => a.id === dedupeKey)) {
                return null; // Already raised
            }

            const alertObj = {
                createdAt: Date.now(),
                readBy: {},
                ...alertData
            };

            alerts.unshift(alertObj);
            setDoc(path, alerts);
            return alertObj;
        },

        async markAlertRead(childUid, alertId, parentUid) {
            const path = `users/${childUid}/alerts`;
            const alerts = getDoc(path) || [];
            const a = alerts.find(item => item.id === alertId);
            if (a) {
                if (!a.readBy) a.readBy = {};
                a.readBy[parentUid] = true;
                setDoc(path, alerts);
                return a;
            }
            return null;
        }
    };

    window.SS.adapters.local = Object.freeze({
        auth,
        repo,
        seedDemoDataIfMissing
    });
})();
