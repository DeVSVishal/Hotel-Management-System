# Dev 1: Authentication, Users & App Layout

## Your Domain

You own the **security layer** and the **app shell** (navigation/layout) that every other dev builds inside.
Every protected route and API endpoint depends on your auth middleware.

---

## Task 1: Server Auth Utilities

**File:** `server/utils/auth.ts`

`hashPassword` and `verifyPassword` are auto-imported from `nuxt-auth-utils` (no import needed — available globally in server context).

You only need to add the password policy validator (spec requirement: min 8 chars, upper/lowercase, number, special char):

```ts
export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  if (password.length < 8) errors.push('Minimum 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Must contain a number')
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Must contain a special character')
  return { valid: errors.length === 0, errors }
}
```

The `validatePassword` function is already stubbed in `server/utils/auth.ts`. Implement the actual logic inline above.

---

## Task 2: Auth API — Registration

**File:** `server/api/auth/register.post.ts`

- Accept `email`, `password`, `name`
- Validate password against policy
- Hash password with bcrypt
- Create user with role `GUEST`
- Return success (don't auto-login)

---

## Task 3: Auth API — Login

**File:** `server/api/auth/login.post.ts`

- Accept `email`, `password`
- Check user exists
- Check lockout (`lockedUntil` > now → return 423)
- Compare password hash
- On failure: increment `failedLoginAttempts`, lock if >= 5 (15 min lockout)
- On success: reset `failedLoginAttempts` and `lockedUntil`
- Set session via `replaceUserSession(event, { user: { id, email, name, role } })`
- Create `AuditLog` entry with action `"LOGIN"`

---

## Task 4: Auth API — Logout

**File:** `server/api/auth/logout.post.ts`

- Clear session via `clearUserSession(event)`
- Return success

---

## Task 5: RBAC Server Middleware

**File:** `server/middleware/auth.ts`

Global server middleware that runs on every request:

1. Extract session user via `getUserSession(event)`
2. Whitelist public paths: `/api/auth/*`, `/`
3. Require auth for all other `/api/*` paths
4. Implement role-based guards:

| Path prefix | Required role |
|-------------|--------------|
| `/api/admin/*` | `ADMIN` |
| `/api/manager/*` | `MANAGER` or `ADMIN` |
| `/api/staff/*` | `STAFF`, `MANAGER`, or `ADMIN` |
| Everything else | Any authenticated user |

5. Attach `event.context.user = user` so downstream handlers can access the session

6. Log all API access to `AuditLog` (action, userId, ipAddress, path)

---

## Task 6: User Profile API

**File:** `server/api/users/[id].get.ts`
- Return user profile (exclude `passwordHash`)

**File:** `server/api/users/[id].put.ts`
- Allow user to update own name, phone
- If updating password: validate against policy, hash, update `passwordChangedAt`

---

## Task 7: Admin User Management API

**File:** `server/api/admin/users/index.get.ts`
- List all users (admin only — enforced by middleware)

**File:** `server/api/admin/users/[id].put.ts`
- Update any user (change role, reset lockout, etc.)
- Cannot demote yourself from ADMIN

**File:** `server/api/admin/users/[id].delete.ts`
- Delete user (cannot delete yourself)

---

## Task 8: Session API

**File:** `server/api/auth/session.get.ts`
- Return current session user data (used by frontend to check login state + role)

---

## Task 9: App Layout Components

Create a role-based layout that all pages use.

**File:** `app/layout.vue`
- Root layout with role-aware navigation
- Read `user.role` from `useUserSession()`
- Show different nav items per role

```vue
<script setup lang="ts">
const { loggedIn, user } = useUserSession()
</script>
```

**File:** `app/components/ui/AppNavbar.vue`
- Top navbar with logo, profile dropdown, logout button
- Conditional links based on role (Guest sees "My Bookings", Staff sees "Dashboard", etc.)

**File:** `app/components/ui/AppSidebar.vue`
- Sidebar navigation (for staff/manager/admin panels)
- Active route highlighting

---

## Task 10: Auth Pages

**File:** `app/pages/login.vue`
- Email + password form
- Error display (invalid credentials, account locked)
- Redirect to homepage on success
- Use Nuxt UI form components (`UFormField`, `UInput`, `UButton`)

**File:** `app/pages/register.vue`
- Name, email, password fields
- Client-side password validation (show checklist: 8 chars, upper, lower, number, special)
- Submit to `/api/auth/register`
- Redirect to login on success

---

## Task 11: Profile Page

**File:** `app/pages/guest/profile.vue`
- Display user details (name, email, phone)
- Editable form for name, phone
- Password change section
- Protected — redirect to login if not authenticated

---

## Task 12: Admin Pages

**File:** `app/pages/admin/users.vue`
- Table listing all users (columns: name, email, role, status)
- Filter by role
- Actions: Edit role, Unlock account, Delete user

**File:** `app/pages/admin/users/[id].vue`
- Edit user form (name, email, role, phone)
- Managed hotel assignment (for STAFF accounts)

---

## Task 13: Auth Store / Composables

**Optional** — create a composable to simplify auth on the frontend:

**File:** `app/composables/useAuth.ts`
- Wraps `useUserSession()` with helper methods: `login()`, `logout()`, `register()`
- Returns `isGuest`, `isStaff`, `isManager`, `isAdmin` computed booleans

---

## Task 14: Write Tests

### Unit tests (`test/unit/`)

| Test file | What to test |
|-----------|-------------|
| `auth-password.test.ts` | Password validation: valid passwords pass, invalid ones fail with correct errors |
| `auth-lockout.test.ts` | Login failure counter: 5 failures → locked, successful login → reset counter, lockout time expiry |

### Component tests (`test/nuxt/`)

| Test file | What to test |
|-----------|-------------|
| `login-form.test.ts` | Form renders, submit calls API, errors shown |
| `register-form.test.ts` | Form renders, password checklist appears, validation works |

---

## Dependencies on Other Devs

- **Dev 2, Dev 3** depend on your auth middleware being in place before they build protected routes
- They import `useUserSession()` in their pages to check roles
- They use `event.context.user` in their server handlers for audit logging

---

## Acceptance Criteria

- [ ] Users can register with strong password enforcement
- [ ] Users can log in and log out
- [ ] Account locks after 5 failed login attempts (15 min)
- [ ] RBAC middleware blocks unauthorized API access (test each role)
- [ ] Admin can view, edit, and delete users
- [ ] Layout shows correct navigation per role
- [ ] Login/register pages are well-styled (Nuxt UI components)
- [ ] Profile page shows and updates user details
- [ ] All unit tests pass
