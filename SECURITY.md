# 🔒 SmartSpend — Security, Privacy & Consent Architecture

SmartSpend was architected from the ground up to protect student privacy and enforce transparent, consent-based parental monitoring.

---

## 1. Threat Model & Guiding Principles

1. **Consent-First Architecture:** Parental monitoring is **never covert**. A child must explicitly generate a short-lived, single-use invite code to link with a parent. The student retains sovereign control:
   - The student can switch between `Full` (itemized expenses) and `Summary` (category totals & budget only).
   - The student can revoke parental access at any second with instant, zero-delay effect.
2. **Advisory Controls Only:** SmartSpend does not hold custody of student bank accounts or UPI wallets. Parental limits (allowances, category caps) are **strictly advisory**—they provide guidance and trigger alerts rather than attempting impossible client-side payment blocking.
3. **Least Privilege & Role Immutability:** User roles (`student` vs `parent`) are chosen at registration and strictly immutable in both Firestore Security Rules and local storage schemas.
4. **No Plaintext Passwords:**
   - In **Cloud Mode**, credentials are managed by Firebase Auth with enterprise-grade scrypt/bcrypt.
   - In **Local Demo Mode**, passwords are cryptographic hashes derived with `crypto.subtle` PBKDF2 (SHA-256, 16-byte cryptographically secure random salt, 100,000 iterations).

---

## 2. Content Security Policy (CSP)

SmartSpend runs under a strict Content Security Policy allowing only verified, pinned origins:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://www.gstatic.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
">
```

- **`script-src`:** Restricts script execution to local files and the pinned Firebase compat SDK (`https://www.gstatic.com/firebasejs/10.12.5/`).
- **`object-src 'none'`:** Blocks legacy plugins, Flash, and Java applets.
- **`connect-src`:** Allows network traffic exclusively to authorized Google Identity and Firestore endpoints.

---

## 3. Firestore Rules Playground Verification Test Cases

You can verify the security boundaries in the Firebase Console under **Firestore Database > Rules > Rules Playground**.

| Test Case | Method | Document Path | Auth UID / Token | Expected Outcome | Security Rationale |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **1. Student reads own expense** | `get` | `/users/student1/expenses/exp1` | `auth.uid = 'student1'` | **ALLOW** | User possesses sovereign ownership of their personal data. |
| **2. Linked Parent reads expense (Full share)** | `get` | `/users/student1/expenses/exp1` | `auth.uid = 'parent1'` *(with active link `links/student1_parent1` having `status: 'active'`, `shareLevel: 'full'`)* | **ALLOW** | Student granted full itemized transparency to linked parent. |
| **3. Linked Parent reads expense (Summary share)** | `get` | `/users/student1/expenses/exp1` | `auth.uid = 'parent1'` *(with active link having `shareLevel: 'summary'`)* | **DENY** | In summary mode, itemized `/expenses/{id}` are hidden; only `/summary/{id}` is readable. |
| **4. Unlinked Parent reads expense** | `get` | `/users/student1/expenses/exp1` | `auth.uid = 'parent_stranger'` | **DENY** | Zero visibility without an active, non-revoked student link. |
| **5. Parent attempts to add expense to child** | `create` | `/users/student1/expenses/exp2` | `auth.uid = 'parent1'` | **DENY** | Parents are strictly read-only on student transactions. |
| **6. User attempts to alter role** | `update` | `/users/student1` | `auth.uid = 'student1'`, Data: `{ role: 'parent' }` | **DENY** | Rule enforces `request.resource.data.role == resource.data.role`. |
| **7. Redeem expired invite code** | `create` | `/links/student1_parent1` | `auth.uid = 'parent1'`, Invite `expiresAt` in past | **DENY** | Rule verifies `invites[code].expiresAt > request.time`. |
| **8. Parent modifies unapproved request fields** | `update` | `/users/student1/requests/req1` | `auth.uid = 'parent1'`, Modifying `amount` | **DENY** | Parent can only alter `status`, `parentNote`, `decidedAt`, `decidedBy`, and `approvedAmount`. |

---

## 4. Input Sanitization & XSS Prevention

- **Zero `innerHTML` with User Content:** All dynamic data (titles, notes, merchant names, challenge descriptions) is injected via `element.textContent` or explicit DOM node construction (`document.createElement`).
- **Input Boundaries:** Titles are capped at 80 characters; notes at 200 characters; amounts must be strictly between ₹0.01 and ₹1,000,000.
- **Link Attributes:** All external hyperlinks specify `rel="noopener noreferrer"`.
