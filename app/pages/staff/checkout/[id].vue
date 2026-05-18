<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['STAFF', 'MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

const route = useRoute()
const id = computed(() => route.params.id)

const { data: invData, pending, refresh, error } = await useFetch(() => `/api/bookings/${id.value}/invoice`)
const invoice = computed(() => invData.value?.invoice ?? null)

const saving = ref(false)
const checkedOut = ref(false)
const generatedInvoice = ref<any>(null)
const errorMsg = ref('')

async function doCheckOut() {
  saving.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch(`/api/staff/bookings/${id.value}/checkout`, { method: 'PUT' })
    checkedOut.value = true
    generatedInvoice.value = res.invoice
    refresh()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Check-out failed'
  } finally {
    saving.value = false
  }
}

async function markPaid() {
  if (!generatedInvoice.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch(`/api/invoices/${generatedInvoice.value.id}/pay`, { method: 'PUT' })
    generatedInvoice.value = res.invoice
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Failed to mark paid'
  } finally {
    saving.value = false
  }
}

function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString() : ''
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-center justify-between flex-wrap gap-2">
      <div>
        <NuxtLink to="/staff/dashboard" class="text-xs text-(--ui-text-muted) hover:underline">← Dashboard</NuxtLink>
        <h1 class="text-2xl font-bold mt-1">Check out</h1>
      </div>
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UAlert v-else-if="error" color="error" variant="subtle" :title="(error as any)?.data?.message ?? 'Failed to load booking'" />

    <div v-else-if="invoice">
      <!-- ===================================================
                            Booking summary
           =================================================== -->
      <section class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider">Booking #{{ invoice.bookingId }}</h2>
          <UBadge :color="invoice.status === 'CHECKED_IN' ? 'success' : 'neutral'" variant="subtle">{{ invoice.status.replace('_', ' ') }}</UBadge>
        </div>
        <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated)">
          <dl class="divide-y divide-(--ui-border) text-sm">
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Guest</dt>
              <dd>
                <div class="font-medium">{{ invoice.guest?.name }}</div>
                <div class="text-xs text-(--ui-text-muted)">{{ invoice.guest?.email }}</div>
              </dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Dates</dt>
              <dd>{{ fmtDate(invoice.checkIn) }} → {{ fmtDate(invoice.checkOut) }} ({{ invoice.nights }} night{{ invoice.nights !== 1 ? 's' : '' }})</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- ===================================================
                          Invoice preview
           =================================================== -->
      <section class="mb-6">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Rooms</h2>
        <div class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Room</th>
                <th class="text-left px-4 py-2 font-medium">Type</th>
                <th class="text-right px-4 py-2 font-medium">£/night</th>
                <th class="text-right px-4 py-2 font-medium">Nights</th>
                <th class="text-right px-4 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="r in invoice.roomLines" :key="r.roomId">
                <td class="px-4 py-2 font-mono">{{ r.roomNumber }}</td>
                <td class="px-4 py-2">{{ r.type.replace(/_/g, ' ') }}</td>
                <td class="px-4 py-2 text-right">£{{ r.nightlyRate }}</td>
                <td class="px-4 py-2 text-right">{{ r.nights }}</td>
                <td class="px-4 py-2 text-right font-medium">£{{ r.subtotal }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="invoice.serviceLines.length > 0" class="mb-6">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Services</h2>
        <div class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Service</th>
                <th class="text-right px-4 py-2 font-medium">Qty</th>
                <th class="text-right px-4 py-2 font-medium">Price</th>
                <th class="text-right px-4 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="s in invoice.serviceLines" :key="s.id">
                <td class="px-4 py-2">{{ s.service.replace(/_/g, ' ') }}</td>
                <td class="px-4 py-2 text-right">{{ s.quantity }}</td>
                <td class="px-4 py-2 text-right">£{{ s.price }}</td>
                <td class="px-4 py-2 text-right font-medium">£{{ s.subtotal }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================
                            Totals
           =================================================== -->
      <section class="mb-6">
        <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4 text-sm">
          <div class="flex justify-between pb-2 border-b border-(--ui-border)">
            <span class="text-(--ui-text-muted)">Rooms subtotal</span>
            <span>£{{ invoice.roomsTotal }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-(--ui-border)">
            <span class="text-(--ui-text-muted)">Services subtotal</span>
            <span>£{{ invoice.servicesTotal }}</span>
          </div>
          <div class="flex justify-between pt-2 font-bold text-lg">
            <span>Total</span>
            <span class="text-(--ui-primary)">£{{ invoice.total }}</span>
          </div>
        </div>
      </section>

      <UAlert v-if="errorMsg" color="error" variant="subtle" :title="errorMsg" class="mb-4" />

      <div v-if="!checkedOut && invoice.status === 'CHECKED_IN'" class="flex justify-end gap-2">
        <UButton variant="outline" color="neutral" to="/staff/dashboard">Cancel</UButton>
        <UButton color="primary" icon="i-lucide-check-circle" :loading="saving" @click="doCheckOut">Process check-out</UButton>
      </div>

      <div v-else-if="checkedOut">
        <UAlert
          color="success"
          variant="subtle"
          title="Check-out complete"
          :description="`Invoice #${generatedInvoice?.id} generated for £${generatedInvoice?.totalAmount}`"
          class="mb-3"
        />
        <div class="flex justify-end gap-2 items-center">
          <UBadge v-if="generatedInvoice?.paid" color="success" variant="solid">PAID</UBadge>
          <UButton v-else color="primary" icon="i-lucide-credit-card" :loading="saving" @click="markPaid">Mark paid</UButton>
          <UButton variant="outline" color="neutral" to="/staff/dashboard">Done</UButton>
        </div>
      </div>

      <UAlert
        v-else
        color="warning"
        variant="subtle"
        :title="`Cannot check out — booking is ${invoice.status}`"
      />
    </div>
  </div>
</template>
