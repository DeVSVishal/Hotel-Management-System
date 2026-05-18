<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id)

const { data, pending, error } = await useFetch(() => `/api/bookings/${id.value}/invoice`)
const invoice = computed(() => data.value?.invoice ?? null)

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString() : ''
}

function printPage() {
  if (typeof window !== 'undefined') window.print()
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-4 print:hidden">
      <UButton variant="ghost" size="sm" icon="i-lucide-arrow-left" :to="`/guest/bookings/${id}`">Back</UButton>
      <UButton color="neutral" icon="i-lucide-printer" @click="printPage">Print</UButton>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UAlert v-else-if="error" color="error" variant="subtle" :title="(error as any)?.data?.message ?? 'Failed to load invoice'" />

    <div v-else-if="invoice" class="bg-(--ui-bg) border border-(--ui-border) rounded-lg p-6 print:border-0">
      <div class="flex justify-between items-start mb-6 pb-4 border-b border-(--ui-border)">
        <div>
          <h1 class="text-2xl font-bold">Invoice</h1>
          <div class="text-sm text-muted">Booking #{{ invoice.bookingId }}</div>
          <div v-if="invoice.id" class="text-sm text-muted">Invoice #{{ invoice.id }}</div>
        </div>
        <div class="text-right">
          <div class="font-semibold">{{ invoice.hotel?.name }}</div>
          <div class="text-sm text-muted">{{ invoice.hotel?.city }}, {{ invoice.hotel?.country }}</div>
          <UBadge :color="invoice.paid ? 'success' : 'warning'" variant="subtle" class="mt-2">
            {{ invoice.paid ? 'PAID' : 'UNPAID' }}
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div class="text-xs text-muted uppercase">Bill to</div>
          <div class="font-medium">{{ invoice.guest?.name }}</div>
          <div class="text-sm">{{ invoice.guest?.email }}</div>
        </div>
        <div>
          <div class="text-xs text-muted uppercase">Stay</div>
          <div class="text-sm">{{ fmtDate(invoice.checkIn) }} → {{ fmtDate(invoice.checkOut) }}</div>
          <div class="text-sm">{{ invoice.nights }} night{{ invoice.nights !== 1 ? 's' : '' }}</div>
          <div v-if="invoice.issuedAt" class="text-xs text-muted mt-1">Issued {{ fmtDate(invoice.issuedAt) }}</div>
          <div v-if="invoice.paidAt" class="text-xs text-muted">Paid {{ fmtDate(invoice.paidAt) }}</div>
        </div>
      </div>

      <div class="mb-4">
        <h2 class="text-sm font-semibold mb-2">Rooms</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-muted text-xs border-b border-(--ui-border)">
              <th class="text-left py-1">Room</th>
              <th class="text-left py-1">Type</th>
              <th class="text-right py-1">£/night</th>
              <th class="text-right py-1">Nights</th>
              <th class="text-right py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in invoice.roomLines" :key="r.roomId" class="border-b border-(--ui-border)">
              <td class="py-2">{{ r.roomNumber }}</td>
              <td class="py-2">{{ r.type.replace(/_/g, ' ') }}</td>
              <td class="py-2 text-right">£{{ r.nightlyRate }}</td>
              <td class="py-2 text-right">{{ r.nights }}</td>
              <td class="py-2 text-right">£{{ r.subtotal }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="invoice.serviceLines.length > 0" class="mb-4">
        <h2 class="text-sm font-semibold mb-2">Services</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-muted text-xs border-b border-(--ui-border)">
              <th class="text-left py-1">Service</th>
              <th class="text-right py-1">Qty</th>
              <th class="text-right py-1">Price</th>
              <th class="text-right py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in invoice.serviceLines" :key="s.id" class="border-b border-(--ui-border)">
              <td class="py-2">{{ s.service.replace(/_/g, ' ') }}</td>
              <td class="py-2 text-right">{{ s.quantity }}</td>
              <td class="py-2 text-right">£{{ s.price }}</td>
              <td class="py-2 text-right">£{{ s.subtotal }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="border-t-2 border-(--ui-border) pt-3">
        <div class="flex justify-between text-sm">
          <span class="text-muted">Rooms subtotal</span>
          <span>£{{ invoice.roomsTotal }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted">Services subtotal</span>
          <span>£{{ invoice.servicesTotal }}</span>
        </div>
        <div class="flex justify-between text-xl font-bold pt-3 mt-2 border-t border-(--ui-border)">
          <span>Total</span>
          <span>£{{ invoice.total }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  @page { margin: 1.5cm; }
  body { background: white !important; color: black !important; }
}
</style>
