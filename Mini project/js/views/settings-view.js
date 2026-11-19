/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/views/settings-view.js
   Namespace: window.SS.views.settings
   Unified Settings View for Student, Parent & Guest roles:
   Profile, Appearance, Language, Backups, and Demo Controls.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.views = window.SS.views || {};

    const { t, setLanguage, getLanguage } = window.SS.i18n;
    const { auth, repo, storage } = window.SS;
    const { showToast, applyTheme } = window.SS.ui;

    /**
     * Mounts the Settings View.
     */
    function renderSettingsView() {
        document.querySelectorAll('.app-view').forEach(v => {
            v.hidden = (v.id !== 'settingsViewContainer');
        });
        const container = document.getElementById('settingsViewContainer');
        if (!container) return;
        container.classList.add('active-view');
        container.replaceChildren();

        const currentUser = auth.currentUser() || {
            uid: 'guest',
            name: 'Guest User',
            email: 'guest@smartspend.local',
            role: 'student',
            isGuest: true
        };

        const activeMode = auth.getMode ? auth.getMode() : 'local';

        const shell = document.createElement('div');
        shell.className = 'container settings-shell';
        shell.style.maxWidth = '760px';
        shell.style.margin = '2rem auto';

        shell.innerHTML = `
            <div class="settings-header" style="margin-bottom: 2rem;">
                <h2>⚙️ ${t('settings') || 'Settings & Preferences'}</h2>
                <p class="text-muted">Manage your profile, theme, language, and data backups.</p>
            </div>

            <!-- Profile & Account Card -->
            <div class="card settings-card" style="margin-bottom: 1.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">👤 Account Information</h3>
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: var(--primary-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700;">
                            ${escapeHTML(currentUser.name.charAt(0).toUpperCase())}
                        </div>
                        <div>
                            <h4 style="margin: 0;">${escapeHTML(currentUser.name)}</h4>
                            <span class="text-muted" style="font-size: 0.9rem;">${escapeHTML(currentUser.email)}</span>
                            <div style="margin-top: 4px;">
                                <span class="badge ${currentUser.role === 'parent' ? 'badge-primary' : (currentUser.isGuest ? 'badge-warning' : 'badge-success')}">
                                    ${currentUser.isGuest ? 'Guest Trial' : (currentUser.role === 'parent' ? 'Parent Account' : 'Student Account')}
                                </span>
                                <span class="badge badge-secondary" style="margin-left: 6px;">
                                    ${activeMode === 'cloud' ? '☁️ Cloud Sync' : '💻 Local Demo Mode'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <button type="button" class="btn btn-outline-danger btn-sm" id="settingsSignOutBtn">
                            ${currentUser.isGuest ? 'Exit Guest Mode' : t('logout')}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Appearance & Display -->
            <div class="card settings-card" style="margin-bottom: 1.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">🎨 Appearance & Display</h3>
                <div class="form-group" style="margin-bottom: 1.2rem;">
                    <label for="themeSelect" style="display: block; font-weight: 600; margin-bottom: 0.4rem;">Color Theme</label>
                    <select id="themeSelect" class="form-control" style="max-width: 320px;">
                        <option value="system">🌓 System Default</option>
                        <option value="light">☀️ Light Theme</option>
                        <option value="dark">🌙 Dark Theme</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="languageSelect" style="display: block; font-weight: 600; margin-bottom: 0.4rem;">Application Language (भाषा)</label>
                    <select id="languageSelect" class="form-control" style="max-width: 320px;">
                        <option value="en">English (India)</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                </div>
            </div>

            <!-- Transparency & Parental Links (Student Only) -->
            ${currentUser.role === 'student' && !currentUser.isGuest ? `
                <div class="card settings-card" style="margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 0.5rem;">🛡️ Parental Transparency & Consent</h3>
                    <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 1rem;">
                        SmartSpend parental monitoring is 100% consent-based. You control who can view your financial records and choose between Full Transparency or Summary-Only mode.
                    </p>
                    <a href="#/link" class="btn btn-outline-primary btn-sm">Manage Linked Parents & Invite Code →</a>
                </div>
            ` : ''}

            <!-- Data Backup & Export (Student & Guest) -->
            ${currentUser.role === 'student' || currentUser.isGuest ? `
                <div class="card settings-card" style="margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem;">💾 Data Management & Backups</h3>
                    <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 1.2rem;">
                        Export your financial data as a portable JSON backup or spreadsheet CSV file.
                    </p>
                    <div style="display: flex; gap: 0.8rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-outline-secondary btn-sm" id="downloadBackupBtn">
                            📦 Download JSON Backup
                        </button>
                        <label class="btn btn-outline-secondary btn-sm" style="margin: 0; cursor: pointer;">
                            📥 Restore Backup
                            <input type="file" id="restoreBackupInput" accept=".json" style="display: none;">
                        </label>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="exportStudentCSVBtn">
                            📊 Export CSV Spreadsheet
                        </button>
                    </div>
                </div>
            ` : ''}

            <!-- Local Demo Mode Tools -->
            ${activeMode === 'local' ? `
                <div class="card settings-card" style="border: 1px dashed var(--warning-color); background: var(--bg-secondary);">
                    <h3 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--warning-color);">🎮 Judge & Demo Controls</h3>
                    <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">
                        Running in Local Demo Mode with PBKDF2 hashed credentials. Use these shortcuts to quickly toggle roles or reset demo data.
                    </p>
                    <div style="display: flex; gap: 0.8rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-sm btn-outline-primary" id="switchDemoAccountBtn">
                            🔄 Switch to ${currentUser.role === 'parent' ? 'Demo Student (Aarav)' : 'Demo Parent (Mr. Sharma)'}
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" id="resetDemoDataBtn">
                            ⚠️ Reset Demo Data to Clean Seed
                        </button>
                    </div>
                </div>
            ` : ''}
        `;

        container.appendChild(shell);

        // 1. Wire Theme Selection
        const themeSelect = shell.querySelector('#themeSelect');
        if (themeSelect) {
            let curTheme = 'system';
            try {
                const raw = localStorage.getItem('smartSpend.v2');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    curTheme = (parsed && parsed.settings && parsed.settings.theme) || 'system';
                }
            } catch (e) {}
            themeSelect.value = curTheme;

            themeSelect.addEventListener('change', () => {
                const chosen = themeSelect.value;
                if (applyTheme) {
                    applyTheme(chosen);
                } else {
                    let effective = chosen;
                    if (chosen === 'system') {
                        effective = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
                    }
                    document.documentElement.setAttribute('data-theme', effective);
                }
                showToast(`Theme updated to ${chosen}.`);
            });
        }

        // 2. Wire Language Selection
        const langSelect = shell.querySelector('#languageSelect');
        if (langSelect) {
            langSelect.value = getLanguage();
            langSelect.addEventListener('change', () => {
                setLanguage(langSelect.value);
                renderSettingsView();
                showToast(`Language changed to ${langSelect.value === 'hi' ? 'हिन्दी' : 'English'}.`);
            });
        }

        // 3. Wire Sign Out
        const signOutBtn = shell.querySelector('#settingsSignOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async () => {
                await auth.signOut();
                showToast('Signed out successfully.');
                window.SS.router.navigate('/login');
            });
        }

        // 4. Wire JSON Backup Download
        const backupBtn = shell.querySelector('#downloadBackupBtn');
        if (backupBtn) {
            backupBtn.addEventListener('click', async () => {
                try {
                    let backupObj = {};
                    if (storage && storage.createBackup) {
                        backupObj = storage.createBackup();
                    } else {
                        const expenses = await repo.getExpenses(currentUser.uid);
                        const budgets = await repo.getBudgets(currentUser.uid);
                        const goals = await repo.getGoals(currentUser.uid);
                        backupObj = {
                            version: '2.0.0',
                            exportedAt: new Date().toISOString(),
                            expenses,
                            budgets,
                            goals
                        };
                    }
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
                    const dl = document.createElement('a');
                    dl.setAttribute('href', dataStr);
                    dl.setAttribute('download', `SmartSpend_Backup_${new Date().toISOString().split('T')[0]}.json`);
                    document.body.appendChild(dl);
                    dl.click();
                    document.body.removeChild(dl);
                    showToast('Backup downloaded successfully!');
                } catch (e) {
                    showToast('Could not create backup file.');
                }
            });
        }

        // 5. Wire JSON Restore
        const restoreInput = shell.querySelector('#restoreBackupInput');
        if (restoreInput) {
            restoreInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        if (!parsed || (!parsed.expenses && !parsed.state)) {
                            throw new Error('Invalid backup schema');
                        }

                        if (storage && storage.importJSON) {
                            storage.importJSON(parsed);
                        } else if (parsed.expenses) {
                            for (const exp of parsed.expenses) {
                                await repo.addExpense(currentUser.uid, exp);
                            }
                        }
                        showToast('Backup restored successfully!');
                    } catch (err) {
                        showToast('Error restoring backup file.');
                    }
                };
                reader.readAsText(file);
            });
        }

        // 6. Wire CSV Export
        const csvBtn = shell.querySelector('#exportStudentCSVBtn');
        if (csvBtn) {
            csvBtn.addEventListener('click', async () => {
                try {
                    if (storage && storage.exportCSV) {
                        storage.exportCSV();
                    } else {
                        const expenses = await repo.getExpenses(currentUser.uid);
                        if (!expenses || expenses.length === 0) {
                            showToast('No expenses to export.');
                            return;
                        }
                        const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Note'];
                        const rows = expenses.map(exp => [
                            `"${(exp.date || '').replace(/"/g, '""')}"`,
                            `"${(exp.title || '').replace(/"/g, '""')}"`,
                            `"${(exp.category || '').replace(/"/g, '""')}"`,
                            (exp.amount || 0).toFixed(2),
                            `"${(exp.note || '').replace(/"/g, '""')}"`
                        ]);
                        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `SmartSpend_expenses_${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showToast('CSV file downloaded!');
                    }
                } catch (e) {
                    showToast('Failed to export CSV.');
                }
            });
        }

        // 7. Wire Local Demo Switch & Reset
        const switchBtn = shell.querySelector('#switchDemoAccountBtn');
        if (switchBtn) {
            switchBtn.addEventListener('click', async () => {
                if (currentUser.role === 'parent') {
                    // Switch to student
                    await auth.signInWithEmail('student@smartspend.demo', 'StudentDemo123!');
                    showToast('Switched to Demo Student (Aarav).');
                    window.SS.router.navigate('/app');
                } else {
                    // Switch to parent
                    await auth.signInWithEmail('parent@smartspend.demo', 'ParentDemo123!');
                    showToast('Switched to Demo Parent (Mr. Sharma).');
                    window.SS.router.navigate('/parent');
                }
            });
        }

        const resetBtn = shell.querySelector('#resetDemoDataBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                const confirmed = window.confirm('Reset all demo data back to original seed transactions?');
                if (confirmed) {
                    if (window.SS.adapters && window.SS.adapters.local && window.SS.adapters.local.resetDemoData) {
                        await window.SS.adapters.local.resetDemoData();
                        showToast('Demo data reset to clean seed state.');
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    }
                }
            });
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.SS.views.settings = Object.freeze({
        render: renderSettingsView
    });
})();
