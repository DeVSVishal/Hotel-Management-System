import { PrismaClient } from './generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

const scrypt = new Scrypt({})

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./dev.db',
})
const prisma = new PrismaClient({ adapter })

/* =======================================================
        Date / pricing helpers
   ======================================================= */
function daysFromToday(offset: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function isPeak(date: Date): boolean {
  const m = date.getMonth() + 1
  const day = date.getDate()
  if (m >= 6 && m <= 8) return true
  if (m === 12 && day >= 20) return true
  if (m === 1 && day <= 5) return true
  return false
}

function averageNightlyRate(priceOffPeak: number, pricePeak: number, checkIn: Date, checkOut: Date): number {
  let total = 0
  let nights = 0
  const cursor = new Date(checkIn)
  while (cursor < checkOut) {
    total += isPeak(cursor) ? pricePeak : priceOffPeak
    nights++
    cursor.setDate(cursor.getDate() + 1)
  }
  return nights > 0 ? Math.round((total / nights) * 100) / 100 : priceOffPeak
}

const SERVICE_PRICES: Record<string, number> = {
  AIRPORT_TRANSFER: 50,
  BREAKFAST: 20,
  SPA_ACCESS: 35,
  LATE_CHECKOUT: 40,
}

async function main() {
  console.log('Resetting database...')

  /* =======================================================
        Wipe + reset SQLite autoincrement
   ======================================================= */
  await prisma.auditLog.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.bookingService.deleteMany()
  await prisma.bookingRoom.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.room.deleteMany()
  await prisma.user.deleteMany()
  await prisma.hotel.deleteMany()
  await prisma.$executeRawUnsafe(
    `DELETE FROM sqlite_sequence WHERE name IN ('Hotel','Room','User','Booking','BookingService','Invoice','AuditLog')`,
  )

  /* =======================================================
        Three Verdan properties
   ======================================================= */
  console.log('Seeding hotels...')
  const hotels = await Promise.all([
    prisma.hotel.create({ data: { name: 'Verdan London',   city: 'London',   country: 'UK' } }),
    prisma.hotel.create({ data: { name: 'Verdan Paris',    city: 'Paris',    country: 'France' } }),
    prisma.hotel.create({ data: { name: 'Verdan New York', city: 'New York', country: 'USA' } }),
  ])
  const LON = hotels[0]!.id
  const PAR = hotels[1]!.id
  const NY  = hotels[2]!.id

  /* =======================================================
        Rooms — 10 per hotel (4S + 3D + 2F + 1P) = 30 total
   ======================================================= */
  console.log('Seeding rooms...')
  const blueprints = [
    { type: 'STANDARD_DOUBLE' as const, count: 4, capacity: 2, priceOffPeak: 120, pricePeak: 180, prefix: 'S' },
    { type: 'DELUXE_KING' as const,     count: 3, capacity: 2, priceOffPeak: 180, pricePeak: 250, prefix: 'D' },
    { type: 'FAMILY_SUITE' as const,    count: 2, capacity: 4, priceOffPeak: 240, pricePeak: 320, prefix: 'F' },
    { type: 'PENTHOUSE' as const,       count: 1, capacity: 4, priceOffPeak: 500, pricePeak: 750, prefix: 'P' },
  ]

  type RoomRow = { id: number; hotelId: number; type: string; priceOffPeak: number; pricePeak: number; roomNumber: string }
  const rooms: RoomRow[] = []
  for (const hotel of hotels) {
    for (const bp of blueprints) {
      for (let n = 1; n <= bp.count; n++) {
        const roomNumber = `${hotel.id}${bp.prefix}${String(n).padStart(2, '0')}`
        const r = await prisma.room.create({
          data: {
            hotelId: hotel.id, roomNumber, type: bp.type, capacity: bp.capacity,
            priceOffPeak: bp.priceOffPeak, pricePeak: bp.pricePeak, status: 'AVAILABLE',
          },
        })
        rooms.push({ id: r.id, hotelId: r.hotelId, type: r.type, priceOffPeak: r.priceOffPeak, pricePeak: r.pricePeak, roomNumber: r.roomNumber })
      }
    }
  }
  console.log(`  ${rooms.length} rooms across ${hotels.length} hotels`)

  /* =======================================================
        Room status variety — OOS in London, cleaning in Paris
   ======================================================= */
  const oosLondon = rooms.find(r => r.hotelId === LON && r.roomNumber.endsWith('D03'))
  const cleaningParis = rooms.find(r => r.hotelId === PAR && r.roomNumber.endsWith('S04'))
  if (oosLondon)    await prisma.room.update({ where: { id: oosLondon.id },    data: { status: 'OUT_OF_SERVICE' } })
  if (cleaningParis) await prisma.room.update({ where: { id: cleaningParis.id }, data: { status: 'CLEANING' } })

  /* =======================================================
        Users — 1 admin, 3 managers, 9 staff, 5 guests
   ======================================================= */
  console.log('Seeding users...')
  const hashAdmin   = await scrypt.make('Admin123!')
  const hashManager = await scrypt.make('Manager123!')
  const hashStaff   = await scrypt.make('Staff123!')
  const hashGuest   = await scrypt.make('Guest123!')

  const admin = await prisma.user.create({
    data: { email: 'sarah.mitchell@verdan.com', passwordHash: hashAdmin, name: 'Sarah Mitchell', role: 'ADMIN', passwordChangedAt: new Date() },
  })

  const managers = await Promise.all([
    prisma.user.create({ data: { email: 'james.anderson@verdan.com', passwordHash: hashManager, name: 'James Anderson', role: 'MANAGER', hotelId: LON, passwordChangedAt: new Date() } }),
    prisma.user.create({ data: { email: 'marie.dubois@verdan.com',   passwordHash: hashManager, name: 'Marie Dubois',   role: 'MANAGER', hotelId: PAR, passwordChangedAt: new Date() } }),
    prisma.user.create({ data: { email: 'robert.chen@verdan.com',    passwordHash: hashManager, name: 'Robert Chen',    role: 'MANAGER', hotelId: NY,  passwordChangedAt: new Date() } }),
  ])

  const staffData: { name: string; email: string; hotelId: number }[] = [
    { name: 'Emma Wilson',     email: 'emma.wilson@verdan.com',     hotelId: LON },
    { name: 'David Brown',     email: 'david.brown@verdan.com',     hotelId: LON },
    { name: 'Sophia Taylor',   email: 'sophia.taylor@verdan.com',   hotelId: LON },
    { name: 'Lucas Martin',    email: 'lucas.martin@verdan.com',    hotelId: PAR },
    { name: 'Camille Leroy',   email: 'camille.leroy@verdan.com',   hotelId: PAR },
    { name: 'Antoine Bernard', email: 'antoine.bernard@verdan.com', hotelId: PAR },
    { name: 'Jessica Lee',     email: 'jessica.lee@verdan.com',     hotelId: NY  },
    { name: 'Michael Garcia',  email: 'michael.garcia@verdan.com',  hotelId: NY  },
    { name: 'Olivia Williams', email: 'olivia.williams@verdan.com', hotelId: NY  },
  ]
  const staff = await Promise.all(staffData.map(s =>
    prisma.user.create({ data: { email: s.email, passwordHash: hashStaff, name: s.name, role: 'STAFF', hotelId: s.hotelId, passwordChangedAt: new Date() } })
  ))

  const guestData: { name: string; email: string; phone: string }[] = [
    { name: 'John Smith',       email: 'john.smith@gmail.com',       phone: '+44 20 7946 0001' },
    { name: 'Linda Johnson',    email: 'linda.johnson@gmail.com',    phone: '+1 212 555 0010' },
    { name: 'Carlos Hernandez', email: 'carlos.hernandez@gmail.com', phone: '+34 91 555 0020' },
    { name: 'Aisha Patel',      email: 'aisha.patel@gmail.com',      phone: '+44 20 7946 0030' },
    { name: 'Tom O\'Brien',     email: 'tom.obrien@gmail.com',       phone: '+353 1 555 0040' },
  ]
  const guests = await Promise.all(guestData.map(g =>
    prisma.user.create({ data: { email: g.email, phone: g.phone, passwordHash: hashGuest, name: g.name, role: 'GUEST', passwordChangedAt: new Date() } })
  ))

  console.log(`  ${1 + managers.length + staff.length + guests.length} users`)
  void admin

  /* =======================================================
        Bookings — variety of statuses for testing:
        CHECKED_OUT (paid + unpaid), CONFIRMED (future +
        today's arrival), CHECKED_IN (current + today's
        departure), CANCELLED (with fee invoice).
   ======================================================= */
  console.log('Seeding bookings...')
  type Sb = {
    guest: typeof guests[number]
    hotelId: number
    roomType: string
    checkInOffset: number
    nights: number
    status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
    services?: { service: string; quantity: number }[]
    invoicePaid?: boolean
  }

  const seedBookings: Sb[] = [
    /* ---- John Smith: past paid + upcoming next week + peak summer ---- */
    { guest: guests[0]!, hotelId: LON, roomType: 'STANDARD_DOUBLE', checkInOffset: -40, nights: 3, status: 'CHECKED_OUT', services: [{ service: 'BREAKFAST', quantity: 3 }], invoicePaid: true },
    { guest: guests[0]!, hotelId: PAR, roomType: 'DELUXE_KING',     checkInOffset:   6, nights: 3, status: 'CONFIRMED',   services: [{ service: 'BREAKFAST', quantity: 3 }] },
    { guest: guests[0]!, hotelId: NY,  roomType: 'PENTHOUSE',       checkInOffset:  62, nights: 5, status: 'CONFIRMED' },

    /* ---- Linda Johnson: currently checked in at London ---- */
    { guest: guests[1]!, hotelId: LON, roomType: 'FAMILY_SUITE',    checkInOffset:  -1, nights: 4, status: 'CHECKED_IN',  services: [{ service: 'BREAKFAST', quantity: 4 }, { service: 'SPA_ACCESS', quantity: 2 }] },

    /* ---- Carlos Hernandez: arriving today + earlier cancellation ---- */
    { guest: guests[2]!, hotelId: LON, roomType: 'STANDARD_DOUBLE', checkInOffset:   0, nights: 2, status: 'CONFIRMED',   services: [{ service: 'AIRPORT_TRANSFER', quantity: 1 }] },
    { guest: guests[2]!, hotelId: NY,  roomType: 'DELUXE_KING',     checkInOffset:  -9, nights: 2, status: 'CANCELLED' },

    /* ---- Aisha Patel: past penthouse + far-future peak booking ---- */
    { guest: guests[3]!, hotelId: NY,  roomType: 'PENTHOUSE',       checkInOffset: -65, nights: 3, status: 'CHECKED_OUT', services: [{ service: 'AIRPORT_TRANSFER', quantity: 2 }], invoicePaid: true },
    { guest: guests[3]!, hotelId: PAR, roomType: 'FAMILY_SUITE',    checkInOffset:  52, nights: 7, status: 'CONFIRMED',   services: [{ service: 'LATE_CHECKOUT', quantity: 1 }] },

    /* ---- Tom O'Brien: pending unpaid checkout + today's departure ---- */
    { guest: guests[4]!, hotelId: PAR, roomType: 'DELUXE_KING',     checkInOffset: -24, nights: 3, status: 'CHECKED_OUT', services: [{ service: 'BREAKFAST', quantity: 6 }], invoicePaid: false },
    { guest: guests[4]!, hotelId: LON, roomType: 'STANDARD_DOUBLE', checkInOffset:  -2, nights: 2, status: 'CHECKED_IN' },
  ]

  /* =======================================================
        Avoid date overlap conflicts when picking rooms.
   ======================================================= */
  const usedKeys = new Set<string>()
  function reserveRoom(hotelId: number, type: string, checkIn: Date, checkOut: Date): RoomRow | undefined {
    for (const r of rooms.filter(rr => rr.hotelId === hotelId && rr.type === type)) {
      let conflict = false
      const cursor = new Date(checkIn)
      while (cursor < checkOut) {
        const key = `${r.id}|${cursor.toISOString().slice(0, 10)}`
        if (usedKeys.has(key)) { conflict = true; break }
        cursor.setDate(cursor.getDate() + 1)
      }
      if (!conflict) {
        const c2 = new Date(checkIn)
        while (c2 < checkOut) {
          usedKeys.add(`${r.id}|${c2.toISOString().slice(0, 10)}`)
          c2.setDate(c2.getDate() + 1)
        }
        return r
      }
    }
    return undefined
  }

  const staffOfHotel = (hotelId: number) => staff.find(s => s.hotelId === hotelId) ?? staff[0]!

  let bookingCount = 0
  for (const sb of seedBookings) {
    const checkIn = daysFromToday(sb.checkInOffset)
    const checkOut = daysFromToday(sb.checkInOffset + sb.nights)
    const room = reserveRoom(sb.hotelId, sb.roomType, checkIn, checkOut)
    if (!room) {
      console.warn(`  skipped: no ${sb.roomType} room available in hotel ${sb.hotelId}`)
      continue
    }

    const nightlyRate = averageNightlyRate(room.priceOffPeak, room.pricePeak, checkIn, checkOut)
    const svcTotal = (sb.services ?? []).reduce((s, x) => s + SERVICE_PRICES[x.service]! * x.quantity, 0)
    const totalAmount = Math.round((nightlyRate * sb.nights + svcTotal) * 100) / 100

    const booking = await prisma.booking.create({
      data: {
        guestId: sb.guest.id,
        checkIn, checkOut,
        status: sb.status,
        cancelledAt: sb.status === 'CANCELLED' ? new Date(checkIn.getTime() - 4 * 86400000) : null,
        bookingRooms: { create: { roomId: room.id, priceAtBooking: nightlyRate } },
        services: { create: (sb.services ?? []).map(s => ({ service: s.service as any, quantity: s.quantity, price: SERVICE_PRICES[s.service]! })) },
      },
    })
    bookingCount++

    if (sb.status === 'CHECKED_OUT') {
      await prisma.invoice.create({
        data: {
          bookingId: booking.id,
          totalAmount,
          paid: !!sb.invoicePaid,
          issuedAt: checkOut,
          paidAt: sb.invoicePaid ? checkOut : null,
        },
      })
    } else if (sb.status === 'CHECKED_IN') {
      await prisma.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } })
    } else if (sb.status === 'CANCELLED') {
      const fee = Math.round(nightlyRate * 0.5 * 100) / 100
      await prisma.invoice.create({
        data: {
          bookingId: booking.id,
          totalAmount: fee,
          paid: false,
          issuedAt: new Date(checkIn.getTime() - 4 * 86400000),
        },
      })
    }

    const picker = staffOfHotel(sb.hotelId)
    await prisma.auditLog.create({
      data: { userId: sb.guest.id, action: 'BOOKING_CREATE', details: `Booking #${booking.id} (${sb.roomType})`, createdAt: new Date(Math.min(checkIn.getTime() - 7 * 86400000, Date.now() - 3600000)) },
    })
    if (sb.status === 'CHECKED_IN' || sb.status === 'CHECKED_OUT') {
      await prisma.auditLog.create({
        data: { userId: picker.id, action: 'CHECK_IN', details: `Booking #${booking.id}`, createdAt: checkIn },
      })
    }
    if (sb.status === 'CHECKED_OUT') {
      await prisma.auditLog.create({
        data: { userId: picker.id, action: 'CHECK_OUT', details: `Booking #${booking.id} (£${totalAmount})`, createdAt: checkOut },
      })
      if (sb.invoicePaid) {
        await prisma.auditLog.create({
          data: { userId: picker.id, action: 'INVOICE_PAID', details: `Booking #${booking.id}`, createdAt: checkOut },
        })
      }
    }
    if (sb.status === 'CANCELLED') {
      await prisma.auditLog.create({
        data: { userId: sb.guest.id, action: 'BOOKING_CANCEL', details: `Booking #${booking.id}`, createdAt: new Date(checkIn.getTime() - 4 * 86400000) },
      })
    }
  }
  console.log(`  ${bookingCount} bookings`)

  /* =======================================================
        Misc audit entries for realism in the admin log
   ======================================================= */
  await prisma.auditLog.create({
    data: { userId: managers[0]!.id, action: 'ROOM_RATE_CHANGE', details: `Room #${rooms[0]!.roomNumber}: off-peak £100 → £120`, createdAt: new Date(Date.now() - 86400000 * 12) },
  })
  if (oosLondon) {
    await prisma.auditLog.create({
      data: { userId: staff[0]!.id, action: 'ROOM_STATUS_CHANGE', details: `Room #${oosLondon.roomNumber}: AVAILABLE → OUT_OF_SERVICE`, createdAt: new Date(Date.now() - 86400000 * 2) },
    })
  }

  /* ---- LOGIN history for the audit log ---- */
  const loginAccounts = [...managers, ...staff.slice(0, 4), ...guests.slice(0, 3)]
  for (const u of loginAccounts) {
    await prisma.auditLog.create({
      data: { userId: u.id, action: 'LOGIN', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 48)) },
    })
  }

  console.log('\nVerdan Hotels — fresh database with realistic test data.')
  console.log('See credentials.txt for the full list of accounts.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
