/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: js/router.js
   Namespace: window.SS.router
   Hash-based Router with Strict Role Guards
========================================= */

(function () {
    'use strict';

    window.SS = window.SS || {};

    const routes = {};
    let currentRoute = null;
    let currentParams = {};
    let beforeNavigateHook = null;
    let onNavigateCallbacks = [];

    /**
     * Normalizes a hash string into route path and params.
     * e.g., "#/parent/child/xyz123" -> { path: "/parent/child/:uid", params: { uid: "xyz123" } }
     */
    function parseHash(hash) {
        const clean = (hash || window.location.hash || '#/').replace(/^#/, '');
        const path = clean.split('?')[0] || '/';

        // Check exact match
        if (routes[path]) {
            return { route: routes[path], path, params: {} };
        }

        // Check parameterized match e.g. /parent/child/:uid
        for (const registeredPath of Object.keys(routes)) {
            if (registeredPath.includes(':')) {
                const regParts = registeredPath.split('/');
                const pathParts = path.split('/');

                if (regParts.length === pathParts.length) {
                    const params = {};
                    let match = true;

                    for (let i = 0; i < regParts.length; i++) {
                        if (regParts[i].startsWith(':')) {
                            params[regParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
                        } else if (regParts[i] !== pathParts[i]) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        return { route: routes[registeredPath], path: registeredPath, params };
                    }
                }
            }
        }

        return { route: routes['/404'] || null, path: '/404', params: {} };
    }

    /**
     * Registers a route handler.
     * @param {string} path e.g. "/login", "/app", "/parent", "/parent/child/:uid"
     * @param {Object} config { view: Function, role: 'student'|'parent'|'all'|'unauth', title: string }
     */
    function addRoute(path, config) {
        routes[path] = config;
    }

    /**
     * Navigates to a specific hash route programmatically.
     * @param {string} path e.g. "#/app" or "/parent"
     */
    function navigate(path) {
        const clean = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : '/' + path}`;
        if (window.location.hash === clean) {
            handleRoute();
        } else {
            window.location.hash = clean;
        }
    }

    /**
     * Evaluates route guards based on current auth state.
     * @param {Object} parsed
     * @returns {string|null} Redirect path or null if allowed
     */
    function evaluateGuards(parsed) {
        const auth = window.SS.auth;
        const currentUser = auth ? auth.currentUser() : null;
        const isGuest = auth ? auth.isGuest() : true;
        const role = currentUser ? currentUser.role : (isGuest ? 'student' : null);

        const routeConfig = parsed.route;
        if (!routeConfig) return '/404';

        const requiredRole = routeConfig.role || 'all';

        // 1. Auth pages (/login, /signup, /forgot)
        if (requiredRole === 'unauth') {
            if (currentUser && !isGuest) {
                return currentUser.role === 'parent' ? '/parent' : '/app';
            }
            return null; // Allowed for unauthenticated or guest looking to sign in
        }

        // 2. Protected pages requiring authenticated user
        if (requiredRole === 'auth' || requiredRole === 'student' || requiredRole === 'parent') {
            if (!currentUser && !isGuest) {
                return `/login?redirect=${encodeURIComponent(parsed.path)}`;
            }

            // Role guard check
            if (requiredRole === 'parent' && role !== 'parent') {
                return '/app';
            }
            if (requiredRole === 'student' && role === 'parent') {
                return '/parent';
            }
        }

        return null;
    }

    /**
     * Core hashchange event processor.
     */
    function handleRoute() {
        const hash = window.location.hash || '#/';

        // Default landing route
        if (hash === '#/' || hash === '#' || hash === '') {
            const auth = window.SS.auth;
            const currentUser = auth ? auth.currentUser() : null;
            if (currentUser) {
                navigate(currentUser.role === 'parent' ? '/parent' : '/app');
            } else {
                navigate('/login');
            }
            return;
        }

        const parsed = parseHash(hash);
        const guardRedirect = evaluateGuards(parsed);

        if (guardRedirect) {
            navigate(guardRedirect);
            return;
        }

        // Cleanup previous route subscriptions or UI
        if (typeof beforeNavigateHook === 'function') {
            try { beforeNavigateHook(currentRoute, parsed.path); } catch (e) {
                console.warn('[Router] beforeNavigate error:', e);
            }
        }

        currentRoute = parsed.path;
        currentParams = parsed.params;

        // Render target view
        if (parsed.route && typeof parsed.route.render === 'function') {
            try {
                parsed.route.render(currentParams);
            } catch (err) {
                console.error('[Router] Render error for route', currentRoute, err);
            }
        }

        // Update document title
        if (parsed.route && parsed.route.title) {
            document.title = `${parsed.route.title} — SmartSpend`;
        }

        // Accessibility: move keyboard focus to top heading of the active view
        setTimeout(() => {
            const activeView = document.querySelector('.active-view');
            if (activeView) {
                const heading = activeView.querySelector('h1, h2, [tabindex="-1"]');
                if (heading) {
                    heading.setAttribute('tabindex', '-1');
                    heading.focus();
                }
            }
        }, 50);

        // Notify route listeners
        onNavigateCallbacks.forEach(cb => {
            try { cb(currentRoute, currentParams); } catch (e) {}
        });
    }

    /**
     * Initializes the router event listeners.
     */
    function init() {
        window.addEventListener('hashchange', handleRoute);
        // Process current hash on load
        handleRoute();
    }

    window.SS.router = Object.freeze({
        addRoute,
        navigate,
        init,
        getCurrentRoute: () => currentRoute,
        getParams: () => ({ ...currentParams }),
        beforeNavigate: (hook) => { beforeNavigateHook = hook; },
        onNavigate: (cb) => {
            onNavigateCallbacks.push(cb);
            return () => {
                onNavigateCallbacks = onNavigateCallbacks.filter(c => c !== cb);
            };
        }
    });
})();
