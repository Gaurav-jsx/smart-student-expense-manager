/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/ui.js
   Namespace: window.SS.ui
   Rendering, Modals, Toasts, A11y Helpers
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const {
        CATEGORIES,
        CATEGORY_ICONS,
        BADGES
    } = window.SS.constants;

    const {
        formatCurrency,
        formatDate,
        escapeHTML,
        clamp
    } = window.SS.utils;

    let toastTimer = null;
    let activeFocusTrapCleanup = null;

    /**
     * Shows a toast notification. Optionally provides an Undo action button.
     * @param {string} message
     * @param {Object} [options]
     * @param {Function} [options.onUndo] Callback invoked when user clicks Undo
     * @param {number} [options.duration=3200] Duration in ms
     */
    function showToast(message, options = {}) {
        const toastEl = document.getElementById("notification");
        if (!toastEl) return;

        clearTimeout(toastTimer);
        toastEl.replaceChildren();

        const msgSpan = document.createElement("span");
        msgSpan.className = "toast-message";
        msgSpan.textContent = message;
        toastEl.appendChild(msgSpan);

        if (typeof options.onUndo === 'function') {
            const undoBtn = document.createElement("button");
            undoBtn.type = "button";
            undoBtn.className = "toast-undo-btn";
            undoBtn.textContent = "Undo";
            undoBtn.addEventListener("click", () => {
                options.onUndo();
                hideToast();
            });
            toastEl.appendChild(undoBtn);
        }

        toastEl.hidden = false;
        const duration = options.onUndo ? 6000 : (options.duration || 3200);

        toastTimer = setTimeout(() => {
            hideToast();
        }, duration);
    }

    /**
     * Hides active toast.
     */
    function hideToast() {
        const toastEl = document.getElementById("notification");
        if (toastEl) {
            toastEl.hidden = true;
            toastEl.replaceChildren();
        }
    }

    /**
     * Populates all category select dropdowns from constants (Single Source of Truth).
     */
    function populateCategorySelects() {
        const selects = [
            { el: document.getElementById("expenseCategory"), hasEmpty: true, emptyLabel: "Select category" },
            { el: document.getElementById("filterCategory"), hasEmpty: true, emptyLabel: "All Categories", emptyVal: "All" },
            { el: document.getElementById("recCategory"), hasEmpty: true, emptyLabel: "Select category" }
        ];

        selects.forEach(({ el, hasEmpty, emptyLabel, emptyVal = "" }) => {
            if (!el) return;
            const currentVal = el.value;
            el.replaceChildren();

            if (hasEmpty) {
                const opt = document.createElement("option");
                opt.value = emptyVal;
                opt.textContent = emptyLabel;
                el.appendChild(opt);
            }

            CATEGORIES.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = `${CATEGORY_ICONS[cat] || ''} ${cat}`.trim();
                el.appendChild(opt);
            });

            if (currentVal && (CATEGORIES.includes(currentVal) || currentVal === emptyVal)) {
                el.value = currentVal;
            }
        });
    }

    /**
     * Sets or clears an inline validation error on a form field.
     * @param {HTMLElement} field
     * @param {string|null} errorMessage
     */
    function setFieldError(field, errorMessage) {
        if (!field) return;
        const formGroup = field.closest(".form-group") || field.parentElement;
        let errorEl = formGroup ? formGroup.querySelector(".field-error") : null;

        if (errorMessage) {
            field.setAttribute("aria-invalid", "true");
            if (!errorEl && formGroup) {
                errorEl = document.createElement("div");
                errorEl.className = "field-error";
                errorEl.id = `${field.id || 'field'}-error`;
                formGroup.appendChild(errorEl);
            }
            if (errorEl) {
                errorEl.textContent = errorMessage;
                field.setAttribute("aria-describedby", errorEl.id);
            }
        } else {
            field.removeAttribute("aria-invalid");
            field.removeAttribute("aria-describedby");
            if (errorEl) {
                errorEl.remove();
            }
        }
    }

    /**
     * Clears all field validation errors inside a container/form.
     * @param {HTMLElement} form
     */
    function clearFormErrors(form) {
        if (!form) return;
        form.querySelectorAll("[aria-invalid]").forEach(f => {
            f.removeAttribute("aria-invalid");
            f.removeAttribute("aria-describedby");
        });
        form.querySelectorAll(".field-error").forEach(e => e.remove());
    }

    /**
     * Applies theme ('light', 'dark', 'system') to documentElement and updates meta theme-color.
     * @param {'light'|'dark'|'system'} theme
     */
    function applyTheme(theme = 'system') {
        const root = document.documentElement;
        let effectiveTheme = theme;

        if (theme === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = prefersDark ? 'dark' : 'light';
        }

        root.setAttribute("data-theme", effectiveTheme);

        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            themeMeta.setAttribute("content", effectiveTheme === 'dark' ? '#0f111a' : '#6c63ff');
        }

        const themeBtn = document.getElementById("themeToggleBtn");
        if (themeBtn) {
            themeBtn.textContent = effectiveTheme === 'dark' ? '☀️' : '🌙';
            themeBtn.setAttribute("aria-label", `Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`);
        }

        // Highlight active theme option in settings dialog
        document.querySelectorAll(".theme-opt").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.setTheme === theme);
        });
    }

    /**
     * Traps keyboard focus within an active modal dialog.
     * @param {HTMLElement} modalElement
     * @returns {Function} cleanup function
     */
    function trapFocus(modalElement) {
        if (!modalElement) return () => {};
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(modalElement.querySelectorAll(focusableSelectors))
            .filter(el => !el.hasAttribute('disabled') && !el.hidden && el.offsetParent !== null);

        if (focusableElements.length === 0) return () => {};

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            } else if (e.key === 'Escape') {
                closeModal(modalElement);
            }
        };

        modalElement.addEventListener('keydown', handleKeyDown);
        first.focus();

        return () => {
            modalElement.removeEventListener('keydown', handleKeyDown);
        };
    }

    /**
     * Opens a modal dialog with focus trap and ARIA state.
     * @param {HTMLElement} modalEl
     */
    function openModal(modalEl) {
        if (!modalEl) return;
        modalEl.hidden = false;
        activeFocusTrapCleanup = trapFocus(modalEl);
    }

    /**
     * Closes an active modal dialog.
     * @param {HTMLElement} modalEl
     */
    function closeModal(modalEl) {
        if (!modalEl) return;
        modalEl.hidden = true;
        if (typeof activeFocusTrapCleanup === 'function') {
            activeFocusTrapCleanup();
            activeFocusTrapCleanup = null;
        }
    }

    /**
     * Renders the Safe-to-Spend hero card.
     */
    function renderSafeHero(safeData) {
        const amountEl = document.getElementById("safeHeroAmount");
        const msgEl = document.getElementById("safeHeroMessage");
        const badgeEl = document.getElementById("safeHeroBadge");

        if (!amountEl || !msgEl || !badgeEl) return;

        if (!safeData.hasBudget) {
            amountEl.textContent = "₹0";
            msgEl.textContent = "Set a monthly budget to calculate your daily allowance.";
            badgeEl.textContent = "No Budget Set";
            badgeEl.style.background = "";
            badgeEl.style.color = "";
            return;
        }

        amountEl.textContent = formatCurrency(safeData.safeToday);
        msgEl.textContent = safeData.message;

        if (safeData.status === 'danger') {
            badgeEl.textContent = "Over Daily Limit";
            badgeEl.style.background = "var(--red-light)";
            badgeEl.style.color = "var(--red)";
            amountEl.style.color = "var(--red)";
        } else if (safeData.status === 'warning') {
            badgeEl.textContent = "Limit Reached";
            badgeEl.style.background = "var(--orange-light)";
            badgeEl.style.color = "var(--orange)";
            amountEl.style.color = "var(--orange)";
        } else {
            badgeEl.textContent = "Safe-to-Spend Today";
            badgeEl.style.background = "var(--green-light)";
            badgeEl.style.color = "var(--green)";
            amountEl.style.color = "var(--text)";
        }
    }

    /**
     * Renders Money Health Score section.
     */
    function renderHealthScore(health) {
        const badge = document.getElementById("healthScoreBadge");
        const rating = document.getElementById("healthRating");
        const tip = document.getElementById("healthTip");
        const bgtFill = document.getElementById("metricBudgetFill");
        const consFill = document.getElementById("metricConsistencyFill");
        const balFill = document.getElementById("metricBalanceFill");

        if (badge) badge.textContent = health.score;
        if (rating) rating.textContent = health.rating;
        if (tip) tip.textContent = health.improvementTip;

        if (bgtFill && health.breakdown) {
            const bgtPct = Math.round((health.breakdown.budgetScore / 40) * 100);
            bgtFill.style.width = `${clamp(bgtPct, 0, 100)}%`;
        }
        if (consFill && health.breakdown) {
            const consPct = Math.round((health.breakdown.consistencyScore / 20) * 100);
            consFill.style.width = `${clamp(consPct, 0, 100)}%`;
        }
        if (balFill && health.breakdown) {
            const balPct = Math.round((health.breakdown.balanceScore / 20) * 100);
            balFill.style.width = `${clamp(balPct, 0, 100)}%`;
        }
    }

    /**
     * Renders insights items in the smart insights card.
     */
    function renderInsightsList(insights) {
        const container = document.getElementById("insightsList");
        if (!container) return;

        container.replaceChildren();

        if (!Array.isArray(insights) || insights.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "Log more expenses to generate insights.";
            container.appendChild(empty);
            return;
        }

        insights.forEach(item => {
            const el = document.createElement("div");
            el.className = `insight-item ${item.type || 'info'}`;

            const iconSpan = document.createElement("span");
            iconSpan.className = "insight-icon";
            iconSpan.textContent = item.icon || '💡';

            const content = document.createElement("div");
            content.className = "insight-content";

            const title = document.createElement("strong");
            title.textContent = item.title;

            const text = document.createElement("p");
            text.textContent = item.text;

            content.appendChild(title);
            content.appendChild(text);

            el.appendChild(iconSpan);
            el.appendChild(content);

            container.appendChild(el);
        });
    }

    /**
     * Renders Streaks and Badges.
     */
    function renderStreaksAndBadges(streaks, unlockedBadgeIds = []) {
        const streakEl = document.getElementById("currentStreakCount");
        const noSpendEl = document.getElementById("noSpendDaysCount");
        const grid = document.getElementById("badgesGrid");

        if (streakEl) streakEl.textContent = `${streaks.currentStreak || 0} ${streaks.currentStreak === 1 ? 'Day' : 'Days'}`;
        if (noSpendEl) noSpendEl.textContent = `${streaks.noSpendDaysThisMonth || 0} ${streaks.noSpendDaysThisMonth === 1 ? 'Day' : 'Days'}`;

        if (grid) {
            grid.replaceChildren();
            BADGES.forEach(badge => {
                const isUnlocked = unlockedBadgeIds.includes(badge.id);
                const tile = document.createElement("div");
                tile.className = `badge-tile ${isUnlocked ? 'unlocked' : ''}`;
                tile.title = `${badge.name}: ${badge.desc}`;

                const icon = document.createElement("span");
                icon.className = "badge-icon";
                icon.textContent = badge.icon;

                const label = document.createElement("span");
                label.textContent = badge.name;

                tile.appendChild(icon);
                tile.appendChild(label);
                grid.appendChild(tile);
            });
        }
    }

    /**
     * Renders Recurring Expenses List.
     */
    function renderRecurringList(recurring = [], onDelete) {
        const container = document.getElementById("recurringList");
        if (!container) return;

        container.replaceChildren();

        if (recurring.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state-sm";
            empty.textContent = "No recurring spends set. Add your mess fee or mobile recharge!";
            container.appendChild(empty);
            return;
        }

        recurring.forEach(item => {
            const row = document.createElement("div");
            row.className = "recurring-row";

            const left = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = item.title;

            const meta = document.createElement("small");
            meta.style.display = "block";
            meta.style.color = "var(--muted)";
            meta.textContent = `${item.category} · Due day ${item.dayOfMonth} each month`;

            left.appendChild(title);
            left.appendChild(meta);

            const right = document.createElement("div");
            right.style.display = "flex";
            right.style.alignItems = "center";
            right.style.gap = "8px";

            const amount = document.createElement("span");
            amount.style.fontWeight = "700";
            amount.textContent = formatCurrency(item.amount);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "btn-ghost";
            delBtn.style.padding = "2px 6px";
            delBtn.textContent = "✕";
            delBtn.title = "Delete recurring rule";
            delBtn.addEventListener("click", () => {
                if (typeof onDelete === 'function') onDelete(item.id);
            });

            right.appendChild(amount);
            right.appendChild(delBtn);

            row.appendChild(left);
            row.appendChild(right);
            container.appendChild(row);
        });
    }

    /**
     * Renders Savings Goals List.
     */
    function renderGoalsList(goals = [], onAddContribution, onDelete) {
        const container = document.getElementById("goalsList");
        if (!container) return;

        container.replaceChildren();

        if (goals.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state-sm";
            empty.textContent = "No savings goals. Track a trip or new laptop to stay motivated!";
            container.appendChild(empty);
            return;
        }

        goals.forEach(goal => {
            const row = document.createElement("div");
            row.className = "goal-row";
            row.style.flexDirection = "column";
            row.style.alignItems = "stretch";

            const top = document.createElement("div");
            top.style.display = "flex";
            top.style.justifyContent = "space-between";
            top.style.alignItems = "center";

            const name = document.createElement("strong");
            name.textContent = goal.name;

            const amounts = document.createElement("span");
            amounts.style.fontWeight = "700";
            amounts.textContent = `${formatCurrency(goal.saved)} / ${formatCurrency(goal.target)}`;

            top.appendChild(name);
            top.appendChild(amounts);

            // Progress bar
            const pct = Math.min(100, Math.round((goal.saved / (goal.target || 1)) * 100));
            const progress = document.createElement("div");
            progress.className = "goal-progress";

            const fill = document.createElement("div");
            fill.className = "goal-fill";
            fill.style.width = `${pct}%`;
            progress.appendChild(fill);

            // Actions and remaining
            const bottom = document.createElement("div");
            bottom.style.display = "flex";
            bottom.style.justifyContent = "space-between";
            bottom.style.alignItems = "center";
            bottom.style.marginTop = "6px";
            bottom.style.fontSize = "11px";
            bottom.style.color = "var(--muted)";

            const remSpan = document.createElement("span");
            remSpan.textContent = `${pct}% reached (₹${Math.max(0, goal.target - goal.saved).toLocaleString('en-IN')} left)`;

            const btnGroup = document.createElement("div");
            btnGroup.style.display = "flex";
            btnGroup.style.gap = "6px";

            const addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.className = "btn btn-sm btn-secondary";
            addBtn.style.padding = "2px 8px";
            addBtn.textContent = "+ Save ₹500";
            addBtn.addEventListener("click", () => {
                if (typeof onAddContribution === 'function') onAddContribution(goal.id, 500);
            });

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "btn-ghost";
            delBtn.textContent = "✕";
            delBtn.title = "Delete goal";
            delBtn.addEventListener("click", () => {
                if (typeof onDelete === 'function') onDelete(goal.id);
            });

            btnGroup.appendChild(addBtn);
            btnGroup.appendChild(delBtn);

            bottom.appendChild(remSpan);
            bottom.appendChild(btnGroup);

            row.appendChild(top);
            row.appendChild(progress);
            row.appendChild(bottom);
            container.appendChild(row);
        });
    }

    window.SS.ui = Object.freeze({
        showToast,
        hideToast,
        populateCategorySelects,
        setFieldError,
        clearFormErrors,
        applyTheme,
        trapFocus,
        openModal,
        closeModal,
        renderSafeHero,
        renderHealthScore,
        renderInsightsList,
        renderStreaksAndBadges,
        renderRecurringList,
        renderGoalsList
    });
})();
