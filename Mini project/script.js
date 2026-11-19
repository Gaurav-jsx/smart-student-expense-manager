/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: script.js
   Application Controller & Full Feature Orchestration
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const {
        CATEGORIES,
        CATEGORY_COLORS,
        BADGES,
        STORAGE_KEY
    } = window.SS.constants;

    const {
        toPaise,
        fromPaise,
        sumPaise,
        formatCurrency,
        formatDate,
        formatMonthLabel,
        getLocalDateString,
        getMonthKey,
        getMonthKeyFromDate,
        getDaysInMonth,
        shiftMonthKey,
        isFutureDate,
        createId,
        debounce
    } = window.SS.utils;

    const {
        load: loadAppState,
        save: saveAppState,
        createBackup,
        exportJSON,
        importJSON,
        exportCSV,
        onStorageChange
    } = window.SS.storage;

    const {
        calculateSafeToSpend,
        calculateProjection,
        calculateHealthScore,
        calculateStreaks,
        calculateBadges,
        generateInsights
    } = window.SS.insights;

    const {
        parseQuickAdd
    } = window.SS.parser;

    const {
        renderCategoryDonut,
        renderMonthlyTrend,
        renderDailySparkline
    } = window.SS.charts;

    const {
        showToast,
        hideToast,
        populateCategorySelects,
        setFieldError,
        clearFormErrors,
        applyTheme,
        openModal,
        closeModal,
        renderSafeHero,
        renderHealthScore,
        renderInsightsList,
        renderStreaksAndBadges,
        renderRecurringList,
        renderGoalsList
    } = window.SS.ui;

    // DOM Elements Cache
    const currentDateElement = document.getElementById("currentDate");
    const demoBanner = document.getElementById("demoBanner");
    const exitDemoBtn = document.getElementById("exitDemoBtn");
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const openSettingsBtn = document.getElementById("openSettingsBtn");
    const installAppBtn = document.getElementById("installAppBtn");
    const printReportBtn = document.getElementById("printReportBtn");

    // Month Navigation
    const prevMonthBtn = document.getElementById("prevMonthBtn");
    const nextMonthBtn = document.getElementById("nextMonthBtn");
    const selectedMonthLabel = document.getElementById("selectedMonthLabel");

    // Quick Add
    const quickAddInput = document.getElementById("quickAddInput");
    const voiceAddBtn = document.getElementById("voiceAddBtn");
    const parseQuickAddBtn = document.getElementById("parseQuickAddBtn");
    const quickAddPreview = document.getElementById("quickAddPreview");
    const previewTitle = document.getElementById("previewTitle");
    const previewAmount = document.getElementById("previewAmount");
    const previewCategory = document.getElementById("previewCategory");
    const previewDate = document.getElementById("previewDate");
    const previewSplit = document.getElementById("previewSplit");
    const confirmQuickAddBtn = document.getElementById("confirmQuickAddBtn");
    const editQuickAddBtn = document.getElementById("editQuickAddBtn");
    const cancelQuickAddBtn = document.getElementById("cancelQuickAddBtn");

    // Budget
    const editBudgetBtn = document.getElementById("editBudgetBtn");
    const budgetForm = document.getElementById("budgetForm");
    const budgetInput = document.getElementById("budgetInput");
    const saveBudgetBtn = document.getElementById("saveBudgetBtn");
    const cancelBudgetBtn = document.getElementById("cancelBudgetBtn");
    const budgetSummary = document.getElementById("budgetSummary");
    const budgetProgress = document.getElementById("budgetProgress");
    const budgetProgressFill = document.getElementById("budgetProgressFill");
    const budgetMessage = document.getElementById("budgetMessage");
    const budgetMonthDesc = document.getElementById("budgetMonthDesc");
    const toggleCategoryBudgetsBtn = document.getElementById("toggleCategoryBudgetsBtn");
    const categoryBudgetsPanel = document.getElementById("categoryBudgetsPanel");
    const categoryBudgetsGrid = document.getElementById("categoryBudgetsGrid");
    const saveCategoryBudgetsBtn = document.getElementById("saveCategoryBudgetsBtn");

    // Summary Cards
    const totalExpensesElement = document.getElementById("totalExpenses");
    const monthlyExpensesElement = document.getElementById("monthlyExpenses");
    const thisMonthLabel = document.getElementById("thisMonthLabel");
    const todayExpensesElement = document.getElementById("todayExpenses");
    const remainingBudgetElement = document.getElementById("remainingBudget");

    // Add / Edit Expense Form
    const expenseFormSection = document.getElementById("expenseFormSection");
    const expenseForm = document.getElementById("expenseForm");
    const expenseFormHeading = document.getElementById("expenseFormHeading");
    const expenseFormSubheading = document.getElementById("expenseFormSubheading");
    const addExpenseBtn = document.getElementById("addExpenseBtn");
    const closeExpenseFormBtn = document.getElementById("closeExpenseFormBtn");
    const resetExpenseFormBtn = document.getElementById("resetExpenseFormBtn");
    const saveExpenseBtn = document.getElementById("saveExpenseBtn");
    const expenseTitle = document.getElementById("expenseTitle");
    const expenseAmount = document.getElementById("expenseAmount");
    const expenseCategory = document.getElementById("expenseCategory");
    const expenseDate = document.getElementById("expenseDate");
    const expenseSplit = document.getElementById("expenseSplit");
    const expenseNote = document.getElementById("expenseNote");

    // Charts
    const categoryChart = document.getElementById("categoryChart");
    const categoryLegend = document.getElementById("categoryLegend");
    const monthlyChart = document.getElementById("monthlyChart");
    const dailySparkline = document.getElementById("dailySparkline");

    // Student Hub Modals & Buttons
    const addRecurringBtn = document.getElementById("addRecurringBtn");
    const recurringModal = document.getElementById("recurringModal");
    const closeRecurringBtn = document.getElementById("closeRecurringBtn");
    const cancelRecurringBtn = document.getElementById("cancelRecurringBtn");
    const recurringForm = document.getElementById("recurringForm");
    const recTitle = document.getElementById("recTitle");
    const recAmount = document.getElementById("recAmount");
    const recCategory = document.getElementById("recCategory");
    const recDay = document.getElementById("recDay");

    const addGoalBtn = document.getElementById("addGoalBtn");
    const goalModal = document.getElementById("goalModal");
    const closeGoalBtn = document.getElementById("closeGoalBtn");
    const cancelGoalBtn = document.getElementById("cancelGoalBtn");
    const goalForm = document.getElementById("goalForm");
    const goalName = document.getElementById("goalName");
    const goalTarget = document.getElementById("goalTarget");
    const goalSaved = document.getElementById("goalSaved");
    const goalDeadline = document.getElementById("goalDeadline");

    // History Table & Filters
    const searchExpense = document.getElementById("searchExpense");
    const filterCategory = document.getElementById("filterCategory");
    const filterMonth = document.getElementById("filterMonth");
    const expenseTableBody = document.getElementById("expenseTableBody");
    const expenseCount = document.getElementById("expenseCount");
    const filteredTotalLabel = document.getElementById("filteredTotalLabel");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    const exportFilteredCsvBtn = document.getElementById("exportFilteredCsvBtn");

    // Settings Modal
    const settingsModal = document.getElementById("settingsModal");
    const closeSettingsBtn = document.getElementById("closeSettingsBtn");
    const exportJsonBtn = document.getElementById("exportJsonBtn");
    const importJsonInput = document.getElementById("importJsonInput");
    const exportAllCsvBtn = document.getElementById("exportAllCsvBtn");
    const loadDemoBtn = document.getElementById("loadDemoBtn");
    const clearAllDataBtn = document.getElementById("clearAllDataBtn");
    const backupStatusText = document.getElementById("backupStatusText");

    // Onboarding Modal
    const onboardingModal = document.getElementById("onboardingModal");
    const onboardingBudgetInput = document.getElementById("onboardingBudgetInput");
    const onboardingNextBtn = document.getElementById("onboardingNextBtn");
    const onboardingDemoBtn = document.getElementById("onboardingDemoBtn");

    // Application State
    let appState = null;
    let selectedMonth = getMonthKey();
    let editingExpenseId = null;
    let activeQuickParse = null;
    let speechRecognitionInstance = null;
    let deferredInstallPrompt = null;

    /**
     * Initializes state and data migrations
     */
    function initData() {
        const { state, warning } = loadAppState();
        appState = state;

        // Apply theme immediately
        const theme = (appState.settings && appState.settings.theme) || 'system';
        applyTheme(theme);

        if (warning) {
            showToast(warning, { duration: 5000 });
        }

        // Apply any due recurring subscriptions idempotently
        applyDueRecurringExpenses();
    }

    /**
     * Persists current state safely with error feedback
     */
    function persistState() {
        const result = saveAppState(appState);
        if (!result.ok) {
            showToast(result.error || "Could not save changes to browser storage.");
            return false;
        }
        return true;
    }

    /**
     * Returns budget for the selected month, carrying forward from previous month if not set
     */
    function getSelectedMonthBudget() {
        if (!appState || !appState.budgets) return 0;
        if (appState.budgets[selectedMonth] !== undefined) {
            return appState.budgets[selectedMonth];
        }
        // Carry forward from previous month if available
        const prevMonth = shiftMonthKey(selectedMonth, -1);
        if (appState.budgets[prevMonth] !== undefined) {
            return appState.budgets[prevMonth];
        }
        return 0;
    }

    /**
     * Filters expenses for the selected month with effective share applied
     */
    function getSelectedMonthExpenses() {
        return (appState.expenses || []).filter(e => {
            return getMonthKeyFromDate(e.date) === selectedMonth;
        }).map(e => {
            const split = (typeof e.splitWith === 'number' && e.splitWith > 0) ? e.splitWith : 0;
            const effectiveAmount = Math.round((toPaise(e.amount) / (split + 1))) / 100;
            return {
                ...e,
                effectiveAmount,
                isSplit: split > 0,
                splitWith: split
            };
        });
    }

    /**
     * Returns expenses for today
     */
    function getTodaysExpenses() {
        const today = getLocalDateString();
        return (appState.expenses || []).filter(e => e.date === today).map(e => {
            const split = (typeof e.splitWith === 'number' && e.splitWith > 0) ? e.splitWith : 0;
            const effectiveAmount = Math.round((toPaise(e.amount) / (split + 1))) / 100;
            return {
                ...e,
                effectiveAmount
            };
        });
    }

    /**
     * Automatically applies recurring expenses idempotently for the current month.
     */
    function applyDueRecurringExpenses() {
        if (!appState || !Array.isArray(appState.recurring) || appState.recurring.length === 0) return;

        const curMonth = getMonthKey();
        const today = getLocalDateString();
        const curDay = parseInt(today.split('-')[2], 10);
        let appliedAny = false;

        appState.recurring.forEach(rec => {
            if (rec.active && rec.lastAppliedMonth !== curMonth && curDay >= rec.dayOfMonth) {
                const dayStr = `${curMonth}-${String(rec.dayOfMonth).padStart(2, '0')}`;
                // Avoid creating if already generated for this month
                const alreadyExists = appState.expenses.some(e => e.recurringId === rec.id && getMonthKeyFromDate(e.date) === curMonth);

                if (!alreadyExists) {
                    appState.expenses.unshift({
                        id: createId(),
                        title: rec.title,
                        amount: rec.amount,
                        category: rec.category,
                        date: dayStr <= today ? dayStr : today,
                        note: "Recurring monthly spend",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        recurringId: rec.id,
                        splitWith: 0
                    });
                    appliedAny = true;
                }
                rec.lastAppliedMonth = curMonth;
            }
        });

        if (appliedAny) {
            persistState();
        }
    }

    /**
     * Updates header date and month navigation UI
     */
    function updateDateAndNav() {
        if (currentDateElement) {
            currentDateElement.textContent = new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            });
        }

        if (selectedMonthLabel) {
            selectedMonthLabel.textContent = formatMonthLabel(selectedMonth);
        }

        const curMonth = getMonthKey();
        if (nextMonthBtn) {
            nextMonthBtn.disabled = selectedMonth >= curMonth;
        }

        if (thisMonthLabel) {
            thisMonthLabel.textContent = selectedMonth === curMonth ? "This Month" : formatMonthLabel(selectedMonth);
        }

        if (budgetMonthDesc) {
            budgetMonthDesc.textContent = `Spending limit for ${formatMonthLabel(selectedMonth)}.`;
        }
    }

    /**
     * Renders summary cards with paise-accurate sums
     */
    function renderSummary() {
        if (!totalExpensesElement) return;

        const totalRupees = sumPaise(appState.expenses, 'amount');
        const monthExpenses = getSelectedMonthExpenses();
        const monthlyTotalRupees = sumPaise(monthExpenses, 'effectiveAmount');
        const todayExpenses = getTodaysExpenses();
        const todayTotalRupees = sumPaise(todayExpenses, 'effectiveAmount');

        const budget = getSelectedMonthBudget();
        const remainingPaise = toPaise(budget) - toPaise(monthlyTotalRupees);
        const remainingRupees = fromPaise(remainingPaise);

        totalExpensesElement.textContent = formatCurrency(totalRupees);
        monthlyExpensesElement.textContent = formatCurrency(monthlyTotalRupees);
        todayExpensesElement.textContent = formatCurrency(todayTotalRupees);

        if (budget > 0) {
            remainingBudgetElement.textContent = formatCurrency(remainingRupees);
            remainingBudgetElement.style.color = remainingRupees < 0 ? "var(--red)" : "";
        } else {
            remainingBudgetElement.textContent = "₹0";
            remainingBudgetElement.style.color = "";
        }
    }

    /**
     * Renders budget progress track, message, and category caps
     */
    function renderBudget() {
        if (!budgetSummary || !budgetProgressFill || !budgetMessage) return;

        const monthExpenses = getSelectedMonthExpenses();
        const monthlyTotal = sumPaise(monthExpenses, 'effectiveAmount');
        const budget = getSelectedMonthBudget();

        // Reset any inline gradient overrides
        budgetProgressFill.style.background = "";

        if (budget <= 0) {
            budgetSummary.textContent = `${formatCurrency(monthlyTotal)} (No budget set)`;
            budgetProgressFill.style.width = "0%";
            budgetProgress.setAttribute("aria-valuenow", "0");
            budgetMessage.textContent = "Set a budget for this month to track your allowance.";
            return;
        }

        const percentage = (monthlyTotal / budget) * 100;
        const displayedPercentage = Math.min(Math.max(percentage, 0), 100);

        budgetSummary.textContent = `${formatCurrency(monthlyTotal)} of ${formatCurrency(budget)}`;
        budgetProgressFill.style.width = `${displayedPercentage}%`;
        budgetProgress.setAttribute("aria-valuenow", String(Math.round(displayedPercentage)));

        if (percentage >= 100) {
            budgetProgressFill.style.background = "linear-gradient(90deg, #e05260, #f87171)";
            budgetMessage.textContent = `Budget exceeded by ${formatCurrency(monthlyTotal - budget)}.`;
        } else if (percentage >= 80) {
            budgetProgressFill.style.background = "linear-gradient(90deg, #f5a623, #f8c45c)";
            budgetMessage.textContent = `${percentage.toFixed(0)}% of budget used. Spend carefully!`;
        } else {
            budgetProgressFill.style.background = "linear-gradient(90deg, var(--primary), #9c78ff)";
            budgetMessage.textContent = `${percentage.toFixed(0)}% of budget used. You are on track!`;
        }
    }

    /**
     * Populates and renders Category Budgets panel inputs
     */
    function renderCategoryBudgetsPanel() {
        if (!categoryBudgetsGrid) return;
        categoryBudgetsGrid.replaceChildren();

        const currentCaps = appState.categoryBudgets || {};

        CATEGORIES.forEach(cat => {
            const item = document.createElement("div");
            item.className = "cat-budget-item";

            const label = document.createElement("label");
            label.htmlFor = `cap_${cat}`;
            label.textContent = `${cat} Cap (₹)`;

            const input = document.createElement("input");
            input.type = "number";
            input.id = `cap_${cat}`;
            input.min = "0";
            input.step = "100";
            input.placeholder = "No cap";
            input.value = currentCaps[cat] || "";

            item.appendChild(label);
            item.appendChild(input);
            categoryBudgetsGrid.appendChild(item);
        });
    }

    /**
     * Renders Safe-to-Spend Hero card and sparkline
     */
    function renderSafeHeroSection() {
        const budget = getSelectedMonthBudget();
        const safeData = calculateSafeToSpend({
            budget,
            expenses: appState.expenses,
            selectedMonth,
            today: getLocalDateString()
        });

        renderSafeHero(safeData);

        // Daily limit label
        const dailyLabel = document.getElementById("safeDailyLimitLabel");
        if (dailyLabel) {
            dailyLabel.textContent = budget > 0 ? `Target: ${formatCurrency(safeData.safeToday)}/day` : '';
        }

        // Render sparkline
        renderDailySparkline({
            container: dailySparkline,
            expenses: appState.expenses,
            selectedMonth,
            dailySafeBudget: safeData.safeToday
        });
    }

    /**
     * Renders Insights and Money Health Score
     */
    function renderInsightsAndHealth() {
        const budget = getSelectedMonthBudget();
        const prevMonth = shiftMonthKey(selectedMonth, -1);
        const lastMonthExpenses = (appState.expenses || []).filter(e => getMonthKeyFromDate(e.date) === prevMonth);

        const health = calculateHealthScore({
            budget,
            expenses: appState.expenses,
            selectedMonth,
            lastMonthExpenses,
            today: getLocalDateString()
        });
        renderHealthScore(health);

        const insights = generateInsights({
            budget,
            expenses: appState.expenses,
            categoryBudgets: appState.categoryBudgets,
            selectedMonth,
            today: getLocalDateString(),
            goals: appState.goals
        });
        renderInsightsList(insights);
    }

    /**
     * Renders Student Hub (Recurring, Goals, Streaks, Badges)
     */
    function renderStudentHub() {
        const streaks = calculateStreaks(appState.expenses, getLocalDateString());
        const unlockedBadges = calculateBadges({
            expenses: appState.expenses,
            streaks,
            budgets: appState.budgets || {},
            goals: appState.goals || []
        });

        renderStreaksAndBadges(streaks, unlockedBadges);

        renderRecurringList(appState.recurring || [], (id) => {
            appState.recurring = appState.recurring.filter(r => r.id !== id);
            persistState();
            renderStudentHub();
            showToast("Recurring spend removed.");
        });

        renderGoalsList(appState.goals || [], (id, amount) => {
            const goal = appState.goals.find(g => g.id === id);
            if (goal) {
                goal.saved = Math.min(goal.target, (goal.saved || 0) + amount);
                persistState();
                renderStudentHub();
                showToast(`Added ${formatCurrency(amount)} to "${goal.name}"!`);
            }
        }, (id) => {
            appState.goals = appState.goals.filter(g => g.id !== id);
            persistState();
            renderStudentHub();
            showToast("Savings goal removed.");
        });
    }

    /**
     * Renders month filter dropdown options with all recorded months
     */
    function populateMonthFilter() {
        if (!filterMonth) return;
        const currentVal = filterMonth.value;
        const recordedMonths = new Set();
        recordedMonths.add(selectedMonth);
        recordedMonths.add(getMonthKey());

        (appState.expenses || []).forEach(e => {
            recordedMonths.add(getMonthKeyFromDate(e.date));
        });

        const sortedMonths = Array.from(recordedMonths).sort().reverse();

        filterMonth.replaceChildren();

        const allOpt = document.createElement("option");
        allOpt.value = "";
        allOpt.textContent = "All Time";
        filterMonth.appendChild(allOpt);

        sortedMonths.forEach(mKey => {
            const opt = document.createElement("option");
            opt.value = mKey;
            opt.textContent = formatMonthLabel(mKey);
            filterMonth.appendChild(opt);
        });

        if (currentVal !== undefined && (currentVal === "" || sortedMonths.includes(currentVal))) {
            filterMonth.value = currentVal;
        } else {
            filterMonth.value = selectedMonth;
        }
    }

    /**
     * Renders the transaction history table
     */
    function renderExpenses() {
        if (!expenseTableBody) return;

        const searchTerm = (searchExpense ? searchExpense.value : "").trim().toLowerCase();
        const selectedCat = filterCategory ? filterCategory.value : "All";
        const selectedMth = filterMonth ? filterMonth.value : selectedMonth;

        const filtered = (appState.expenses || []).filter(e => {
            const matchesSearch = !searchTerm ||
                (e.title && e.title.toLowerCase().includes(searchTerm)) ||
                (e.category && e.category.toLowerCase().includes(searchTerm)) ||
                (e.note && e.note.toLowerCase().includes(searchTerm));

            const matchesCategory = selectedCat === "All" || e.category === selectedCat;
            const matchesMonth = !selectedMth || getMonthKeyFromDate(e.date) === selectedMth;

            return matchesSearch && matchesCategory && matchesMonth;
        }).sort((a, b) => b.date.localeCompare(a.date));

        expenseTableBody.replaceChildren();

        if (filtered.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 5;
            cell.className = "empty-table";
            cell.textContent = appState.expenses.length === 0
                ? "No expenses added yet."
                : "No expenses match your search or filters.";
            row.appendChild(cell);
            expenseTableBody.appendChild(row);
        } else {
            filtered.forEach(item => {
                const row = document.createElement("tr");

                // Title Cell
                const titleCell = document.createElement("td");
                titleCell.setAttribute("data-label", "Expense");

                const title = document.createElement("span");
                title.className = "expense-title";
                title.textContent = item.title;
                titleCell.appendChild(title);

                if (item.splitWith > 0) {
                    const splitTag = document.createElement("span");
                    splitTag.className = "split-tag";
                    splitTag.textContent = `÷${item.splitWith + 1}`;
                    titleCell.appendChild(splitTag);
                }

                if (item.recurringId) {
                    const recTag = document.createElement("span");
                    recTag.className = "recurring-tag";
                    recTag.textContent = "↻";
                    recTag.title = "Recurring monthly expense";
                    titleCell.appendChild(recTag);
                }

                if (item.note) {
                    const note = document.createElement("span");
                    note.className = "expense-note";
                    note.textContent = item.note;
                    titleCell.appendChild(note);
                }

                // Category Cell
                const categoryCell = document.createElement("td");
                categoryCell.setAttribute("data-label", "Category");
                const badge = document.createElement("span");
                badge.className = "category-badge";
                badge.textContent = item.category;
                categoryCell.appendChild(badge);

                // Date Cell
                const dateCell = document.createElement("td");
                dateCell.setAttribute("data-label", "Date");
                dateCell.textContent = formatDate(item.date);

                // Amount Cell
                const amountCell = document.createElement("td");
                amountCell.setAttribute("data-label", "Amount");
                amountCell.className = "expense-amount";

                if (item.splitWith > 0) {
                    const myShare = Math.round((toPaise(item.amount) / (item.splitWith + 1))) / 100;
                    amountCell.textContent = formatCurrency(myShare);
                    const fullAmt = document.createElement("small");
                    fullAmt.style.display = "block";
                    fullAmt.style.color = "var(--muted)";
                    fullAmt.textContent = `(Total: ${formatCurrency(item.amount)})`;
                    amountCell.appendChild(fullAmt);
                } else {
                    amountCell.textContent = formatCurrency(item.amount);
                }

                // Actions Cell (Edit + Delete)
                const actionCell = document.createElement("td");
                actionCell.setAttribute("data-label", "Action");
                const actionsWrapper = document.createElement("div");
                actionsWrapper.className = "table-actions";

                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.className = "edit-btn";
                editBtn.dataset.id = item.id;
                editBtn.textContent = "Edit";
                editBtn.setAttribute("aria-label", `Edit ${item.title}`);

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "delete-btn";
                deleteBtn.dataset.id = item.id;
                deleteBtn.textContent = "Delete";
                deleteBtn.setAttribute("aria-label", `Delete ${item.title}`);

                actionsWrapper.appendChild(editBtn);
                actionsWrapper.appendChild(deleteBtn);
                actionCell.appendChild(actionsWrapper);

                row.append(titleCell, categoryCell, dateCell, amountCell, actionCell);
                expenseTableBody.appendChild(row);
            });
        }

        // Stats Footer
        if (expenseCount) {
            expenseCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'expense' : 'expenses'}`;
        }

        if (filteredTotalLabel) {
            const sumFiltered = sumPaise(filtered.map(e => {
                const split = e.splitWith || 0;
                return Math.round((toPaise(e.amount) / (split + 1))) / 100;
            }));
            filteredTotalLabel.textContent = `Total: ${formatCurrency(sumFiltered)}`;
        }
    }

    /**
     * Renders charts for the selected month
     */
    function renderCharts() {
        const monthExpenses = getSelectedMonthExpenses();

        renderCategoryDonut({
            container: categoryChart,
            legendContainer: categoryLegend,
            expenses: monthExpenses,
            onSelectCategory: (cat) => {
                if (filterCategory) {
                    filterCategory.value = cat;
                    renderExpenses();
                }
            }
        });

        renderMonthlyTrend({
            container: monthlyChart,
            expenses: appState.expenses,
            budgets: appState.budgets || {},
            currentMonth: selectedMonth,
            onSelectMonth: (monthKey) => {
                selectedMonth = monthKey;
                renderDashboard();
            }
        });
    }

    /**
     * Comprehensive dashboard re-render
     */
    function renderDashboard() {
        updateDateAndNav();
        renderSummary();
        renderBudget();
        renderSafeHeroSection();
        renderInsightsAndHealth();
        renderStudentHub();
        populateMonthFilter();
        renderExpenses();
        renderCharts();

        // Demo banner visibility
        if (demoBanner) {
            demoBanner.hidden = !(appState.settings && appState.settings.demoMode);
        }
    }

    /**
     * Opens Expense Form in Add or Edit mode
     */
    function openExpenseForm(expenseToEdit = null) {
        clearFormErrors(expenseForm);
        expenseForm.reset();

        if (expenseToEdit) {
            editingExpenseId = expenseToEdit.id;
            expenseTitle.value = expenseToEdit.title;
            expenseAmount.value = expenseToEdit.amount;
            expenseCategory.value = expenseToEdit.category;
            expenseDate.value = expenseToEdit.date;
            expenseSplit.value = expenseToEdit.splitWith || "";
            expenseNote.value = expenseToEdit.note || "";

            if (expenseFormHeading) expenseFormHeading.textContent = "Edit Expense";
            if (expenseFormSubheading) expenseFormSubheading.textContent = `Modifying details for "${expenseToEdit.title}".`;
            if (saveExpenseBtn) saveExpenseBtn.textContent = "Update Expense";
        } else {
            editingExpenseId = null;
            expenseDate.value = getLocalDateString();
            expenseSplit.value = "";

            if (expenseFormHeading) expenseFormHeading.textContent = "Add New Expense";
            if (expenseFormSubheading) expenseFormSubheading.textContent = "Enter the details of your spending.";
            if (saveExpenseBtn) saveExpenseBtn.textContent = "Save Expense";
        }

        expenseFormSection.hidden = false;
        expenseFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
        expenseTitle.focus();
    }

    /**
     * Quick Add preview and parser handler
     */
    function handleQuickAddParse(inputText) {
        const text = (inputText || (quickAddInput ? quickAddInput.value : "")).trim();
        if (!text) {
            if (quickAddPreview) quickAddPreview.hidden = true;
            return;
        }

        const parseResult = parseQuickAdd(text, getLocalDateString());
        activeQuickParse = parseResult;

        if (parseResult.ok) {
            previewTitle.textContent = parseResult.title;
            previewAmount.textContent = formatCurrency(parseResult.amount);
            previewCategory.textContent = parseResult.category;
            previewDate.textContent = parseResult.date === getLocalDateString() ? "Today" : formatDate(parseResult.date);

            if (parseResult.splitWith > 0) {
                previewSplit.textContent = `Split ÷${parseResult.splitWith + 1}`;
                previewSplit.hidden = false;
            } else {
                previewSplit.hidden = true;
            }

            if (quickAddPreview) quickAddPreview.hidden = false;
        } else {
            if (quickAddPreview) quickAddPreview.hidden = true;
            if (parseResult.errors && parseResult.errors.length > 0) {
                showToast(parseResult.errors[0]);
            }
        }
    }

    /**
     * Voice Recognition Setup
     */
    function setupVoiceRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec || !voiceAddBtn) {
            if (voiceAddBtn) voiceAddBtn.hidden = true;
            return;
        }

        speechRecognitionInstance = new SpeechRec();
        speechRecognitionInstance.lang = 'en-IN';
        speechRecognitionInstance.continuous = false;
        speechRecognitionInstance.interimResults = false;

        let isListening = false;

        voiceAddBtn.addEventListener("click", () => {
            if (isListening) {
                speechRecognitionInstance.stop();
                return;
            }

            try {
                speechRecognitionInstance.start();
                isListening = true;
                voiceAddBtn.classList.add("listening");
                voiceAddBtn.title = "Listening... Speak now";
                showToast("🎙️ Listening... (e.g. 'chai 20', 'metro 40 yesterday')");
            } catch (err) {
                isListening = false;
                voiceAddBtn.classList.remove("listening");
                showToast("Could not start microphone.");
            }
        });

        speechRecognitionInstance.onresult = (event) => {
            isListening = false;
            voiceAddBtn.classList.remove("listening");
            voiceAddBtn.title = "Speak expense (Voice Recognition)";

            const transcript = event.results[0][0].transcript;
            if (quickAddInput) {
                quickAddInput.value = transcript;
            }
            handleQuickAddParse(transcript);
        };

        speechRecognitionInstance.onerror = (event) => {
            isListening = false;
            voiceAddBtn.classList.remove("listening");
            voiceAddBtn.title = "Speak expense (Voice Recognition)";
            if (event.error !== 'no-speech') {
                showToast(`Microphone notice: ${event.error}`);
            }
        };

        speechRecognitionInstance.onend = () => {
            isListening = false;
            voiceAddBtn.classList.remove("listening");
            voiceAddBtn.title = "Speak expense (Voice Recognition)";
        };
    }

    /**
     * Attaches all application event listeners
     */
    function setupEventListeners() {
        // Month Navigation
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener("click", () => {
                selectedMonth = shiftMonthKey(selectedMonth, -1);
                renderDashboard();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener("click", () => {
                const curMonth = getMonthKey();
                if (selectedMonth < curMonth) {
                    selectedMonth = shiftMonthKey(selectedMonth, 1);
                    renderDashboard();
                }
            });
        }

        // Quick Add Interactions
        if (quickAddInput) {
            quickAddInput.addEventListener("input", debounce(() => {
                handleQuickAddParse();
            }, 250));

            quickAddInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (activeQuickParse && activeQuickParse.ok) {
                        confirmQuickAddBtn.click();
                    } else {
                        handleQuickAddParse();
                    }
                }
            });
        }

        if (parseQuickAddBtn) {
            parseQuickAddBtn.addEventListener("click", () => handleQuickAddParse());
        }

        if (confirmQuickAddBtn) {
            confirmQuickAddBtn.addEventListener("click", () => {
                if (!activeQuickParse || !activeQuickParse.ok) return;

                const newExpense = {
                    id: createId(),
                    title: activeQuickParse.title,
                    amount: activeQuickParse.amount,
                    category: activeQuickParse.category,
                    date: activeQuickParse.date,
                    note: "",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    recurringId: null,
                    splitWith: activeQuickParse.splitWith || 0
                };

                appState.expenses.unshift(newExpense);
                if (!persistState()) {
                    appState.expenses.shift();
                    return;
                }

                if (quickAddInput) quickAddInput.value = "";
                if (quickAddPreview) quickAddPreview.hidden = true;
                activeQuickParse = null;

                renderDashboard();
                showToast(`Saved "${newExpense.title}" (₹${newExpense.amount})`);
            });
        }

        if (editQuickAddBtn) {
            editQuickAddBtn.addEventListener("click", () => {
                if (!activeQuickParse || !activeQuickParse.ok) return;
                openExpenseForm({
                    id: createId(),
                    title: activeQuickParse.title,
                    amount: activeQuickParse.amount,
                    category: activeQuickParse.category,
                    date: activeQuickParse.date,
                    splitWith: activeQuickParse.splitWith,
                    note: ""
                });
                if (quickAddPreview) quickAddPreview.hidden = true;
            });
        }

        if (cancelQuickAddBtn) {
            cancelQuickAddBtn.addEventListener("click", () => {
                if (quickAddPreview) quickAddPreview.hidden = true;
                if (quickAddInput) quickAddInput.value = "";
                activeQuickParse = null;
            });
        }

        // Voice Setup
        setupVoiceRecognition();

        // Main Expense Form Controls
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener("click", () => openExpenseForm(null));
        }

        if (closeExpenseFormBtn) {
            closeExpenseFormBtn.addEventListener("click", () => {
                expenseFormSection.hidden = true;
            });
        }

        if (resetExpenseFormBtn) {
            resetExpenseFormBtn.addEventListener("click", () => {
                clearFormErrors(expenseForm);
                expenseForm.reset();
                expenseDate.value = getLocalDateString();
                expenseSplit.value = "";
            });
        }

        // Form Submit (Add / Edit)
        if (expenseForm) {
            expenseForm.addEventListener("submit", (e) => {
                e.preventDefault();
                clearFormErrors(expenseForm);

                const title = expenseTitle.value.trim();
                const amount = Number(expenseAmount.value);
                const category = expenseCategory.value;
                const date = expenseDate.value;
                const split = expenseSplit.value ? parseInt(expenseSplit.value, 10) : 0;
                const note = expenseNote.value.trim();
                const today = getLocalDateString();

                let hasError = false;

                if (!title || title.length > 80) {
                    setFieldError(expenseTitle, "Expense name must be between 1 and 80 characters.");
                    if (!hasError) expenseTitle.focus();
                    hasError = true;
                }

                if (!Number.isFinite(amount) || amount < 0.01 || amount > 1000000) {
                    setFieldError(expenseAmount, "Amount must be between ₹0.01 and ₹10,00,000.");
                    if (!hasError) expenseAmount.focus();
                    hasError = true;
                }

                if (!CATEGORIES.includes(category)) {
                    setFieldError(expenseCategory, "Please select a valid category.");
                    if (!hasError) expenseCategory.focus();
                    hasError = true;
                }

                if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    setFieldError(expenseDate, "Please select a valid date.");
                    if (!hasError) expenseDate.focus();
                    hasError = true;
                } else if (date > today) {
                    setFieldError(expenseDate, "Future dates are not allowed.");
                    if (!hasError) expenseDate.focus();
                    hasError = true;
                }

                if (hasError) return;

                const roundedAmount = Math.round(amount * 100) / 100;
                const now = Date.now();

                const newExpense = {
                    id: editingExpenseId || createId(),
                    title,
                    amount: roundedAmount,
                    category,
                    date,
                    note,
                    createdAt: now,
                    updatedAt: now,
                    recurringId: null,
                    splitWith: split > 0 ? split : 0
                };

                if (editingExpenseId) {
                    const idx = appState.expenses.findIndex(item => item.id === editingExpenseId);
                    if (idx !== -1) {
                        newExpense.createdAt = appState.expenses[idx].createdAt || now;
                        newExpense.recurringId = appState.expenses[idx].recurringId || null;
                        appState.expenses[idx] = newExpense;
                    }
                    editingExpenseId = null;
                } else {
                    appState.expenses.unshift(newExpense);
                }

                if (!persistState()) return;

                expenseForm.reset();
                expenseDate.value = getLocalDateString();
                expenseFormSection.hidden = true;

                renderDashboard();
                showToast("Expense saved successfully!");
            });
        }

        // Table Delegated Click (Edit & Delete with 6-second Undo)
        if (expenseTableBody) {
            expenseTableBody.addEventListener("click", (e) => {
                const editBtn = e.target.closest(".edit-btn");
                const deleteBtn = e.target.closest(".delete-btn");

                if (editBtn) {
                    const id = editBtn.dataset.id;
                    const expense = appState.expenses.find(item => item.id === id);
                    if (expense) {
                        openExpenseForm(expense);
                    }
                    return;
                }

                if (deleteBtn) {
                    const id = deleteBtn.dataset.id;
                    const index = appState.expenses.findIndex(item => item.id === id);
                    if (index === -1) {
                        showToast("Expense not found.");
                        return;
                    }

                    const removed = appState.expenses[index];
                    appState.expenses.splice(index, 1);

                    if (!persistState()) {
                        appState.expenses.splice(index, 0, removed);
                        return;
                    }

                    renderDashboard();

                    showToast(`Deleted "${removed.title}"`, {
                        onUndo: () => {
                            appState.expenses.splice(index, 0, removed);
                            persistState();
                            renderDashboard();
                            showToast(`Restored "${removed.title}"`);
                        }
                    });
                }
            });
        }

        // Budget Card Form Controls
        if (editBudgetBtn && budgetForm && budgetInput) {
            editBudgetBtn.addEventListener("click", () => {
                const currentBudget = getSelectedMonthBudget();
                budgetInput.value = currentBudget > 0 ? currentBudget : "";
                budgetForm.hidden = false;
                budgetInput.focus();
            });
        }

        if (cancelBudgetBtn && budgetForm) {
            cancelBudgetBtn.addEventListener("click", () => {
                budgetForm.hidden = true;
            });
        }

        if (saveBudgetBtn && budgetForm && budgetInput) {
            saveBudgetBtn.addEventListener("click", () => {
                const newBudget = Number(budgetInput.value);
                if (!Number.isFinite(newBudget) || newBudget <= 0) {
                    showToast("Please enter a valid monthly budget greater than zero.");
                    budgetInput.focus();
                    return;
                }

                if (!appState.budgets) appState.budgets = {};
                appState.budgets[selectedMonth] = Math.round(newBudget);

                if (!persistState()) return;

                budgetForm.hidden = true;
                renderDashboard();
                showToast(`Monthly budget for ${formatMonthLabel(selectedMonth)} saved!`);
            });
        }

        // Category Budgets Collapsible Toggle & Save
        if (toggleCategoryBudgetsBtn && categoryBudgetsPanel) {
            toggleCategoryBudgetsBtn.addEventListener("click", () => {
                const isHidden = categoryBudgetsPanel.hidden;
                categoryBudgetsPanel.hidden = !isHidden;
                toggleCategoryBudgetsBtn.textContent = isHidden ? "Category Caps ▴" : "Category Caps ▾";
                if (isHidden) {
                    renderCategoryBudgetsPanel();
                }
            });
        }

        if (saveCategoryBudgetsBtn) {
            saveCategoryBudgetsBtn.addEventListener("click", () => {
                if (!appState.categoryBudgets) appState.categoryBudgets = {};
                CATEGORIES.forEach(cat => {
                    const input = document.getElementById(`cap_${cat}`);
                    if (input) {
                        const val = Number(input.value);
                        if (val > 0) {
                            appState.categoryBudgets[cat] = Math.round(val);
                        } else {
                            delete appState.categoryBudgets[cat];
                        }
                    }
                });

                persistState();
                renderDashboard();
                showToast("Category caps updated!");
            });
        }

        // Search & Filter listeners
        if (searchExpense) {
            searchExpense.addEventListener("input", debounce(() => renderExpenses(), 150));
        }
        if (filterCategory) {
            filterCategory.addEventListener("change", () => renderExpenses());
        }
        if (filterMonth) {
            filterMonth.addEventListener("change", () => renderExpenses());
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener("click", () => {
                if (searchExpense) searchExpense.value = "";
                if (filterCategory) filterCategory.value = "All";
                if (filterMonth) filterMonth.value = selectedMonth;
                renderExpenses();
            });
        }

        // CSV Export of current filtered items
        if (exportFilteredCsvBtn) {
            exportFilteredCsvBtn.addEventListener("click", () => {
                const searchTerm = (searchExpense ? searchExpense.value : "").trim().toLowerCase();
                const selectedCat = filterCategory ? filterCategory.value : "All";
                const selectedMth = filterMonth ? filterMonth.value : selectedMonth;

                const filtered = (appState.expenses || []).filter(e => {
                    const matchesSearch = !searchTerm ||
                        (e.title && e.title.toLowerCase().includes(searchTerm)) ||
                        (e.category && e.category.toLowerCase().includes(searchTerm)) ||
                        (e.note && e.note.toLowerCase().includes(searchTerm));

                    const matchesCategory = selectedCat === "All" || e.category === selectedCat;
                    const matchesMonth = !selectedMth || getMonthKeyFromDate(e.date) === selectedMth;

                    return matchesSearch && matchesCategory && matchesMonth;
                });

                const csv = exportCSV(filtered);
                downloadFile(csv, `smartspend-expenses-${selectedMth || 'all'}.csv`, 'text/csv');
                showToast("CSV exported successfully!");
            });
        }

        // Print Report
        if (printReportBtn) {
            printReportBtn.addEventListener("click", () => {
                window.print();
            });
        }

        // Recurring Expenses Modal & Form
        if (addRecurringBtn && recurringModal) {
            addRecurringBtn.addEventListener("click", () => {
                recurringForm.reset();
                openModal(recurringModal);
            });
        }

        if (closeRecurringBtn && recurringModal) {
            closeRecurringBtn.addEventListener("click", () => closeModal(recurringModal));
        }

        if (cancelRecurringBtn && recurringModal) {
            cancelRecurringBtn.addEventListener("click", () => closeModal(recurringModal));
        }

        if (recurringForm) {
            recurringForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const title = recTitle.value.trim();
                const amount = Number(recAmount.value);
                const category = recCategory.value;
                const day = parseInt(recDay.value, 10);

                if (!title || amount <= 0 || !CATEGORIES.includes(category) || day < 1 || day > 28) {
                    showToast("Please enter valid recurring details (day 1-28).");
                    return;
                }

                if (!Array.isArray(appState.recurring)) appState.recurring = [];

                appState.recurring.push({
                    id: createId(),
                    title,
                    amount: Math.round(amount),
                    category,
                    dayOfMonth: day,
                    active: true,
                    lastAppliedMonth: null
                });

                persistState();
                applyDueRecurringExpenses();
                closeModal(recurringModal);
                renderDashboard();
                showToast("Recurring spend created!");
            });
        }

        // Savings Goals Modal & Form
        if (addGoalBtn && goalModal) {
            addGoalBtn.addEventListener("click", () => {
                goalForm.reset();
                openModal(goalModal);
            });
        }

        if (closeGoalBtn && goalModal) {
            closeGoalBtn.addEventListener("click", () => closeModal(goalModal));
        }

        if (cancelGoalBtn && goalModal) {
            cancelGoalBtn.addEventListener("click", () => closeModal(goalModal));
        }

        if (goalForm) {
            goalForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const name = goalName.value.trim();
                const target = Number(goalTarget.value);
                const saved = Number(goalSaved.value) || 0;
                const deadline = goalDeadline.value || null;

                if (!name || target <= 0) {
                    showToast("Please enter valid goal details.");
                    return;
                }

                if (!Array.isArray(appState.goals)) appState.goals = [];

                appState.goals.push({
                    id: createId(),
                    name,
                    target: Math.round(target),
                    saved: Math.round(saved),
                    deadline
                });

                persistState();
                closeModal(goalModal);
                renderDashboard();
                showToast(`Savings goal "${name}" added!`);
            });
        }

        // Settings Modal Controls
        if (openSettingsBtn && settingsModal) {
            openSettingsBtn.addEventListener("click", () => {
                if (backupStatusText) {
                    if (appState.meta && appState.meta.lastBackupAt) {
                        backupStatusText.textContent = `Last backup: ${new Date(appState.meta.lastBackupAt).toLocaleDateString("en-IN")}`;
                    } else {
                        backupStatusText.textContent = "Last backup: Never";
                    }
                }
                openModal(settingsModal);
            });
        }

        if (closeSettingsBtn && settingsModal) {
            closeSettingsBtn.addEventListener("click", () => closeModal(settingsModal));
        }

        // Theme Toggle Buttons in Settings
        document.querySelectorAll(".theme-opt").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTheme = btn.dataset.setTheme;
                if (!appState.settings) appState.settings = {};
                appState.settings.theme = targetTheme;
                persistState();
                applyTheme(targetTheme);
            });
        });

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener("click", () => {
                const currentTheme = (appState.settings && appState.settings.theme) || 'system';
                let nextTheme = 'dark';
                if (currentTheme === 'dark') nextTheme = 'light';
                else if (currentTheme === 'light') nextTheme = 'system';
                else nextTheme = 'dark';

                if (!appState.settings) appState.settings = {};
                appState.settings.theme = nextTheme;
                persistState();
                applyTheme(nextTheme);
                showToast(`Theme switched to ${nextTheme}.`);
            });
        }

        // Export JSON Backup
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener("click", () => {
                const json = exportJSON(appState);
                downloadFile(json, `smartspend-backup-${getLocalDateString()}.json`, 'application/json');
                if (!appState.meta) appState.meta = {};
                appState.meta.lastBackupAt = Date.now();
                persistState();
                if (backupStatusText) {
                    backupStatusText.textContent = `Last backup: Today`;
                }
                showToast("Full backup downloaded successfully!");
            });
        }

        // Import JSON Backup
        if (importJsonInput) {
            importJsonInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target.result;
                    const res = importJSON(content, appState, 'merge');
                    if (res.ok) {
                        appState = res.state;
                        persistState();
                        closeModal(settingsModal);
                        renderDashboard();
                        showToast(`Imported ${res.counts.expenses} new expenses safely!`);
                    } else {
                        showToast(res.error || "Could not import backup file.");
                    }
                    importJsonInput.value = "";
                };
                reader.readAsText(file);
            });
        }

        // Export All CSV
        if (exportAllCsvBtn) {
            exportAllCsvBtn.addEventListener("click", () => {
                const csv = exportCSV(appState.expenses);
                downloadFile(csv, `smartspend-all-expenses-${getLocalDateString()}.csv`, 'text/csv');
                showToast("All transactions exported to CSV!");
            });
        }

        // Demo Data Loader
        if (loadDemoBtn) {
            loadDemoBtn.addEventListener("click", () => {
                const confirmLoad = window.confirm("Load sample 90-day student transactions? Your current data will be safely backed up first.");
                if (!confirmLoad) return;

                createBackup(appState);
                const demoState = window.SS.demo.generate(getLocalDateString());
                appState = demoState;
                persistState();
                closeModal(settingsModal);
                renderDashboard();
                showToast("🎮 Loaded 90-day student demo dataset!");
            });
        }

        // Exit Demo Mode
        if (exitDemoBtn) {
            exitDemoBtn.addEventListener("click", () => {
                appState.settings.demoMode = false;
                persistState();
                renderDashboard();
                showToast("Exited demo mode.");
            });
        }

        // Clear All Data
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener("click", () => {
                const answer = window.prompt('Type "DELETE" in capital letters to completely reset SmartSpend:');
                if (answer === "DELETE") {
                    createBackup(appState);
                    appState = window.SS.storage.createInitialState();
                    persistState();
                    closeModal(settingsModal);
                    renderDashboard();
                    showToast("All data cleared. Initialized fresh student workspace.");
                } else if (answer !== null) {
                    showToast("Clear cancelled (text did not match).");
                }
            });
        }

        // Onboarding Step Buttons
        if (onboardingNextBtn) {
            onboardingNextBtn.addEventListener("click", () => {
                const val = Number(onboardingBudgetInput.value);
                if (val > 0) {
                    if (!appState.budgets) appState.budgets = {};
                    appState.budgets[selectedMonth] = Math.round(val);
                }
                appState.settings.onboarded = true;
                persistState();
                closeModal(onboardingModal);
                renderDashboard();
                showToast("Welcome aboard! Start tracking your student allowance.");
            });
        }

        if (onboardingDemoBtn) {
            onboardingDemoBtn.addEventListener("click", () => {
                const demoState = window.SS.demo.generate(getLocalDateString());
                appState = demoState;
                appState.settings.onboarded = true;
                persistState();
                closeModal(onboardingModal);
                renderDashboard();
                showToast("🎮 Demo data loaded! Explore what SmartSpend can do.");
            });
        }

        // PWA Install Prompt
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            if (installAppBtn) installAppBtn.hidden = false;
        });

        if (installAppBtn) {
            installAppBtn.addEventListener("click", async () => {
                if (deferredInstallPrompt) {
                    deferredInstallPrompt.prompt();
                    const { outcome } = await deferredInstallPrompt.userChoice;
                    if (outcome === 'accepted') {
                        installAppBtn.hidden = true;
                    }
                    deferredInstallPrompt = null;
                }
            });
        }

        // Global Keyboard Shortcuts
        document.addEventListener("keydown", (e) => {
            const isTyping = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);

            // Ctrl/Cmd + K focuses Quick Add
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (quickAddInput) {
                    quickAddInput.focus();
                    quickAddInput.select();
                }
            } else if (!isTyping) {
                // Press 'N' to open Add Expense form
                if (e.key === 'n' || e.key === 'N') {
                    e.preventDefault();
                    openExpenseForm(null);
                }
            } else if (e.key === 'Escape') {
                // Close any open form
                if (!expenseFormSection.hidden) {
                    expenseFormSection.hidden = true;
                }
            }
        });

        // Cross-tab synchronization
        onStorageChange((newState) => {
            if (newState && newState.schemaVersion) {
                appState = newState;
                renderDashboard();
            }
        });

        // Tab visibility and midnight refresh
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                applyDueRecurringExpenses();
                updateDateAndNav();
                renderDashboard();
            }
        });

        // Midnight timer to refresh date and daily cards
        const now = new Date();
        const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1) - now;
        setTimeout(() => {
            applyDueRecurringExpenses();
            updateDateAndNav();
            renderDashboard();
            setInterval(() => {
                applyDueRecurringExpenses();
                updateDateAndNav();
                renderDashboard();
            }, 86400000);
        }, msUntilMidnight);
    }

    /**
     * File Download Helper (for CSV/JSON export)
     */
    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Registers Service Worker when hosted over http/https
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then(reg => {
                    // Check for updates
                    reg.onupdatefound = () => {
                        const installingWorker = reg.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showToast("SmartSpend updated! Reload for new features.", {
                                    onUndo: () => window.location.reload()
                                });
                            }
                        };
                    };
                }).catch(err => {
                    console.log("[PWA] ServiceWorker registration skipped/failed:", err);
                });
            });
        }
    }

    /**
     * Navbar state management based on user role and auth
     */
    function updateNavbar(user) {
        const demoBanner = document.getElementById('demoBanner');
        const brandLogo = document.getElementById('navBrandLogo');
        const roleBadge = document.getElementById('navRoleBadge');
        const userName = document.getElementById('navUserName');
        const userAvatar = document.getElementById('navUserAvatar');
        const userPill = document.getElementById('navUserPill');
        const signOutBtn = document.getElementById('navSignOutBtn');
        const navLinks = document.getElementById('mainNavLinks');
        const mobileNav = document.getElementById('mobileBottomNav');

        const dashLink = document.getElementById('navDashboardLink');
        const linkParentLink = document.getElementById('navLinkParentLink');
        const familyLink = document.getElementById('navFamilyLink');
        const settingsLink = document.getElementById('navSettingsLink');

        const mobDash = document.getElementById('mobDashboardLink');
        const mobLink = document.getElementById('mobLinkParentLink');
        const mobFamily = document.getElementById('mobFamilyLink');

        const isCloud = window.SS.adapters && window.SS.adapters.firebase && window.SS.adapters.firebase.isCloudActive();
        if (demoBanner) {
            demoBanner.hidden = !!isCloud;
        }

        if (!user) {
            if (userPill) userPill.hidden = true;
            if (signOutBtn) signOutBtn.hidden = true;
            if (navLinks) navLinks.hidden = true;
            if (mobileNav) mobileNav.hidden = true;
            if (roleBadge) roleBadge.hidden = true;
            return;
        }

        if (userPill) userPill.hidden = false;
        if (signOutBtn) signOutBtn.hidden = false;
        if (navLinks) navLinks.hidden = false;
        if (mobileNav) mobileNav.hidden = false;
        if (roleBadge) roleBadge.hidden = false;

        const isParent = user.role === 'parent';
        const isGuest = !!user.isGuest;

        if (userName) userName.textContent = user.name || (isParent ? 'Parent' : 'Student');
        if (userAvatar) userAvatar.textContent = (user.name || (isParent ? 'P' : 'S')).charAt(0).toUpperCase();

        if (roleBadge) {
            roleBadge.textContent = isParent ? 'Parent' : (isGuest ? 'Guest' : 'Student');
            roleBadge.className = 'brand-badge ' + (isParent ? 'badge-primary' : (isGuest ? 'badge-warning' : 'badge-success'));
        }

        if (brandLogo) {
            brandLogo.href = isParent ? '#/parent' : '#/app';
        }

        if (dashLink) dashLink.hidden = isParent;
        if (linkParentLink) linkParentLink.hidden = isParent || isGuest;
        if (familyLink) familyLink.hidden = !isParent;

        if (mobDash && mobDash.parentElement) mobDash.parentElement.hidden = isParent;
        if (mobLink && mobLink.parentElement) mobLink.parentElement.hidden = isParent || isGuest;
        if (mobFamily && mobFamily.parentElement) mobFamily.parentElement.hidden = !isParent;
    }

    function updateNavbarActive(routeKey) {
        document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(el => el.classList.remove('active'));
        if (routeKey === 'dashboard') {
            const d = document.getElementById('navDashboardLink');
            const md = document.getElementById('mobDashboardLink');
            if (d) d.classList.add('active');
            if (md) md.classList.add('active');
        } else if (routeKey === 'link') {
            const l = document.getElementById('navLinkParentLink');
            const ml = document.getElementById('mobLinkParentLink');
            if (l) l.classList.add('active');
            if (ml) ml.classList.add('active');
        } else if (routeKey === 'family') {
            const f = document.getElementById('navFamilyLink');
            const mf = document.getElementById('mobFamilyLink');
            if (f) f.classList.add('active');
            if (mf) mf.classList.add('active');
        } else if (routeKey === 'settings') {
            const s = document.getElementById('navSettingsLink');
            const ms = document.getElementById('mobSettingsLink');
            if (s) s.classList.add('active');
            if (ms) ms.classList.add('active');
        }
    }

    function setupNavbarControls() {
        const langBtn = document.getElementById('navLangToggleBtn');
        if (langBtn && window.SS.i18n) {
            const curLang = window.SS.i18n.getLanguage();
            langBtn.textContent = curLang === 'hi' ? '🇬🇧 English' : '🇮🇳 हिन्दी';
            langBtn.addEventListener('click', () => {
                const nextLang = window.SS.i18n.getLanguage() === 'hi' ? 'en' : 'hi';
                window.SS.i18n.setLanguage(nextLang);
                langBtn.textContent = nextLang === 'hi' ? '🇬🇧 English' : '🇮🇳 हिन्दी';
                const cur = window.SS.router ? window.SS.router.getCurrentRoute() : '/app';
                if (window.SS.router) window.SS.router.navigate(cur || '/app');
            });
        }

        const signOutBtn = document.getElementById('navSignOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async () => {
                if (window.SS.auth) {
                    await window.SS.auth.signOut();
                    window.SS.router.navigate('/login');
                }
            });
        }

        const exitDemoBtn = document.getElementById('exitDemoBtn');
        if (exitDemoBtn) {
            exitDemoBtn.addEventListener('click', async () => {
                if (window.SS.auth) {
                    await window.SS.auth.signOut();
                    window.SS.router.navigate('/login');
                }
            });
        }
    }

    function setupRoutingAndAuth() {
        const router = window.SS.router;
        const auth = window.SS.auth;

        if (!router) return;

        router.addRoute('/login', {
            role: 'unauth',
            title: 'Sign In',
            render: () => {
                updateNavbar(null);
                window.SS.views.auth.render('login');
            }
        });

        router.addRoute('/signup', {
            role: 'unauth',
            title: 'Create Account',
            render: () => {
                updateNavbar(null);
                window.SS.views.auth.render('signup');
            }
        });

        router.addRoute('/forgot', {
            role: 'unauth',
            title: 'Reset Password',
            render: () => {
                updateNavbar(null);
                window.SS.views.auth.render('forgot');
            }
        });

        router.addRoute('/app', {
            role: 'student',
            title: 'Student Dashboard',
            render: () => {
                const user = auth ? auth.currentUser() : null;
                updateNavbar(user);
                updateNavbarActive('dashboard');
                if (window.SS.views && window.SS.views.student) {
                    window.SS.views.student.render();
                }
                renderDashboard();
            }
        });

        router.addRoute('/link', {
            role: 'student',
            title: 'Parent Linking',
            render: () => {
                const user = auth ? auth.currentUser() : null;
                updateNavbar(user);
                updateNavbarActive('link');
                if (window.SS.views && window.SS.views.student) {
                    window.SS.views.student.renderLinkPage();
                }
            }
        });

        router.addRoute('/parent', {
            role: 'parent',
            title: 'Parent Dashboard',
            render: () => {
                const user = auth ? auth.currentUser() : null;
                updateNavbar(user);
                updateNavbarActive('family');
                if (window.SS.views && window.SS.views.parent) {
                    window.SS.views.parent.render();
                }
            }
        });

        router.addRoute('/parent/child/:uid', {
            role: 'parent',
            title: 'Child Detail',
            render: (params) => {
                const user = auth ? auth.currentUser() : null;
                updateNavbar(user);
                updateNavbarActive('family');
                if (window.SS.views && window.SS.views.childDetail) {
                    window.SS.views.childDetail.render(params.uid);
                }
            }
        });

        router.addRoute('/settings', {
            role: 'auth',
            title: 'Settings',
            render: () => {
                const user = auth ? auth.currentUser() : null;
                updateNavbar(user);
                updateNavbarActive('settings');
                if (window.SS.views && window.SS.views.settings) {
                    window.SS.views.settings.render();
                }
            }
        });

        if (auth && typeof auth.onAuthChange === 'function') {
            auth.onAuthChange((user) => {
                updateNavbar(user);
            });
        }

        router.init();
    }

    /**
     * Application Bootstrapper
     */
    function bootstrap() {
        initData();
        populateCategorySelects();
        updateDateAndNav();

        if (expenseDate) {
            expenseDate.value = getLocalDateString();
        }

        setupEventListeners();
        setupNavbarControls();
        setupRoutingAndAuth();
        registerServiceWorker();

        // Check if first-time user needs onboarding
        if (!appState.settings || !appState.settings.onboarded) {
            if (onboardingModal) {
                openModal(onboardingModal);
            }
        }
    }

    // Expose controller for debug or automated testing
    window.SS.controller = {
        getState: () => appState,
        getSelectedMonth: () => selectedMonth,
        setSelectedMonth: (m) => {
            selectedMonth = m;
            renderDashboard();
        },
        refresh: renderDashboard,
        openExpenseForm
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }
})();
