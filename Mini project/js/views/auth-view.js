/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/views/auth-view.js
   Namespace: window.SS.views.auth
   Premium Split-Screen Authentication UI:
   Login, Signup (with Role Selector & Consent),
   Forgot Password, Password Strength Meter,
   and One-Click Demo Accounts.
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};
    window.SS.views = window.SS.views || {};

    const { t } = window.SS.i18n;
    const { evaluatePasswordStrength } = window.SS.auth;

    let selectedRole = 'student'; // 'student' | 'parent'

    function renderAuthLayout(formType = 'login') {
        const container = document.getElementById('authViewContainer');
        if (!container) return;

        container.replaceChildren();

        const shell = document.createElement('div');
        shell.className = 'auth-split-shell';

        // ---------------------------------------------------------------------
        // Left Branding & Value Proposition Hero Panel
        // ---------------------------------------------------------------------
        const heroPanel = document.createElement('div');
        heroPanel.className = 'auth-hero-panel';

        const heroContent = document.createElement('div');
        heroContent.className = 'auth-hero-content';

        const logoGroup = document.createElement('div');
        logoGroup.className = 'auth-logo-group';

        const logoIcon = document.createElement('div');
        logoIcon.className = 'logo-icon';
        logoIcon.textContent = '₹';

        const logoTitles = document.createElement('div');
        const brandH1 = document.createElement('h1');
        brandH1.textContent = t('appName');
        const brandTag = document.createElement('p');
        brandTag.textContent = t('appTagline');

        logoTitles.appendChild(brandH1);
        logoTitles.appendChild(brandTag);
        logoGroup.appendChild(logoIcon);
        logoGroup.appendChild(logoTitles);

        const heroHeadline = document.createElement('h2');
        heroHeadline.textContent = formType === 'signup'
            ? 'Transparent Money Habits for College Life.'
            : 'Know What You Can Safely Spend Today.';

        const heroP = document.createElement('p');
        heroP.textContent = 'From daily safe allowances and roommate splits to consent-based parental guidance, SmartSpend keeps student finances balanced and anxiety-free.';

        const heroBadges = document.createElement('div');
        heroBadges.className = 'auth-hero-badges';
        heroBadges.innerHTML = `
            <div class="auth-hero-feature"><span>🛡️</span> <strong>100% Private</strong> — Data stays on your device</div>
            <div class="auth-hero-feature"><span>⚡</span> <strong>Safe-to-Spend</strong> — Live daily allowance calculations</div>
            <div class="auth-hero-feature"><span>🤝</span> <strong>Consent First</strong> — Students control what parents see</div>
        `;

        heroContent.appendChild(logoGroup);
        heroContent.appendChild(heroHeadline);
        heroContent.appendChild(heroP);
        heroContent.appendChild(heroBadges);
        heroPanel.appendChild(heroContent);

        // ---------------------------------------------------------------------
        // Right Form Panel
        // ---------------------------------------------------------------------
        const formPanel = document.createElement('div');
        formPanel.className = 'auth-form-panel';

        const formCard = document.createElement('div');
        formCard.className = 'auth-card card';

        if (formType === 'signup') {
            buildSignupForm(formCard);
        } else if (formType === 'forgot') {
            buildForgotForm(formCard);
        } else {
            buildLoginForm(formCard);
        }

        formPanel.appendChild(formCard);
        shell.appendChild(heroPanel);
        shell.appendChild(formPanel);
        container.appendChild(shell);

        // Hide other main views
        document.querySelectorAll('.app-view').forEach(v => {
            v.hidden = (v.id !== 'authViewContainer');
        });
        container.classList.add('active-view');
    }

    // -------------------------------------------------------------------------
    // Login Form
    // -------------------------------------------------------------------------
    function buildLoginForm(card) {
        card.replaceChildren();

        const title = document.createElement('h2');
        title.textContent = t('welcomeBack');

        const subtitle = document.createElement('p');
        subtitle.className = 'auth-subtitle';
        subtitle.textContent = t('loginSubtitle');

        // Quick One-Click Demo Account Buttons
        const demoGroup = document.createElement('div');
        demoGroup.className = 'demo-quick-login-group';

        const demoLabel = document.createElement('span');
        demoLabel.className = 'demo-group-label';
        demoLabel.textContent = '⚡ 1-Click Demo Accounts for Judges:';

        const demoBtnRow = document.createElement('div');
        demoBtnRow.className = 'demo-btn-row';

        const demoStudentBtn = document.createElement('button');
        demoStudentBtn.type = 'button';
        demoStudentBtn.className = 'btn btn-secondary btn-sm demo-acc-btn';
        demoStudentBtn.innerHTML = `🎓 <strong>${t('demoStudentBtn')}</strong>`;
        demoStudentBtn.addEventListener('click', () => {
            emailInput.value = 'aarav@college.edu';
            pwdInput.value = 'DemoStudent123';
            submitBtn.click();
        });

        const demoParentBtn = document.createElement('button');
        demoParentBtn.type = 'button';
        demoParentBtn.className = 'btn btn-secondary btn-sm demo-acc-btn';
        demoParentBtn.innerHTML = `👪 <strong>${t('demoParentBtn')}</strong>`;
        demoParentBtn.addEventListener('click', () => {
            emailInput.value = 'sharma@parent.com';
            pwdInput.value = 'DemoParent123';
            submitBtn.click();
        });

        demoBtnRow.appendChild(demoStudentBtn);
        demoBtnRow.appendChild(demoParentBtn);
        demoGroup.appendChild(demoLabel);
        demoGroup.appendChild(demoBtnRow);

        // Form
        const form = document.createElement('form');
        form.id = 'loginForm';
        form.noValidate = true;

        // Email Field
        const emailGroup = document.createElement('div');
        emailGroup.className = 'form-group';
        const emailLabel = document.createElement('label');
        emailLabel.htmlFor = 'loginEmail';
        emailLabel.textContent = t('emailLabel');
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'loginEmail';
        emailInput.placeholder = t('emailPlaceholder');
        emailInput.required = true;
        emailInput.autocomplete = 'username';
        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(emailInput);

        // Password Field with Show/Hide toggle
        const pwdGroup = document.createElement('div');
        pwdGroup.className = 'form-group';
        const pwdLabelRow = document.createElement('div');
        pwdLabelRow.className = 'label-with-link';
        const pwdLabel = document.createElement('label');
        pwdLabel.htmlFor = 'loginPassword';
        pwdLabel.textContent = t('passwordLabel');
        const forgotLink = document.createElement('a');
        forgotLink.href = '#/forgot';
        forgotLink.className = 'auth-link-sm';
        forgotLink.textContent = t('forgotPassword');
        pwdLabelRow.appendChild(pwdLabel);
        pwdLabelRow.appendChild(forgotLink);

        const pwdWrapper = document.createElement('div');
        pwdWrapper.className = 'password-input-wrapper';
        const pwdInput = document.createElement('input');
        pwdInput.type = 'password';
        pwdInput.id = 'loginPassword';
        pwdInput.placeholder = t('passwordPlaceholder');
        pwdInput.required = true;
        pwdInput.autocomplete = 'current-password';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'pwd-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Show or hide password');
        toggleBtn.textContent = '👁️';
        toggleBtn.addEventListener('click', () => {
            pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
        });

        pwdWrapper.appendChild(pwdInput);
        pwdWrapper.appendChild(toggleBtn);
        pwdGroup.appendChild(pwdLabelRow);
        pwdGroup.appendChild(pwdWrapper);

        // Remember Me
        const rememberGroup = document.createElement('div');
        rememberGroup.className = 'remember-checkbox-group';
        const rememberInput = document.createElement('input');
        rememberInput.type = 'checkbox';
        rememberInput.id = 'loginRemember';
        rememberInput.checked = true;
        const rememberLabel = document.createElement('label');
        rememberLabel.htmlFor = 'loginRemember';
        rememberLabel.textContent = t('rememberMe');
        rememberGroup.appendChild(rememberInput);
        rememberGroup.appendChild(rememberLabel);

        // Error Banner
        const errorAlert = document.createElement('div');
        errorAlert.className = 'auth-error-alert';
        errorAlert.hidden = true;

        // Submit Button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = t('signInBtn');

        // Guest Button
        const guestBtn = document.createElement('button');
        guestBtn.type = 'button';
        guestBtn.className = 'btn btn-secondary btn-block guest-btn';
        guestBtn.textContent = t('guestContinue');
        guestBtn.addEventListener('click', () => {
            window.SS.auth.setGuest(true);
            window.SS.router.navigate('/app');
        });

        // Switch to Signup
        const signupSwitch = document.createElement('p');
        signupSwitch.className = 'auth-switch-text';
        signupSwitch.innerHTML = `${t('dontHaveAccount')} <a href="#/signup"><strong>${t('createAccount')}</strong></a>`;

        form.appendChild(emailGroup);
        form.appendChild(pwdGroup);
        form.appendChild(rememberGroup);
        form.appendChild(errorAlert);
        form.appendChild(submitBtn);
        form.appendChild(guestBtn);
        form.appendChild(signupSwitch);

        // Form Submission Logic
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorAlert.hidden = true;
            window.SS.ui.clearFormErrors(form);

            const email = emailInput.value.trim();
            const password = pwdInput.value;

            if (!email) {
                window.SS.ui.setFieldError(emailInput, 'Please enter your email.');
                emailInput.focus();
                return;
            }
            if (!password) {
                window.SS.ui.setFieldError(pwdInput, 'Please enter your password.');
                pwdInput.focus();
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            try {
                const user = await window.SS.auth.signIn({
                    email,
                    password,
                    remember: rememberInput.checked
                });
                submitBtn.textContent = 'Success!';
                if (user.role === 'parent') {
                    window.SS.router.navigate('/parent');
                } else {
                    window.SS.router.navigate('/app');
                }
            } catch (err) {
                errorAlert.textContent = err.message || 'Login failed.';
                errorAlert.hidden = false;
                submitBtn.disabled = false;
                submitBtn.textContent = t('signInBtn');
            }
        });

        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(demoGroup);
        card.appendChild(form);
    }

    // -------------------------------------------------------------------------
    // Signup Form
    // -------------------------------------------------------------------------
    function buildSignupForm(card) {
        card.replaceChildren();

        const title = document.createElement('h2');
        title.textContent = t('createAccount');

        const subtitle = document.createElement('p');
        subtitle.className = 'auth-subtitle';
        subtitle.textContent = 'Choose your role to get started.';

        // Role Cards
        const roleGrid = document.createElement('div');
        roleGrid.className = 'role-cards-grid';

        const studentCard = document.createElement('div');
        studentCard.className = `role-card ${selectedRole === 'student' ? 'selected' : ''}`;
        studentCard.innerHTML = `
            <div class="role-icon">🎓</div>
            <div class="role-title"><strong>${t('roleStudent')}</strong></div>
            <div class="role-desc">${t('studentDesc')}</div>
        `;
        studentCard.addEventListener('click', () => {
            selectedRole = 'student';
            studentCard.classList.add('selected');
            parentCard.classList.remove('selected');
            consentLabel.textContent = t('termsConsentStudent');
        });

        const parentCard = document.createElement('div');
        parentCard.className = `role-card ${selectedRole === 'parent' ? 'selected' : ''}`;
        parentCard.innerHTML = `
            <div class="role-icon">👪</div>
            <div class="role-title"><strong>${t('roleParent')}</strong></div>
            <div class="role-desc">${t('parentDesc')}</div>
        `;
        parentCard.addEventListener('click', () => {
            selectedRole = 'parent';
            parentCard.classList.add('selected');
            studentCard.classList.remove('selected');
            consentLabel.textContent = t('termsConsentParent');
        });

        roleGrid.appendChild(studentCard);
        roleGrid.appendChild(parentCard);

        // Form
        const form = document.createElement('form');
        form.id = 'signupForm';
        form.noValidate = true;

        // Name
        const nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'signupName';
        nameLabel.textContent = t('fullNameLabel');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'signupName';
        nameInput.placeholder = t('fullNamePlaceholder');
        nameInput.maxLength = 80;
        nameInput.required = true;
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);

        // Email
        const emailGroup = document.createElement('div');
        emailGroup.className = 'form-group';
        const emailLabel = document.createElement('label');
        emailLabel.htmlFor = 'signupEmail';
        emailLabel.textContent = t('emailLabel');
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'signupEmail';
        emailInput.placeholder = t('emailPlaceholder');
        emailInput.required = true;
        emailInput.autocomplete = 'username';
        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(emailInput);

        // Password with Live Strength Meter
        const pwdGroup = document.createElement('div');
        pwdGroup.className = 'form-group';
        const pwdLabel = document.createElement('label');
        pwdLabel.htmlFor = 'signupPassword';
        pwdLabel.textContent = t('passwordLabel');
        const pwdInput = document.createElement('input');
        pwdInput.type = 'password';
        pwdInput.id = 'signupPassword';
        pwdInput.placeholder = t('passwordPlaceholder');
        pwdInput.required = true;
        pwdInput.autocomplete = 'new-password';

        // Strength Meter Bar
        const strengthMeter = document.createElement('div');
        strengthMeter.className = 'pwd-strength-container';
        strengthMeter.innerHTML = `
            <div class="pwd-strength-track"><div class="pwd-strength-bar" id="pwdStrengthBar"></div></div>
            <span class="pwd-strength-label" id="pwdStrengthLabel"></span>
        `;
        pwdGroup.appendChild(pwdLabel);
        pwdGroup.appendChild(pwdInput);
        pwdGroup.appendChild(strengthMeter);

        pwdInput.addEventListener('input', () => {
            const bar = document.getElementById('pwdStrengthBar');
            const lbl = document.getElementById('pwdStrengthLabel');
            const evalResult = evaluatePasswordStrength(pwdInput.value);

            if (bar && lbl) {
                bar.className = `pwd-strength-bar ${evalResult.class}`;
                bar.style.width = evalResult.score === 1 ? '33%' : (evalResult.score === 2 ? '66%' : (evalResult.score === 3 ? '100%' : '0%'));
                lbl.textContent = evalResult.hint;
            }
        });

        // Confirm Password
        const confirmGroup = document.createElement('div');
        confirmGroup.className = 'form-group';
        const confirmLabel = document.createElement('label');
        confirmLabel.htmlFor = 'signupConfirm';
        confirmLabel.textContent = t('confirmPasswordLabel');
        const confirmInput = document.createElement('input');
        confirmInput.type = 'password';
        confirmInput.id = 'signupConfirm';
        confirmInput.placeholder = t('confirmPasswordPlaceholder');
        confirmInput.required = true;
        confirmInput.autocomplete = 'new-password';
        confirmGroup.appendChild(confirmLabel);
        confirmGroup.appendChild(confirmInput);

        // Consent Checkbox
        const consentGroup = document.createElement('div');
        consentGroup.className = 'consent-checkbox-group';
        const consentInput = document.createElement('input');
        consentInput.type = 'checkbox';
        consentInput.id = 'signupConsent';
        consentInput.required = true;
        const consentLabel = document.createElement('label');
        consentLabel.htmlFor = 'signupConsent';
        consentLabel.textContent = selectedRole === 'student' ? t('termsConsentStudent') : t('termsConsentParent');
        consentGroup.appendChild(consentInput);
        consentGroup.appendChild(consentLabel);

        // Error Alert
        const errorAlert = document.createElement('div');
        errorAlert.className = 'auth-error-alert';
        errorAlert.hidden = true;

        // Submit
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = t('createAccount');

        const loginSwitch = document.createElement('p');
        loginSwitch.className = 'auth-switch-text';
        loginSwitch.innerHTML = `${t('alreadyHaveAccount')} <a href="#/login"><strong>${t('signInBtn')}</strong></a>`;

        form.appendChild(nameGroup);
        form.appendChild(emailGroup);
        form.appendChild(pwdGroup);
        form.appendChild(confirmGroup);
        form.appendChild(consentGroup);
        form.appendChild(errorAlert);
        form.appendChild(submitBtn);
        form.appendChild(loginSwitch);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorAlert.hidden = true;
            window.SS.ui.clearFormErrors(form);

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = pwdInput.value;
            const confirm = confirmInput.value;

            if (!name) {
                window.SS.ui.setFieldError(nameInput, 'Please enter your full name.');
                nameInput.focus();
                return;
            }
            if (!email) {
                window.SS.ui.setFieldError(emailInput, 'Please enter a valid email.');
                emailInput.focus();
                return;
            }
            if (password.length < 8) {
                window.SS.ui.setFieldError(pwdInput, 'Password must be at least 8 characters.');
                pwdInput.focus();
                return;
            }
            if (password !== confirm) {
                window.SS.ui.setFieldError(confirmInput, 'Passwords do not match.');
                confirmInput.focus();
                return;
            }
            if (!consentInput.checked) {
                errorAlert.textContent = 'Please agree to the privacy and transparency terms to continue.';
                errorAlert.hidden = false;
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            try {
                const user = await window.SS.auth.signUp({
                    name,
                    email,
                    password,
                    role: selectedRole
                });

                submitBtn.textContent = 'Account created!';
                if (user.role === 'parent') {
                    window.SS.router.navigate('/parent');
                } else {
                    window.SS.router.navigate('/app');
                }
            } catch (err) {
                errorAlert.textContent = err.message || 'Signup failed.';
                errorAlert.hidden = false;
                submitBtn.disabled = false;
                submitBtn.textContent = t('createAccount');
            }
        });

        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(roleGrid);
        card.appendChild(form);
    }

    // -------------------------------------------------------------------------
    // Forgot Password Form
    // -------------------------------------------------------------------------
    function buildForgotForm(card) {
        card.replaceChildren();

        const title = document.createElement('h2');
        title.textContent = t('resetPasswordTitle');

        const subtitle = document.createElement('p');
        subtitle.className = 'auth-subtitle';
        subtitle.textContent = t('resetPasswordDesc');

        const form = document.createElement('form');
        form.id = 'forgotForm';

        const emailGroup = document.createElement('div');
        emailGroup.className = 'form-group';
        const emailLabel = document.createElement('label');
        emailLabel.htmlFor = 'forgotEmail';
        emailLabel.textContent = t('emailLabel');
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'forgotEmail';
        emailInput.placeholder = t('emailPlaceholder');
        emailInput.required = true;
        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(emailInput);

        const notice = document.createElement('div');
        notice.className = 'auth-info-alert';
        notice.hidden = true;

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = t('sendResetLink');

        const backLink = document.createElement('p');
        backLink.className = 'auth-switch-text';
        backLink.innerHTML = `<a href="#/login">← ${t('backToLogin')}</a>`;

        form.appendChild(emailGroup);
        form.appendChild(notice);
        form.appendChild(submitBtn);
        form.appendChild(backLink);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) {
                window.SS.ui.setFieldError(emailInput, 'Please enter your registered email.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            try {
                const res = await window.SS.auth.sendReset(email);
                notice.textContent = res.message || 'Recovery email sent!';
                notice.hidden = false;
                submitBtn.textContent = 'Sent!';
            } catch (err) {
                notice.textContent = err.message || 'Could not send reset email.';
                notice.hidden = false;
                submitBtn.disabled = false;
                submitBtn.textContent = t('sendResetLink');
            }
        });

        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(form);
    }

    window.SS.views.auth = Object.freeze({
        renderLogin: () => renderAuthLayout('login'),
        renderSignup: () => renderAuthLayout('signup'),
        renderForgot: () => renderAuthLayout('forgot')
    });
})();
