/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/adapters/firebase.js
   Namespace: window.SS.adapters.firebase
   Firebase Cloud Mode: Dynamic Compat 10.12.5 SDK loader,
   Offline persistence, Firestore security-hardened queries,
   and realtime subscriptions.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.adapters = window.SS.adapters || {};

    const FIREBASE_VERSION = '10.12.5';
    let isInitialized = false;
    let initPromise = null;
    let authInstance = null;
    let dbInstance = null;

    /**
     * Dynamically loads a script tag with timeout and error handling.
     */
    function loadScript(src, timeoutMs = 4500) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.defer = true;
            let timer = null;

            script.onload = () => {
                clearTimeout(timer);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timer);
                reject(new Error(`Failed to load external script: ${src}`));
            };

            timer = setTimeout(() => {
                script.onerror = null;
                script.onload = null;
                reject(new Error(`Timed out loading: ${src}`));
            }, timeoutMs);

            document.head.appendChild(script);
        });
    }

    /**
     * Dynamically loads Firebase Compat 10.12.5 modules only if config exists.
     */
    async function initFirebase() {
        if (initPromise) return initPromise;

        initPromise = (async () => {
            const config = window.SS_FIREBASE_CONFIG;
            if (!config || typeof config !== 'object' || !config.apiKey) {
                return false; // Cloud mode disabled
            }

            try {
                // Load Firebase App Compat
                if (!window.firebase || !window.firebase.app) {
                    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`);
                }
                // Load Auth Compat
                if (!window.firebase.auth) {
                    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth-compat.js`);
                }
                // Load Firestore Compat
                if (!window.firebase.firestore) {
                    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore-compat.js`);
                }

                // Initialize App
                if (!window.firebase.apps.length) {
                    window.firebase.initializeApp(config);
                }

                authInstance = window.firebase.auth();
                dbInstance = window.firebase.firestore();

                // Enable Firestore multi-tab offline persistence
                try {
                    await dbInstance.enablePersistence({ synchronizeTabs: true });
                } catch (err) {
                    if (err.code === 'failed-precondition') {
                        console.warn('[Firestore] Multi-tab persistence failed-precondition, proceeding in memory.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('[Firestore] Browser does not support persistence.');
                    }
                }

                isInitialized = true;
                return true;
            } catch (err) {
                console.warn('[FirebaseLoader] Could not load or initialize Firebase. Falling back to Local Demo Mode:', err.message);
                return false;
            }
        })();

        return initPromise;
    }

    // -------------------------------------------------------------------------
    // Cloud Adapter: Auth
    // -------------------------------------------------------------------------
    const auth = {
        async signUp({ email, password, name, role }) {
            await initFirebase();
            const cred = await authInstance.createUserWithEmailAndPassword(email.trim(), password);
            const user = cred.user;

            await user.updateProfile({ displayName: name.trim() });

            // Create users/{uid} document
            const userDoc = {
                uid: user.uid,
                email: user.email.toLowerCase(),
                name: name.trim(),
                role: role === 'parent' ? 'parent' : 'student',
                createdAt: Date.now(),
                language: 'en',
                theme: 'system',
                shareLevelDefault: 'full'
            };

            await dbInstance.collection('users').doc(user.uid).set(userDoc);

            try {
                await user.sendEmailVerification();
            } catch (e) {
                console.warn('[Firebase] Verification email skipped:', e);
            }

            return {
                uid: user.uid,
                email: user.email,
                name: name.trim(),
                role: userDoc.role,
                emailVerified: user.emailVerified
            };
        },

        async signIn({ email, password, remember = true }) {
            await initFirebase();
            const persistence = remember
                ? window.firebase.auth.Auth.Persistence.LOCAL
                : window.firebase.auth.Auth.Persistence.SESSION;
            await authInstance.setPersistence(persistence);

            const cred = await authInstance.signInWithEmailAndPassword(email.trim(), password);
            const user = cred.user;

            // Fetch user profile from Firestore to determine role
            const snap = await dbInstance.collection('users').doc(user.uid).get();
            const profile = snap.exists ? snap.data() : { role: 'student', name: user.displayName || 'Student' };

            return {
                uid: user.uid,
                email: user.email,
                name: profile.name || user.displayName || '',
                role: profile.role || 'student',
                emailVerified: user.emailVerified
            };
        },

        async signInWithGoogle() {
            await initFirebase();
            const provider = new window.firebase.auth.GoogleAuthProvider();
            const cred = await authInstance.signInWithPopup(provider);
            const user = cred.user;

            // Fetch or create user record
            const ref = dbInstance.collection('users').doc(user.uid);
            const snap = await ref.get();
            let profile;

            if (!snap.exists) {
                profile = {
                    uid: user.uid,
                    email: user.email.toLowerCase(),
                    name: user.displayName || 'Student User',
                    role: 'student', // Defaults to student upon Google sign-in
                    createdAt: Date.now(),
                    language: 'en',
                    theme: 'system',
                    shareLevelDefault: 'full'
                };
                await ref.set(profile);
            } else {
                profile = snap.data();
            }

            return {
                uid: user.uid,
                email: user.email,
                name: profile.name,
                role: profile.role,
                emailVerified: user.emailVerified
            };
        },

        async signOut() {
            if (authInstance) {
                await authInstance.signOut();
            }
            return true;
        },

        async sendReset(email) {
            await initFirebase();
            await authInstance.sendPasswordResetEmail(email.trim());
            return { message: 'Password recovery email sent. Please check your inbox.' };
        },

        onAuthChange(cb) {
            initFirebase().then(ready => {
                if (!ready || !authInstance) return;
                authInstance.onAuthStateChanged(async (user) => {
                    if (user) {
                        try {
                            const snap = await dbInstance.collection('users').doc(user.uid).get();
                            const profile = snap.exists ? snap.data() : {};
                            cb({
                                uid: user.uid,
                                email: user.email,
                                name: profile.name || user.displayName || '',
                                role: profile.role || 'student',
                                emailVerified: user.emailVerified
                            });
                        } catch (e) {
                            cb({ uid: user.uid, email: user.email, name: user.displayName || '', role: 'student', emailVerified: user.emailVerified });
                        }
                    } else {
                        cb(null);
                    }
                });
            });
            return () => {};
        },

        currentUser() {
            const u = authInstance ? authInstance.currentUser : null;
            return u ? { uid: u.uid, email: u.email, name: u.displayName, emailVerified: u.emailVerified } : null;
        },

        async reloadUser() {
            if (authInstance && authInstance.currentUser) {
                await authInstance.currentUser.reload();
                return auth.currentUser();
            }
            return null;
        },

        async resendVerification() {
            if (authInstance && authInstance.currentUser) {
                await authInstance.currentUser.sendEmailVerification();
                return true;
            }
            return false;
        }
    };

    // -------------------------------------------------------------------------
    // Cloud Adapter: Repository
    // -------------------------------------------------------------------------
    const repo = {
        async getProfile(uid) {
            await initFirebase();
            const snap = await dbInstance.collection('users').doc(uid).get();
            return snap.exists ? snap.data() : null;
        },

        async updateProfile(uid, data) {
            await initFirebase();
            const safeData = { ...data };
            delete safeData.role;
            delete safeData.uid;
            delete safeData.email;
            await dbInstance.collection('users').doc(uid).update(safeData);
            return safeData;
        },

        subscribeExpenses(uid, cb) {
            let unsub = () => {};
            initFirebase().then(ready => {
                if (!ready) return;
                const ref = dbInstance.collection('users').doc(uid).collection('expenses').orderBy('date', 'desc');
                unsub = ref.onSnapshot((snapshot) => {
                    const expenses = [];
                    snapshot.forEach(doc => {
                        expenses.push({ id: doc.id, ...doc.data() });
                    });
                    cb(expenses);
                }, (err) => {
                    console.warn('[Firestore] Expenses subscription notice:', err.message);
                });
            });
            return () => unsub();
        },

        async getExpenses(uid) {
            await initFirebase();
            const snap = await dbInstance.collection('users').doc(uid).collection('expenses').orderBy('date', 'desc').get();
            const list = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            return list;
        },

        async addExpense(uid, expense) {
            await initFirebase();
            const docId = expense.id || dbInstance.collection('users').doc(uid).collection('expenses').doc().id;
            const toSave = { ...expense, id: docId };
            await dbInstance.collection('users').doc(uid).collection('expenses').doc(docId).set(toSave);
            return toSave;
        },

        async updateExpense(uid, expense) {
            await initFirebase();
            await dbInstance.collection('users').doc(uid).collection('expenses').doc(expense.id).update(expense);
            return expense;
        },

        async removeExpense(uid, expenseId) {
            await initFirebase();
            await dbInstance.collection('users').doc(uid).collection('expenses').doc(expenseId).delete();
            return true;
        },

        async bulkImportExpenses(uid, expenses) {
            await initFirebase();
            const batch = dbInstance.batch();
            let count = 0;
            expenses.forEach(e => {
                const docRef = dbInstance.collection('users').doc(uid).collection('expenses').doc(e.id);
                batch.set(docRef, e);
                count++;
            });
            await batch.commit();
            return { count, total: count };
        },

        subscribeBudgets(uid, cb) {
            let unsub = () => {};
            initFirebase().then(ready => {
                if (!ready) return;
                unsub = dbInstance.collection('users').doc(uid).collection('budgets').onSnapshot(snap => {
                    const map = {};
                    snap.forEach(d => { map[d.id] = (d.data() && d.data().total) || 0; });
                    cb(map);
                });
            });
            return () => unsub();
        },

        async getBudgets(uid) {
            await initFirebase();
            const snap = await dbInstance.collection('users').doc(uid).collection('budgets').get();
            const map = {};
            snap.forEach(d => { map[d.id] = (d.data() && d.data().total) || 0; });
            return map;
        },

        async setMonthBudget(uid, monthKey, amount) {
            await initFirebase();
            await dbInstance.collection('users').doc(uid).collection('budgets').doc(monthKey).set({
                total: Math.round(amount),
                updatedAt: Date.now()
            }, { merge: true });
        },

        // --- Invites & Links ---
        async createInvite(childUid, childName) {
            await initFirebase();
            const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 8; i++) code += charset.charAt(Math.floor(Math.random() * charset.length));

            const inviteData = {
                childUid,
                childName,
                createdAt: Date.now(),
                expiresAt: Date.now() + 15 * 60 * 1000,
                used: false,
                usedBy: null
            };

            await dbInstance.collection('invites').doc(code).set(inviteData);
            return { code, ...inviteData };
        },

        async redeemInvite(parentUid, parentName, code) {
            await initFirebase();
            const cleanCode = (code || '').trim().toUpperCase();
            const inviteRef = dbInstance.collection('invites').doc(cleanCode);

            // Execute atomic batch/transaction for link creation + invite consumption
            return await dbInstance.runTransaction(async (transaction) => {
                const inviteSnap = await transaction.get(inviteRef);
                if (!inviteSnap.exists) {
                    const err = new Error('Invalid invite code. Please check and try again.');
                    err.code = 'invite/not-found';
                    throw err;
                }

                const invite = inviteSnap.data();
                if (invite.used) {
                    const err = new Error('This invite code has already been redeemed.');
                    err.code = 'invite/already-used';
                    throw err;
                }
                if (Date.now() > invite.expiresAt) {
                    const err = new Error('This invite code has expired. Please ask for a new code.');
                    err.code = 'invite/expired';
                    throw err;
                }
                if (invite.childUid === parentUid) {
                    const err = new Error('You cannot link with your own account.');
                    err.code = 'invite/self-link';
                    throw err;
                }

                const linkId = `${invite.childUid}_${parentUid}`;
                const linkRef = dbInstance.collection('links').doc(linkId);

                // Mark invite as used
                transaction.update(inviteRef, {
                    used: true,
                    usedBy: parentUid
                });

                const newLink = {
                    id: linkId,
                    childUid: invite.childUid,
                    parentUid,
                    childName: invite.childName,
                    parentName,
                    status: 'active',
                    shareLevel: 'full',
                    createdAt: Date.now(),
                    inviteCode: cleanCode
                };

                transaction.set(linkRef, newLink);
                return newLink;
            });
        },

        subscribeLinks(uid, cb) {
            let unsubChild = () => {};
            let unsubParent = () => {};
            initFirebase().then(ready => {
                if (!ready) return;
                const ref = dbInstance.collection('links');
                unsubChild = ref.where('childUid', '==', uid).where('status', '==', 'active').onSnapshot(snap => {
                    const list = [];
                    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                    cb(list);
                });
                unsubParent = ref.where('parentUid', '==', uid).where('status', '==', 'active').onSnapshot(snap => {
                    const list = [];
                    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                    cb(list);
                });
            });
            return () => {
                unsubChild();
                unsubParent();
            };
        },

        async setShareLevel(childUid, parentUid, shareLevel) {
            await initFirebase();
            const linkId = `${childUid}_${parentUid}`;
            await dbInstance.collection('links').doc(linkId).update({ shareLevel });
        },

        async revokeLink(childUid, parentUid) {
            await initFirebase();
            const linkId = `${childUid}_${parentUid}`;
            await dbInstance.collection('links').doc(linkId).update({ status: 'revoked' });
        },

        // --- Controls, Requests, Alerts, Challenges ---
        subscribeControls(childUid, parentUid, cb) {
            let unsub = () => {};
            initFirebase().then(ready => {
                if (!ready) return;
                unsub = dbInstance.collection('users').doc(childUid).collection('parentControls').doc(parentUid).onSnapshot(doc => {
                    cb(doc.exists ? doc.data() : { monthlyAllowance: 0, categoryLimits: {}, largeExpenseThreshold: 500 });
                });
            });
            return () => unsub();
        },

        async setControls(childUid, parentUid, controlsData) {
            await initFirebase();
            await dbInstance.collection('users').doc(childUid).collection('parentControls').doc(parentUid).set({
                ...controlsData,
                updatedAt: Date.now()
            }, { merge: true });
        },

        subscribeRequests(childUid, cb) {
            let unsub = () => {};
            initFirebase().then(ready => {
                if (!ready) return;
                unsub = dbInstance.collection('users').doc(childUid).collection('requests').orderBy('createdAt', 'desc').onSnapshot(snap => {
                    const list = [];
                    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                    cb(list);
                });
            });
            return () => unsub();
        },

        async createRequest(childUid, requestData) {
            await initFirebase();
            const ref = dbInstance.collection('users').doc(childUid).collection('requests').doc();
            const docData = {
                id: ref.id,
                childUid,
                status: 'pending',
                parentNote: '',
                createdAt: Date.now(),
                decidedAt: null,
                decidedBy: null,
                applied: false,
                ...requestData
            };
            await ref.set(docData);
            return docData;
        },

        async decideRequest(childUid, requestId, { status, parentNote = '', approvedAmount = null, decidedBy }) {
            await initFirebase();
            const ref = dbInstance.collection('users').doc(childUid).collection('requests').doc(requestId);
            const updates = {
                status,
                parentNote,
                decidedAt: Date.now(),
                decidedBy
            };
            if (approvedAmount !== null) updates.approvedAmount = approvedAmount;
            await ref.update(updates);
            return updates;
        },

        async markRequestApplied(childUid, requestId) {
            await initFirebase();
            await dbInstance.collection('users').doc(childUid).collection('requests').doc(requestId).update({ applied: true });
        },

        subscribeChallenges(childUid, cb) {
            let unsub = () => {};
            initFirebase().then(ready => {
                if (!ready) return;
                unsub = dbInstance.collection('users').doc(childUid).collection('challenges').orderBy('createdAt', 'desc').onSnapshot(snap => {
                    const list = [];
                    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                    cb(list);
                });
            });
            return () => unsub();
        },

        async offerChallenge(childUid, challengeData) {
            await initFirebase();
            const ref = dbInstance.collection('users').doc(childUid).collection('challenges').doc();
            const toSave = {
                id: ref.id,
                status: 'offered',
                createdAt: Date.now(),
                progress: { currentDays: 0, targetDays: challengeData.rule.days || 7 },
                ...challengeData
            };
            await ref.set(toSave);
            return toSave;
        },

        async respondChallenge(childUid, challengeId, status) {
            await initFirebase();
            await dbInstance.collection('users').doc(childUid).collection('challenges').doc(challengeId).update({ status });
        },

        subscribeAlerts(childUid, cb) {
            let unsub = () => {};
            initFirebase().then(ready => {
                if (!ready) return;
                unsub = dbInstance.collection('users').doc(childUid).collection('alerts').orderBy('createdAt', 'desc').onSnapshot(snap => {
                    const list = [];
                    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                    cb(list);
                });
            });
            return () => unsub();
        },

        async raiseAlert(childUid, alertData) {
            await initFirebase();
            const docRef = dbInstance.collection('users').doc(childUid).collection('alerts').doc(alertData.id);
            const snap = await docRef.get();
            if (snap.exists) return null; // Idempotent

            const alertObj = {
                createdAt: Date.now(),
                readBy: {},
                ...alertData
            };
            await docRef.set(alertObj);
            return alertObj;
        },

        async markAlertRead(childUid, alertId, parentUid) {
            await initFirebase();
            const ref = dbInstance.collection('users').doc(childUid).collection('alerts').doc(alertId);
            await ref.update({ [`readBy.${parentUid}`]: true });
        }
    };

    window.SS.adapters.firebase = Object.freeze({
        init: initFirebase,
        auth,
        repo,
        isCloudActive: () => isInitialized
    });
})();
