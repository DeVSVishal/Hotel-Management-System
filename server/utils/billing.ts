export function calculateCancellationFee(
  checkIn: Date,
  cancelledAt: Date,
  firstNightPrice: number,
  totalBookingValue: number,
): number {
  const daysUntilCheckIn = Math.ceil(
    (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (daysUntilCheckIn > 14) return 0
  if (daysUntilCheckIn >= 3) return Math.round(firstNightPrice * 0.5 * 100) / 100
  if (daysUntilCheckIn > 0) return firstNightPrice
  return totalBookingValue
}

interface InvoiceBooking {
  bookingRooms: { priceAtBooking: number }[]
  services: { price: number; quantity: number }[]
  checkIn: Date
  checkOut: Date
}

export function calculateInvoiceTotal(booking: InvoiceBooking): number {
  const nights = Math.ceil(
    (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24),
  )

  const roomsTotal = booking.bookingRooms.reduce(
    (sum, br) => sum + br.priceAtBooking * nights,
    0,
  )

  const servicesTotal = booking.services.reduce(
    (sum, s) => sum + s.price * s.quantity,
    0,
  )

  return Math.round((roomsTotal + servicesTotal) * 100) / 100
}

export function isPeakSeason(date: Date): boolean {
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (month >= 6 && month <= 8) return true
  if (month === 12 && day >= 20) return true
  if (month === 1 && day <= 5) return true
  return false
}

export function getNightlyRate(priceOffPeak: number, pricePeak: number, date: Date): number {
  return isPeakSeason(date) ? pricePeak : priceOffPeak
}
