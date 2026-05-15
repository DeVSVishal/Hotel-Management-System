# Dev 3: Staff Operations, Billing, Reports & Audit Logging

## Your Domain

You own the **operational side** — staff check-in/check-out workflow, billing/invoices, manager reports, and security audit logging. This is where the system goes from "booking website" to "hotel management system."

---

## Task 1: Billing Utilities

**File:** `server/utils/billing.ts`

Centralize all pricing logic here. Dev 2 will import `calculateCancellationFee` from here for their cancel endpoint.

```ts
export function calculateCancellationFee(
  checkIn: Date,
  cancelledAt: Date,
  firstNightPrice: number,
  totalBookingValue: number,
): number {
  const daysUntilCheckIn = Math.ceil(
    (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilCheckIn > 14) return 0
  if (daysUntilCheckIn >= 3) return Math.round(firstNightPrice * 0.5 * 100) / 100
  if (daysUntilCheckIn > 0) return firstNightPrice
  return totalBookingValue // No-show
}

export function calculateInvoiceTotal(booking: {
  bookingRooms: { priceAtBooking: number }[]
  services: { price: number; quantity: number }[]
  checkIn: Date
  checkOut: Date
}): number {
  const nights = Math.ceil(
    (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
  )

  const roomsTotal = booking.bookingRooms.reduce(
    (sum, br) => sum + br.priceAtBooking * nights, 0
  )

  const servicesTotal = booking.services.reduce(
    (sum, s) => sum + s.price * s.quantity, 0
  )

  return Math.round((roomsTotal + servicesTotal) * 100) / 100
}
```

---

## Task 2: Staff Check-In API

**File:** `server/api/staff/bookings/[id]/checkin.put.ts`

- Verify booking belongs to this user's hotel (staff are assigned to a hotel via `user.hotelId`)
- Verify booking status is `CONFIRMED`
- Update booking status to `CHECKED_IN`
- Ensure all booking rooms are `OCCUPIED`
- Create `AuditLog` entry: action `"CHECK_IN"`, details: `"Booking #${id}"`

---

## Task 3: Staff Check-Out API

**File:** `server/api/staff/bookings/[id]/checkout.put.ts`

- Verify booking status is `CHECKED_IN`
- Calculate final bill:
  1. Sum room costs (`priceAtBooking × nights`) for each `BookingRoom`
  2. Sum service costs (`price × quantity`) for each `BookingService`
- Generate `Invoice` with `totalAmount`, `paid = false`
- Update booking status to `CHECKED_OUT`
- Update all related rooms' status to `CLEANING`
- Create `AuditLog`: action `"CHECK_OUT"`

---

## Task 4: Staff Dashboard API

**File:** `server/api/staff/dashboard.get.ts`

Return aggregated data for the staff dashboard. Filter by the staff member's assigned hotel:

```json
{
  "occupancy": {
    "totalRooms": 35,
    "occupiedRooms": 22,
    "availableRooms": 10,
    "cleaningRooms": 2,
    "outOfServiceRooms": 1,
    "occupancyRate": 62.8
  },
  "todayArrivals": [
    { "bookingId": 1, "guestName": "John", "roomNumbers": ["101", "102"] }
  ],
  "todayDepartures": [
    { "bookingId": 3, "guestName": "Jane", "roomNumbers": ["201"] }
  ],
  "recentActivity": [
    { "action": "CHECK_IN", "details": "Booking #5", "timestamp": "..." }
  ]
}
```

**SQL logic:**
- `todayArrivals`: bookings with `checkIn = today` and `status = CONFIRMED`
- `todayDepartures`: bookings with `checkOut = today` and `status = CHECKED_IN`
- `occupancy`: count by `RoomStatus` for the hotel

---

## Task 5: Room Status Management API

**File:** `server/api/staff/rooms/[id]/status.put.ts`

Allow staff to update room status:

- `AVAILABLE` → `CLEANING` (mark for cleaning after checkout — or do this manually)
- `CLEANING` → `AVAILABLE` (cleaning complete)
- `AVAILABLE` → `OUT_OF_SERVICE` (maintenance issue)
- `OUT_OF_SERVICE` → `AVAILABLE` (resolved)

Validate transitions: can't occupy a room that's `OUT_OF_SERVICE`. Can't clean an `OCCUPIED` room.

Create `AuditLog`: action `"ROOM_STATUS_CHANGE"`, details: `"Room #${roomNumber}: ${oldStatus} → ${newStatus}"`

---

## Task 6: Ancillary Services API

**File:** `server/api/services/index.get.ts`
- Return list of available services with fixed prices:
  - AIRPORT_TRANSFER: £50 (one-way)
  - BREAKFAST: £20 (per person, per day)
  - SPA_ACCESS: £35 (per person, per day)
  - LATE_CHECKOUT: £40 (until 2 PM)

**File:** `server/api/bookings/[id]/services.post.ts`
- Add service to an existing booking
- Accept: `service` (ServiceType), `quantity`
- Validate: can only add to `CONFIRMED` or `CHECKED_IN` bookings
- Use fixed price from the spec
- Create `AuditLog`

**File:** `server/api/bookings/[id]/services/[serviceId].delete.ts`
- Remove service from booking
- Validate: can only remove from `CONFIRMED` or `CHECKED_IN` bookings

---

## Task 7: Invoice & Payment API

**File:** `server/api/bookings/[id]/invoice.get.ts`
- Return invoice for a booking (dev 3 creates it on checkout, dev 2 may also create for cancellations)
- Include room breakdown, services breakdown, total

**File:** `server/api/invoices/[id]/pay.put.ts`
- Mark invoice as paid
- Set `paidAt = now()`
- Create `AuditLog`

---

## Task 8: Manager Reports API

**File:** `server/api/manager/reports/occupancy.get.ts`

Query params: `startDate`, `endDate`, `hotelId` (optional)
Returns daily occupancy rate:

```json
[
  { "date": "2026-06-01", "totalRooms": 35, "bookedRooms": 28, "rate": 80.0 },
  { "date": "2026-06-02", "totalRooms": 35, "bookedRooms": 30, "rate": 85.7 }
]
```

**File:** `server/api/manager/reports/revenue.get.ts`

Query params: `startDate`, `endDate`, `hotelId` (optional)
Returns revenue breakdown:

```json
{
  "totalRevenue": 15420.00,
  "roomRevenue": 13800.00,
  "serviceRevenue": 1620.00,
  "byRoomType": [
    { "type": "STANDARD_DOUBLE", "revenue": 4800 },
    { "type": "DELUXE_KING", "revenue": 5400 }
  ],
  "byService": [
    { "service": "BREAKFAST", "revenue": 800 },
    { "service": "SPA_ACCESS", "revenue": 700 }
  ]
}
```

**File:** `server/api/manager/reports/guest-demographics.get.ts`

Return guest booking patterns: top guests by spend, average stay length, booking frequency.

---

## Task 9: Room Rate Management API

**File:** `server/api/manager/rooms/[id]/rates.put.ts`

Allow managers to update room pricing:
- Change `priceOffPeak` and `pricePeak`
- Only affects future bookings (existing confirmed bookings have `priceAtBooking` snapshot)
- Create `AuditLog`

---

## Task 10: Manager Staff Management API

**File:** `server/api/manager/staff/index.get.ts`
- List staff assigned to the manager's hotel

**File:** `server/api/manager/staff/index.post.ts`
- Create staff account (assigned to manager's hotel)

**File:** `server/api/manager/staff/[id].delete.ts`
- Remove staff (cannot remove self)

---

## Task 11: Audit Log API

**File:** `server/api/audit-logs/index.get.ts`
- List audit logs (paginated, filterable by action, userId, date range)
- Admin only

---

## Task 12: Staff Dashboard Page

**File:** `app/pages/staff/dashboard.vue`

- **Occupancy overview cards:** total rooms, occupied, available, cleaning, out of service, occupancy %
- **Today's Arrivals** table — guest name, rooms, booking ID, "Check In" button
- **Today's Departures** table — guest name, rooms, booking ID, "Check Out" button
- **Recent Activity** feed (last 10 audit log entries for this hotel)
- Use Nuxt UI `UCard`, `UTable`, `UButton`

---

## Task 13: Check-In / Check-Out Pages

**File:** `app/pages/staff/checkin/[id].vue`
- Guest details, booking details, rooms
- "Confirm Check-In" button → calls `/api/staff/bookings/[id]/checkin`

**File:** `app/pages/staff/checkout/[id].vue`
- Booking summary: rooms, dates, services used
- Live invoice preview (calculate total from booking data)
- "Process Check-Out" button → calls `/api/staff/bookings/[id]/checkout`
- Shows generated invoice after checkout

---

## Task 14: Room Status Management Page

**File:** `app/pages/staff/rooms.vue`
- Filterable room list (by status, type)
- Color-coded status badges
- Quick actions: "Mark Cleaning", "Set Available", "Out of Service"
- Use Nuxt UI `UBadge` (color variants per status), `UDropdownMenu` or `UContextMenu`

---

## Task 15: Manager Reports Page

**File:** `app/pages/manager/reports.vue`

- Date range selector
- Hotel selector (manager may oversee one hotel)
- **Occupancy chart:** line/bar chart showing daily occupancy rate
- **Revenue chart:** bar chart by room type / by service
- **Guest demographics summary:** top guests, average stay, booking frequency

For charts, use a lightweight library. Recommended options:
- **[Chart.js](https://www.chartjs.org/) + [vue-chartjs](https://vue-chartjs.org/)** — most common
- Or build simple bar/line visuals with Tailwind (no dependency needed)

---

## Task 16: Manager Rate Management Page

**File:** `app/pages/manager/rates.vue`
- Table of rooms with current `priceOffPeak` and `pricePeak`
- Inline editable pricing
- Save button triggers API call

---

## Task 17: Manager Staff Management Page

**File:** `app/pages/manager/staff.vue`
- Table of staff members
- "Add Staff" form (name, email, password)
- Delete staff button

---

## Task 18: Guest Invoice Viewing

**File:** `app/pages/guest/bookings/[id]/invoice.vue`
- Invoice display: hotel name, guest name, dates, room charges, service charges, total
- Paid / Unpaid badge
- Download/print button (use `window.print()` with print CSS)

---

## Task 19: Write Tests

### Unit tests (`test/unit/`)

| Test file | What to test |
|-----------|-------------|
| `invoice-total.test.ts` | `calculateInvoiceTotal()` correctly sums rooms + services for a given booking |
| `cancellation-fee.test.ts` | All 4 cancellation tiers return correct values |
| `room-status-transition.test.ts` | Valid transitions pass, invalid ones (e.g., OCCUPIED → CLEANING directly without checkout) are rejected |
| `occupancy-report.test.ts` | Occupancy rate calculation with known test data |

### Component tests (`test/nuxt/`)

| Test file | What to test |
|-----------|-------------|
| `staff-dashboard.test.ts` | Dashboard renders occupancy cards, arrivals, departures tables |
| `invoice-display.test.ts` | Invoice shows correct line items and total |

---

## Dependencies on Other Devs

- **Dev 1**: Auth middleware must be working (your `/api/staff/*`, `/api/manager/*` routes depend on RBAC)
- **Dev 2**: You depend on their booking creation being functional — you can't test check-in without bookings in the DB. Coordinate early on the `Booking` model.
- **Dev 1**: `AuditLog` entries from login/logout will appear in your audit log viewer — no special coordination needed since you both write to the same table.

---

## Acceptance Criteria

- [ ] Staff can check in a guest (booking status → CHECKED_IN)
- [ ] Staff can check out a guest (booking status → CHECKED_OUT, invoice generated, rooms → CLEANING)
- [ ] Staff dashboard shows live occupancy, today's arrivals/departures
- [ ] Staff can update room statuses (Valid transitions enforced)
- [ ] Services can be added/removed from active bookings
- [ ] Manager can view occupancy reports (daily rate over date range)
- [ ] Manager can view revenue reports (by room type, by service)
- [ ] Manager can update room rates
- [ ] Manager can manage staff accounts
- [ ] Guest can view their invoice
- [ ] Staff can mark invoices as paid
- [ ] Audit logs are created for all key actions (check-in, check-out, room status changes, rate changes)
- [ ] All unit tests pass, component tests pass
