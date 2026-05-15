import { PrismaClient } from './generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

const scrypt = new Scrypt({})

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./dev.db',
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const hotels = await Promise.all([
    prisma.hotel.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Grand London Hotel', city: 'London', country: 'UK' },
    }),
    prisma.hotel.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: 'Paris Luxe Suites', city: 'Paris', country: 'France' },
    }),
    prisma.hotel.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, name: 'New York Skyline Inn', city: 'New York', country: 'USA' },
    }),
  ])
  console.log(`Hotels: ${hotels.length}`)

  const roomTypes: { type: string; capacity: number; priceOffPeak: number; pricePeak: number }[] = [
    { type: 'STANDARD_DOUBLE', capacity: 2, priceOffPeak: 120, pricePeak: 180 },
    { type: 'DELUXE_KING', capacity: 2, priceOffPeak: 180, pricePeak: 250 },
    { type: 'FAMILY_SUITE', capacity: 4, priceOffPeak: 240, pricePeak: 320 },
    { type: 'PENTHOUSE', capacity: 4, priceOffPeak: 500, pricePeak: 750 },
  ]

  let roomCount = 0
  for (const hotel of hotels) {
    for (const rt of roomTypes) {
      const room = await prisma.room.upsert({
        where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: `${hotel.id}${rt.type[0]}01` } },
        update: {},
        create: {
          hotelId: hotel.id,
          roomNumber: `${hotel.id}${rt.type[0]}01`,
          type: rt.type as any,
          capacity: rt.capacity,
          priceOffPeak: rt.priceOffPeak,
          pricePeak: rt.pricePeak,
        },
      })
      roomCount++
    }
  }
  console.log(`Rooms: ${roomCount}`)

  const passwordAdmin = await scrypt.make('Admin123!')
  const passwordManager = await scrypt.make('Manager1!')
  const passwordStaff = await scrypt.make('Staff123!')
  const passwordGuest = await scrypt.make('Guest123!')

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@admin.com' },
      update: {},
      create: {
        email: 'admin@admin.com',
        passwordHash: passwordAdmin,
        name: 'Admin User',
        role: 'ADMIN',
        passwordChangedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@manager.com' },
      update: {},
      create: {
        email: 'manager@manager.com',
        passwordHash: passwordManager,
        name: 'Hotel Manager',
        role: 'MANAGER',
        hotelId: 2,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: 'staff@staff.com' },
      update: {},
      create: {
        email: 'staff@staff.com',
        passwordHash: passwordStaff,
        name: 'Front Desk Staff',
        role: 'STAFF',
        hotelId: 1,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: 'guest@guest.com' },
      update: {},
      create: {
        email: 'guest@guest.com',
        passwordHash: passwordGuest,
        name: 'Test Guest',
        role: 'GUEST',
        passwordChangedAt: new Date(),
      },
    }),
  ])
  console.log(`Users: ${users.length}`)

  console.log('\nTest accounts:')
  console.log('  admin@admin.com / Admin123!  (ADMIN)')
  console.log('  manager@manager.com / Manager1!  (MANAGER)')
  console.log('  staff@staff.com / Staff123!     (STAFF)')
  console.log('  guest@guest.com / Guest123!    (GUEST)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
