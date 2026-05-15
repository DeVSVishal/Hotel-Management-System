# Hotel Management System (HMS)

A full-stack hotel management web application built with Nuxt 4, Prisma, and SQLite. Supports multiple hotel locations (London, Paris, New York), role-based access for guests, staff, managers, and administrators.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 4 (Vue 3, TypeScript) |
| UI Components | Nuxt UI v4 (Reka UI + Tailwind CSS v4) |
| Icons | Nuxt Icon (Iconify) |
| Database | Prisma 7 + SQLite + `@prisma/adapter-libsql` |
| Auth | nuxt-auth-utils (sealed cookie sessions) |
| Testing | Vitest + `@nuxt/test-utils` + Happy DOM |
| Linting | `@nuxt/eslint` |
| Runtime | Bun |

## Prerequisites

- **Bun** >= 1.1.0 ([install](https://bun.sh))
- Node.js >= 20 (if using npm/pnpm/yarn instead of Bun)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> hms-app
cd hms-app
bun install

# 2. Set up the database
bunx prisma migrate dev --name init

# 3. (Optional) Seed mock data
bun run db:seed

# 4. Start the dev server
bun dev
```

The app runs at **http://localhost:3000**.

## Environment Variables

Copy `.env.example` to `.env` (already set up):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file path (`file:./dev.db`) |
| `NUXT_SESSION_PASSWORD` | 32+ char secret for cookie encryption |

---

## Project Structure

```
hms-app/
├── app/                          # Frontend (Vue + Nuxt)
│   ├── app.vue                   # Root component (NuxtPage + announcer)
│   ├── assets/
│   │   └── css/
│   │       └── main.css          # Tailwind v4 + Nuxt UI imports, global styles
│   ├── components/               # Vue components (auto-imported)
│   │   ├── ui/                   # Shared/reusable UI components
│   │   │   ├── AppNavbar.vue     # Top navbar with profile dropdown
│   │   │   └── AppSidebar.vue    # Role-based sidebar navigation
│   │   ├── booking/              # Booking-related components
│   │   ├── room/                 # Room-related components
│   ├── composables/              # Auto-imported composables
│   │   └── useAuth.ts            # Auth helpers (role checks, login/logout/register)
│   ├── layout.vue                # Root layout with role-aware navigation
│   ├── pages/                    # File-based routes
│   │   ├── index.vue             # Homepage
│   │   ├── login.vue             # Login page
│   │   ├── register.vue          # Registration page
│   │   ├── change-password.vue   # Forced password change
│   │   ├── guest/                # Guest-only pages
│   │   │   ├── bookings.vue
│   │   │   └── profile.vue
│   │   ├── staff/                # Staff-only pages
│   │   │   └── dashboard.vue
│   │   ├── manager/              # Manager-only pages
│   │   │   └── reports.vue
│   │   └── admin/                # Admin-only pages
│   │       ├── users.vue
│   │       └── users/
│   │           └── [id].vue
├── server/                       # Backend (Nuxt server)
│   ├── api/                      # API routes (Nitro handlers)
│   │   ├── auth/
│   │   │   ├── login.post.ts     # Login with lockout + password expiry
│   │   │   ├── register.post.ts  # Registration with password policy
│   │   │   ├── logout.post.ts    # Clear session
│   │   │   └── session.get.ts    # Return current user session
│   │   ├── users/
│   │   │   └── [id].get.ts       # View profile
│   │   │   └── [id].put.ts       # Update profile / change password
│   │   ├── admin/
│   │   │   └── users/
│   │   │       ├── index.get.ts    # List all users
│   │   │       ├── [id].put.ts     # Update user / unlock
│   │   │       └── [id].delete.ts  # Delete user
│   │   ├── rooms/
│   │   ├── bookings/
│   │   └── reports/
│   ├── middleware/               # Server middleware (RBAC guard)
│   │   └── auth.ts
│   ├── utils/                    # Shared server utilities
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── auth.ts               # Password validation
│   │   └── billing.ts            # Fee calculation, invoice total
│   └── seed.ts                   # Test data seeder
├── prisma/
│   ├── schema.prisma             # Database schema (models, enums)
│   └── migrations/               # Migration history
├── test/
│   ├── unit/                     # Unit tests (business logic)
│   └── nuxt/                     # Component/runtime tests
├── nuxt.config.ts                # Nuxt configuration
├── vitest.config.ts              # Test runner configuration
├── eslint.config.mjs             # ESLint configuration
└── package.json
```

---

## How To: Create a New Page

Pages are Vue SFCs inside `app/pages/`. The file path becomes the URL.

```vue
<!-- app/pages/example.vue -->
<script setup lang="ts">
const message = ref('Hello from example page')
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold">{{ message }}</h1>
  </div>
</template>
```

**Dynamic routes** use bracket notation:
```
app/pages/hotels/[id].vue          →  /hotels/5
app/pages/guest/bookings/[id].vue   →  /guest/bookings/10
```

**Nested layouts** — create a `NuxtPage` wrapper in the parent:

```vue
<!-- app/pages/guest.vue (layout wrapper) -->
<template>
  <div>
    <nav>Guest Menu</nav>
    <NuxtPage />
  </div>
</template>
```

See: [Nuxt Pages Docs](https://nuxt.com/docs/getting-started/routing)

---

## How To: Create an API Endpoint

> **Important:** In Nuxt 4, the `~/` alias resolves to the `app/` directory (not the project root). All files inside `server/` must use **relative imports** to reference other server files.  
> From `server/api/*/` → use `../../utils/prisma`.  
> From `server/middleware/` → use `../utils/prisma`.

Create a file in `server/api/`. The filename determines the HTTP method and route.

```
server/api/rooms/index.get.ts           →  GET  /api/rooms
server/api/rooms/index.post.ts          →  POST /api/rooms
server/api/rooms/[id].get.ts            →  GET  /api/rooms/:id
server/api/bookings/[id]/cancel.put.ts  →  PUT  /api/bookings/:id/cancel
```

**Example — GET all rooms:**

```ts
// server/api/rooms/index.get.ts
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const rooms = await prisma.room.findMany({
    include: { hotel: true },
  })
  return rooms
})
```

**Example — POST with body validation:**

```ts
// server/api/rooms/index.post.ts
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const room = await prisma.room.create({
    data: {
      roomNumber: body.roomNumber,
      type: body.type,
      capacity: body.capacity,
      priceOffPeak: body.priceOffPeak,
      pricePeak: body.pricePeak,
      hotelId: body.hotelId,
    },
  })
  return room
})
```

**Accessing route params:**

```ts
import { getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')  // from /api/rooms/[id].get.ts
  const room = await prisma.room.findUnique({ where: { id: Number(id) } })
  return room
})
```

---

## How To: Work With the Database (Prisma)

### Adding or changing models

1. Edit `prisma/schema.prisma`
2. Run the migration:

```bash
bunx prisma migrate dev --name describe_your_change
```

3. The Prisma client auto-regenerates. Restart the dev server if needed.

### Using Prisma in server code

Import the shared singleton (use relative paths from your server file):

```ts
// From server/api/rooms/index.get.ts
import prisma from '../../utils/prisma'

// From server/middleware/auth.ts
import prisma from '../utils/prisma'

const hotels = await prisma.hotel.findMany()
```

The Prisma client is generated to `server/generated/prisma/` (gitignored). The client singleton at `server/utils/prisma.ts` uses the `@prisma/adapter-libsql` driver adapter required by Prisma 7. After any schema change, run `bunx prisma generate` to regenerate it.

### Common query patterns

```ts
// Find with relations
await prisma.user.findUnique({
  where: { id: 1 },
  include: { bookings: true, hotel: true },
})

// Filtered query
await prisma.room.findMany({
  where: {
    hotelId: 1,
    status: 'AVAILABLE',
    capacity: { gte: 2 },
  },
})

// Transaction
await prisma.$transaction([
  prisma.booking.create({ data: { ... } }),
  prisma.room.update({ where: { id: 1 }, data: { status: 'OCCUPIED' } }),
])
```

### Seeding test data

The seed script creates 3 hotels (London, Paris, New York), 12 rooms, and one user per role:

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@admin.com` | `Admin123!` |
| MANAGER | `manager@manager.com` | `Manager1!` |
| STAFF | `staff@staff.com` | `Staff123!` |
| GUEST | `guest@guest.com` | `Guest123!` |

Run with:

```bash
bun run db:seed
```

> Re-run after resetting the DB: `rm dev.db && bunx prisma migrate dev --name init && bun run db:seed`

### Viewing data in the browser

```bash
bunx prisma studio
```

Opens a visual DB editor at `http://localhost:5555`.

---

## How To: Authentication & Sessions

We use `nuxt-auth-utils` which stores sessions in encrypted cookies (no DB table needed).

### Security features

| Feature | Details |
|---------|---------|
| **Password policy** | Min 8 chars, uppercase, lowercase, number, special character |
| **Account lockout** | Locked after 5 failed attempts, released after 15 minutes |
| **Password expiry** | Admin/Manager forced to change password every 6 months |
| **Auto-logout** | Session cleared after 15 minutes of inactivity (client-side timer) |
| **RBAC** | 4 roles: GUEST, STAFF, MANAGER, ADMIN — enforced by server middleware |
| **Audit logging** | All logins and API access logged to `AuditLog` table |

### Reading the session (client-side)

```vue
<script setup lang="ts">
const { loggedIn, user } = useUserSession()
</script>
```

Or with the convenience composable:

```vue
<script setup lang="ts">
const { isAdmin, isStaff, isGuest, login, logout } = useAuth()
</script>
```

### Protecting API routes (server middleware)

The global middleware at `server/middleware/auth.ts` enforces RBAC:

| Path prefix | Required role |
|-------------|--------------|
| `/api/auth/*`, `/` | Public (no auth needed) |
| `/api/admin/*` | ADMIN |
| `/api/manager/*` | MANAGER or ADMIN |
| `/api/staff/*` | STAFF, MANAGER, or ADMIN |
| Everything else | Any authenticated user |

---

## How To: Use Nuxt UI Components

Nuxt UI v4 provides 125+ accessible components. All are auto-imported (no `import` needed).

```vue
<script setup lang="ts">
const rooms = ref([{ id: 1, number: '101', type: 'Standard' }])
</script>

<template>
  <!-- Button -->
  <UButton color="primary" @click="handleClick">Book Now</UButton>

  <!-- Form -->
  <UFormField label="Email" name="email">
    <UInput v-model="email" placeholder="you@example.com" />
  </UFormField>

  <!-- Table -->
  <UTable :data="rooms" :columns="columns" />

  <!-- Modal -->
  <UModal v-model:open="isOpen" title="Booking Confirmed">
    <p>Your booking has been confirmed.</p>
  </UModal>

  <!-- Toast notification -->
  <script setup>
  const toast = useToast()
  toast.add({ title: 'Success', description: 'Room booked!' })
  </script>
</template>
```

Browse all components: [Nuxt UI Docs](https://ui.nuxt.com)

---

## How To: Write Tests

Tests go in `/test/` — unit tests in `test/unit/`, component tests in `test/nuxt/`.

### Unit test (business logic)

```ts
// test/unit/cancellation.test.ts
import { describe, expect, it } from 'vitest'

function calculateCancellationFee(checkInDate: Date, cancelDate: Date, firstNightPrice: number): number {
  const daysUntilCheckIn = Math.ceil(
    (checkInDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysUntilCheckIn > 14) return 0
  if (daysUntilCheckIn > 3) return firstNightPrice * 0.5
  return firstNightPrice
}

describe('cancellation fee calculation', () => {
  it('is free more than 14 days before', () => {
    const fee = calculateCancellationFee(
      new Date('2026-06-01'),
      new Date('2026-05-10'),
      120,
    )
    expect(fee).toBe(0)
  })

  it('charges 50% for 3-14 days before', () => {
    const fee = calculateCancellationFee(
      new Date('2026-06-01'),
      new Date('2026-05-25'),
      120,
    )
    expect(fee).toBe(60)
  })

  it('charges 100% less than 72 hours before', () => {
    const fee = calculateCancellationFee(
      new Date('2026-06-01'),
      new Date('2026-05-31'),
      120,
    )
    expect(fee).toBe(120)
  })
})
```

### Component test

```ts
// test/nuxt/room-card.test.ts
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

describe('room card component', () => {
  it('displays room details', async () => {
    const component = await mountSuspended(defineComponent({
      template: '<div class="room-card">Deluxe King - £180</div>',
    }))
    expect(component.text()).toContain('Deluxe King')
  })
})
```

### Run tests

```bash
bun test              # All tests
bun run test:unit     # Unit tests only
bun run test:nuxt     # Component tests only
bun run test:watch    # Watch mode
```

---

## Scripts Reference

| Command | Purpose |
|---------|---------|
| `bun dev` | Start dev server (HMR) |
| `bun run build` | Production build |
| `bun run preview` | Preview production build locally |
| `bun test` | Run all tests |
| `bun run test:watch` | Watch mode tests |
| `bun run lint` | Run ESLint |
| `bunx prisma studio` | Open Prisma data viewer |
| `bunx prisma migrate dev --name <name>` | Create & apply migration |
| `bun run db:seed` | Seed mock data |

---

## Code Conventions

- **TypeScript** everywhere (`.ts` for server, `.vue` for components)
- **Vue 3 Composition API** with `<script setup lang="ts">`
- **kebab-case** for filenames, **PascalCase** for component names
- **Tailwind utility classes** for styling (no inline styles or scoped CSS blocks unless necessary)
- **Prefer `defineEventHandler`** over raw `h3` handlers for API routes
- **Use `consola`** for logging (available as auto-import in server context)
- **Commit messages**: `type: description` (e.g., `feat: add room search endpoint`)

---

## Useful Links

- [Nuxt 4 Docs](https://nuxt.com/docs)
- [Nuxt UI Components](https://ui.nuxt.com/docs/components)
- [Nuxt Icon (Iconify)](https://nuxt.com/modules/icon)
- [Prisma Docs](https://www.prisma.io/docs)
- [Vitest Docs](https://vitest.dev)
