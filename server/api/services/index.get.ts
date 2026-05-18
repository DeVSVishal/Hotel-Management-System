export default defineEventHandler(() => {
  return {
    services: [
      { type: 'AIRPORT_TRANSFER', label: 'Airport Transfer', price: 50, unit: 'per trip' },
      { type: 'BREAKFAST', label: 'Breakfast', price: 20, unit: 'per person, per day' },
      { type: 'SPA_ACCESS', label: 'Spa Access', price: 35, unit: 'per person, per day' },
      { type: 'LATE_CHECKOUT', label: 'Late Checkout (until 2 PM)', price: 40, unit: 'flat' },
    ],
  }
})
