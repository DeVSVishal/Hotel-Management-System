# Dev 2: Hotels, Rooms & Guest Booking Experience

## Your Domain

You own the **room inventory**, **search/availability**, and the **guest-facing booking flow**.
Guests browse rooms, check availability by date, and make reservations through your pages.

---

## Task 1: Hotel API

**File:** `server/api/hotels/index.get.ts`
- List all hotels with room count

**File:** `server/api/hotels/[id].get.ts`
- Single hotel with all rooms (include current room status)

**File:** `server/api/admin/hotels/index.post.ts`
- Create hotel (name, city, country). Admin only (enforced by Dev 1's middleware).

**File:** `server/api/admin/hotels/[id].put.ts`
- Update hotel details

**File:** `server/api/admin/hotels/[id].delete.ts`
- Delete hotel (only if no active bookings)

---

## Task 2: Room API

**File:** `server/api/rooms/index.get.ts`
- List rooms (optionally filter by `hotelId` query param)

**File:** `server/api/rooms/[id].get.ts`
- Single room with hotel info

**File:** `server/api/admin/rooms/index.post.ts`
- Create room (roomNumber, type, capacity, priceOffPeak, pricePeak, hotelId)

**File:** `server/api/admin/rooms/[id].put.ts`
- Update room details (type, capacity, prices)
- Managers can also edit via `/api/manager/rooms/[id].put.ts`

---

## Task 3: Room Search & Availability API

**File:** `server/api/rooms/search.get.ts`

The most complex query in the app. Accepts query params:

| Param | Type | Description |
|-------|------|-------------|
| `checkIn` | ISO date | Check-in date |
| `checkOut` | ISO date | Check-out date |
| `hotelId` | number | Optional: filter by hotel |
| `city` | string | Optional: filter by city |
| `type` | RoomType | Optional: filter by room type |
| `capacity` | number | Optional: minimum capacity |
| `minPrice` | number | Optional: minimum price |
| `maxPrice` | number | Optional: maximum price |

**Logic:**

1. Start with all `AVAILABLE` rooms matching filters
2. Find rooms that are booked during the requested date range:

```ts
const conflictingBookings = await prisma.bookingRoom.findMany({
  where: {
    booking: {
      status: { notIn: ['CANCELLED'] },
      AND: [
        { checkIn: { lt: new Date(checkOut) } },
        { checkOut: { gt: new Date(checkIn) } },
      ],
    },
  },
  select: { roomId: true },
})

const bookedRoomIds = conflictingBookings.map(b => b.roomId)
```

3. Exclude booked rooms from results
4. Return available rooms with hotel info and pricing

---

## Task 4: Guest Booking API — Create

**File:** `server/api/bookings/index.post.ts`

Accepts:
```json
{
  "checkIn": "2026-06-01",
  "checkOut": "2026-06-04",
  "roomIds": [1, 2],
  "services": [{ "service": "BREAKFAST", "quantity": 2 }]
}
```

**Logic:**

1. Validate dates (checkOut > checkIn, no past dates)
2. Verify all rooms exist and are `AVAILABLE`
3. Double-check no conflicting bookings exist (race condition guard)
4. Determine pricing: for each booking day, decide if peak or off-peak.
   - **Peak season heuristic**: June–August, December 20–January 5 = peak. Everything else = off-peak.
   - Apply the room's `priceOffPeak` or `pricePeak` per night accordingly.
5. Create `Booking` with status `CONFIRMED`
6. Create `BookingRoom` entries with `priceAtBooking` (the determined nightly rate)
7. Create `BookingService` entries with fixed prices:
   - AIRPORT_TRANSFER = £50, BREAKFAST = £20, SPA_ACCESS = £35, LATE_CHECKOUT = £40
8. Update room statuses to `OCCUPIED`
9. Create `AuditLog` entry
10. Return booking with included relations

---

## Task 5: Guest Booking API — Read

**File:** `server/api/bookings/index.get.ts`
- List current user's bookings (guestId from session)
- Include rooms, services, invoice
- Order by checkIn descending

**File:** `server/api/bookings/[id].get.ts`
- Single booking detail (verify it belongs to the session user OR user is STAFF+)

---

## Task 6: Guest Booking API — Modify & Cancel

**File:** `server/api/bookings/[id].put.ts`
- Allow guest to modify booking dates (only if > 48h before check-in)
- If dates change, re-check room availability and update `priceAtBooking`
- Update `AuditLog`

**File:** `server/api/bookings/[id]/cancel.put.ts`
- Cancel booking (guest or staff)
- Calculate cancellation fee (see pricing rules below)
- Set `Booking.status = CANCELLED`, `cancelledAt = now()`
- Set all booking rooms' actual rooms back to `AVAILABLE`
- Create `Invoice` for cancellation fee
- Update `AuditLog`

**Cancellation fee rules** (from spec):

```ts
// server/utils/billing.ts
export function calculateCancellationFee(
  checkIn: Date,
  cancelledAt: Date,
  firstNightPrice: number,
  totalBookingValue: number,
): number {
  const daysUntilCheckIn = Math.ceil(
    (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilCheckIn > 14) return 0                                    // Free
  if (daysUntilCheckIn >= 3) return firstNightPrice * 0.5                // 50% of first night
  if (daysUntilCheckIn > 0) return firstNightPrice                       // 100% of first night
  return totalBookingValue                                                // No-show: 100% total
}
```

---

## Task 7: Seed Data

**File:** `server/seed.ts`

Create a script that populates the database with mock data:

**Hotels:**
- The Grand London (London, UK)
- Le Parisien (Paris, France)
- New York Tower (New York, USA)

**Rooms per hotel** (at least 5 each, mix of types):

| Hotel | Standard Double | Deluxe King | Family Suite | Penthouse |
|-------|:---:|:---:|:---:|:---:|
| The Grand London | 4 | 3 | 2 | 1 |
| Le Parisien | 5 | 3 | 2 | 1 |
| New York Tower | 6 | 4 | 3 | 1 |

**Users:**
- 1 Admin: `admin@hms.com` / `Admin@123`
- 1 Manager per hotel: `manager.london@hms.com` / `Manager@123`
- 2 Staff per hotel: `staff1.london@hms.com` / `Staff@123`
- 3 Guests: `guest1@example.com` / `Guest@123`

**Sample bookings:** 2-3 existing bookings so the staff dashboard has data

Run via: `bunx tsx server/seed.ts`

---

## Task 8: Homepage — Room Search

**File:** `app/pages/index.vue`

Room search landing page:

- Search form with fields: location (city dropdown), check-in date, check-out date, guests (capacity), room type (optional)
- Disabled past dates in date picker
- Search results grid using `RoomCard` component
- Each card shows: room type, hotel name, price per night, capacity, photo placeholder (Nuxt Image)
- "Book" button on each available room → opens booking form

**Use Nuxt UI components:** `UInput`, `USelectMenu` (for type dropdown), `UButton`, `UChip` (for room type badge)

---

## Task 9: Room Components

**File:** `app/components/room/RoomCard.vue`
- Props: `room`, `hotel`
- Displays: hotel name, room type badge, room number, capacity icon, price, status badge
- `@click` emits or links to room detail

**File:** `app/components/room/RoomList.vue`
- Props: `rooms[]`
- Responsive grid layout
- Empty state: "No rooms match your search"

---

## Task 10: Hotel & Room Detail Pages

**File:** `app/pages/hotels/[id].vue`
- Hotel name, city, country header
- List of rooms grouped by type
- Each room shows status and price

**File:** `app/pages/rooms/[id].vue`
- Full room details: type, capacity, hotel, prices (peak/off-peak)
- Room status badge
- "Check Availability" date selector + "Book Now" button

---

## Task 11: Guest Booking Flow

**File:** `app/pages/guest/bookings.vue`
- List of user's bookings (upcoming and past tabs)
- Each booking card shows: hotel, dates, rooms, total cost, status badge
- Cancel button (with confirmation modal) for upcoming bookings
- Link to invoice

**File:** `app/pages/guest/bookings/[id].vue`
- Full booking detail: dates, rooms, services, cost breakdown
- Status timeline (Confirmed → Checked In → Checked Out)
- Cancel button (if applicable)

**File:** `app/components/booking/BookingForm.vue`
- Props: `room` (the room being booked)
- Date range selector (check-in, check-out)
- Guest count selector
- Optional: add services (checkboxes for breakfast, airport transfer, spa)
- Price summary (calculated in real-time as user changes dates/services)
- "Confirm Booking" button → calls `/api/bookings` POST
- On success: redirect to booking detail page

---

## Task 12: Admin Hotel/Room Management Pages

**File:** `app/pages/admin/hotels.vue`
- Table of hotels
- "Add Hotel" button → modal form (name, city, country)
- Edit/Delete row actions

**File:** `app/pages/admin/hotels/[id].vue`
- Hotel edit form
- Room list for this hotel with edit links

**File:** `app/pages/admin/rooms.vue`
- Filterable table of all rooms across all hotels
- "Add Room" button → modal (select hotel, type, room number, capacity, prices)

**File:** `app/pages/admin/rooms/[id].vue`
- Room edit form

---

## Task 13: Write Tests

### Unit tests (`test/unit/`)

| Test file | What to test |
|-----------|-------------|
| `room-availability.test.ts` | Mock dates, verify conflicting bookings are correctly excluded from search results |
| `peak-pricing.test.ts` | June should be peak, April should be off-peak. Dec 25 should be peak. |
| `cancellation-fee.test.ts` | >14 days → 0, 10 days → 50%, 2 days → 100%, same day → 100% of first night, no-show (after checkin) → 100% of total |
| `booking-create.test.ts` | Valid booking creates, invalid dates rejected, room conflict rejected |

### Component tests (`test/nuxt/`)

| Test file | What to test |
|-----------|-------------|
| `room-card.test.ts` | Renders room type, hotel name, price correctly |
| `booking-form.test.ts` | Form renders, date validation, price calculation displayed |
| `search-form.test.ts` | Renders all filter fields, submit button |

---

## Dependencies on Other Devs

- **Dev 1**: Auth middleware must be working (your `/api/admin/*` routes depend on it, your pages need `useUserSession()`)
- **Dev 3**: Depends on your bookings existing so they can implement check-in/check-out. Coordinate on the `Booking` and `BookingRoom` models — you create them, they update their status.

---

## Acceptance Criteria

- [ ] Guest can search rooms by city, dates, capacity, and type
- [ ] Available rooms exclude conflicting bookings (test with overlapping dates)
- [ ] Peak/off-peak pricing applied correctly per date
- [ ] Guest can create a booking with multiple rooms and optional services
- [ ] Guest can view their bookings with status and cost
- [ ] Guest can cancel bookings (with correct fee calculation)
- [ ] Admin can CRUD hotels and rooms
- [ ] Seed script populates 3 hotels, 15+ rooms, sample users and bookings
- [ ] All pages use Nuxt UI components and responsive layout
- [ ] All unit tests pass, component tests pass
