<template>
  <div class="flex h-full flex-col overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <ViewBreadcrumbs routeName="Customer360" />
      </template>
      <template #right-header>
        <Button :label="__('Refresh')" :loading="customer360.loading" @click="refresh" />
      </template>
    </LayoutHeader>

    <div class="p-5 space-y-3">
      <div class="rounded-md bg-surface-white shadow px-4 py-3">
        <div class="text-sm text-ink-gray-6 mb-2">{{ __('Customer360 Search') }}</div>
        <div class="flex gap-2 items-center">
          <TextInput v-model="inputMobile" class="form-control w-72" :placeholder="__('Enter mobile number')"
            @keyup.enter="searchByMobile" />
          <Button variant="solid" :label="__('Get Report')" @click="searchByMobile" />
        </div>
      </div>

      <div v-if="activeMobile" class="rounded-md bg-surface-white shadow px-4 py-3">
        <div class="text-sm text-ink-gray-6">{{ __('Customer Number') }}</div>
        <div class="text-lg font-semibold text-ink-gray-9">{{ activeMobile }}</div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
      <div v-if="!activeMobile" class="text-ink-gray-6">
        {{ __('Enter mobile number and click Get Report.') }}
      </div>

      <DashboardGrid v-else-if="!customer360.error && dashboardItems.length" v-model="dashboardItems"
        :editing="false" />
      <!-- Leads Table -->
      <div v-if="activeMobile && leads.length"
        class="rounded-md bg-surface-white shadow overflow-hidden border border-outline-gray-modals">
        <div class="px-4 py-3 border-b border-outline-gray-modals font-semibold text-ink-gray-8">
          {{ __('Leads') }} ({{ leads.length }})
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[980px] w-full table-fixed text-sm text-ink-gray-8">
            <colgroup>
              <col class="w-[20%]" />
              <col class="w-[20%]" />
              <col class="w-[18%]" />
              <col class="w-[22%]" />
              <col class="w-[20%]" />
            </colgroup>
            <thead class="bg-surface-gray-2 text-ink-gray-7">
              <tr>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('First name') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Mobile no') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Status') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Lead owner') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Modified') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in leads" :key="row.name"
                class="border-t border-outline-gray-modals hover:bg-surface-gray-1 transition-colors">
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ safeName(row.first_name || row.lead_name) }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.mobile_no || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <Badge :label="row.status || '-'" :theme="statusTheme(row.status)" />
                </td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.lead_owner || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.modified || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Deals Table -->
      <div v-if="activeMobile && deals.length"
        class="rounded-md bg-surface-white shadow overflow-hidden border border-outline-gray-modals">
        <div class="px-4 py-3 border-b border-outline-gray-modals font-semibold text-ink-gray-8">
          {{ __('Deals') }} ({{ deals.length }})
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[980px] w-full table-fixed text-sm text-ink-gray-8">
            <colgroup>
              <col class="w-[20%]" />
              <col class="w-[20%]" />
              <col class="w-[18%]" />
              <col class="w-[22%]" />
              <col class="w-[20%]" />
            </colgroup>
            <thead class="bg-surface-gray-2 text-ink-gray-7">
              <tr>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('First name') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Mobile no') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Status') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Deal owner') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Modified') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in deals" :key="row.name"
                class="border-t border-outline-gray-modals hover:bg-surface-gray-1 transition-colors">
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ safeName(row.first_name || row.lead_name) }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.mobile_no || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <Badge :label="row.status || '-'" :theme="statusTheme(row.status)" />
                </td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.deal_owner || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.modified || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>



      <div v-if="activeMobile && callLogs.length"
        class="rounded-md bg-surface-white shadow overflow-hidden border border-outline-gray-modals">
        <div class="px-4 py-3 border-b border-outline-gray-modals font-semibold text-ink-gray-8">
          {{ __('Call Logs') }} ({{ callLogs.length }})
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[1240px] w-full table-fixed text-sm text-ink-gray-8">
            <colgroup>
              <col class="w-[17%]" />
              <col class="w-[11%]" />
              <col class="w-[12%]" />
              <col class="w-[14%]" />
              <col class="w-[14%]" />
              <col class="w-[10%]" />
              <col class="w-[14%]" />
              <col class="w-[8%]" />
            </colgroup>
            <thead class="bg-surface-gray-2 text-ink-gray-7">
              <tr>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Date') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Type') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Status') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('From') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('To') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Duration') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Agent') }}</th>
                <th class="text-left px-3 py-2 font-medium whitespace-nowrap">{{ __('Open') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in callLogs" :key="row.name"
                class="border-t border-outline-gray-modals hover:bg-surface-gray-1 transition-colors">
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.creation || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.type || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <Badge :label="row.status || '-'" :theme="statusTheme(row.status)" />
                </td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.from || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.to || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.duration_label || '0s' }}</td>
                <td class="px-3 py-2 whitespace-nowrap truncate">{{ row.agent_name || '-' }}</td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" :label="__('View')" class="!text-ink-gray-8"
                    @click="openCallLog(row.name)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      <div v-if="activeMobile && customer360.error" class="text-red-600">
        {{ __('Unable to load Customer360 data') }}
      </div>
    </div>





    <CallLogDetailModal v-model="showCallLogDetailModal" v-model:callLogModal="showCallLogModal"
      v-model:callLog="callLog" />
    <CallLogModal v-if="showCallLogModal && callLog?.data" v-model="showCallLogModal" :data="callLog.data" />

  </div>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import DashboardGrid from '@/components/Dashboard/DashboardGrid.vue'
import { Button, TextInput, Badge, createResource, usePageMeta, call, toast } from 'frappe-ui'
import { useRoute, useRouter } from 'vue-router'
import CallLogDetailModal from '@/components/Modals/CallLogDetailModal.vue'
import CallLogModal from '@/components/Modals/CallLogModal.vue'
import { computed, ref, watch, onMounted } from 'vue'
const route = useRoute()
const router = useRouter()

const inputMobile = ref('')
const dashboardItems = ref([])
const callLogs = ref([])


const showCallLogDetailModal = ref(false)
const showCallLogModal = ref(false)
const callLog = ref({ data: null })

const activeMobile = computed(() => String(route.query.mobile_no || '').trim())

function normalizeMobile(raw) {
  return String(raw || '').replace(/\D/g, '')
}


const leads = ref([])
const deals = ref([])

function unwrapCallLogPayload(response) {
  // Handles both plain return and { message: ... } wrapped return
  const level1 = response?.message ?? response ?? {}
  const level2 = level1?.message ?? level1
  return level2 || null
}


function statusTheme(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return 'gray'

  const redKeywords = [
    'lost',
    'not interest',
    'unqualified',
    'failed',
    'canceled',
    'cancelled',
    'no answer',
    'busy',
    'rejected',
  ]

  const greenKeywords = [
    'won',
    'converted',
    'completed',
    'qualified',
    'success',
    'closed won',
    'active',
  ]

  const orangeKeywords = [
    'new',
    'open',
    'qualification',
    'payment pending',
    'demo',
    'making',
    'negotiation',
    'proposal',
    'prospecting',
    'ringing',
    'initiated',
    'in progress',
  ]

  if (redKeywords.some((k) => s.includes(k))) return 'red'
  if (greenKeywords.some((k) => s.includes(k))) return 'green'
  if (orangeKeywords.some((k) => s.includes(k))) return 'orange'

  return 'blue'
}


function unwrapPayload(response) {
  const level1 = response?.message ?? response ?? {}
  const level2 = level1?.message ?? level1
  return level2 || {}
}

function layout(x, y, w, h, i) {
  return { x, y, w, h, i }
}

const customer360 = createResource({
  url: 'praveg.api.customer360.get_customer_360',
  makeParams() {
    return {
      mobile_no: activeMobile.value,
      call_log_limit: 100,
    }
  },
  onSuccess(response) {
    const payload = unwrapPayload(response)
    dashboardItems.value = buildDashboardItems(payload)
    callLogs.value = payload.call_logs || payload.recent_calls || []
    leads.value = Array.isArray(payload.leads) ? payload.leads : []
    deals.value = Array.isArray(payload.deals) ? payload.deals : []
  },
  onError() {
    dashboardItems.value = []
    callLogs.value = []
    leads.value = []
    deals.value = []
  },
})

watch(
  activeMobile,
  (value) => {
    inputMobile.value = value
    dashboardItems.value = []
    callLogs.value = []
    if (!value) return
    customer360.fetch()
  },
  { immediate: true },
)

function safeName(value) {
  const v = String(value || '').trim()
  return v || __('Unknown')
}

async function searchByMobile() {
  const mobile = normalizeMobile(inputMobile.value)
  if (!mobile) return

  await router.push({
    name: 'Customer360',
    query: { mobile_no: mobile },
  })
}

function refresh() {
  if (!activeMobile.value) return
  customer360.fetch()
}



async function openCallLog(name) {
  const docname = String(name || '').trim()
  if (!docname) return

  showCallLogDetailModal.value = true
  callLog.value = { data: null }

  try {
    const response = await call(
      'crm.fcrm.doctype.crm_call_log.crm_call_log.get_call_log',
      { name: docname },
    )

    const data = unwrapCallLogPayload(response)
    if (!data) {
      throw new Error('Empty call log response')
    }

    callLog.value = { data }
  } catch (err) {
    showCallLogDetailModal.value = false
    toast.error(__('Unable to load call log details'))
    console.error('Customer360 call log load error:', err)
  }
}

function getDurationDisplay(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds || 0))

  if (sec < 60) {
    return {
      value: sec,
      suffix: 's',
      tooltip: `${sec}s`,
    }
  }

  if (sec < 3600) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return {
      value: m,
      suffix: s ? `m ${s}s` : 'm',
      tooltip: s ? `${m}m ${s}s` : `${m}m`,
    }
  }

  const h = Math.floor(sec / 3600)
  const rem = sec % 3600
  const m = Math.floor(rem / 60)
  const s = rem % 60

  let suffix = 'h'
  if (m) suffix += ` ${m}m`
  if (s) suffix += ` ${s}s`

  return {
    value: h,
    suffix,
    tooltip: suffix.replace('h', `${h}h`),
  }
}



function buildDashboardItems(payload) {
  const summary = payload?.summary || {}
  const charts = payload?.charts || {}
  const durationDisplay = getDurationDisplay(summary.total_talk_seconds)

  const topAgent = summary?.most_picked_agent || {}
  const topAgentName = topAgent?.full_name || __('No agent')
  const topAgentCount = Number(topAgent?.call_count || 0)

  const leadsByStatus = Array.isArray(charts.leads_by_status) ? charts.leads_by_status : []
  const dealsByStatus = Array.isArray(charts.deals_by_status) ? charts.deals_by_status : []

  return [
    {
      name: 'leads_count',
      type: 'number_chart',
      layout: layout(0, 0, 4, 3, 'leads_count'),
      data: { title: __('Leads from this number'), tooltip: __('CRM Lead.mobile_no match'), value: Number(summary.leads_count || 0) },
    },
    {
      name: 'calls_count',
      type: 'number_chart',
      layout: layout(4, 0, 4, 3, 'calls_count'),
      data: { title: __('Total calls'), tooltip: __('CRM Call Log from/to match'), value: Number(summary.call_count || 0) },
    },
    {
      name: 'deals_count',
      type: 'number_chart',
      layout: layout(8, 0, 4, 3, 'deals_count'),
      data: { title: __('Deals from this number'), tooltip: __('CRM Deal.mobile_no match'), value: Number(summary.deals_count || 0) },
    },
    {
      name: 'talk_duration',
      type: 'number_chart',
      layout: layout(12, 0, 4, 3, 'talk_duration'),
      data: {
        title: __('Total talk duration'),
        value: durationDisplay.value,
        suffix: durationDisplay.suffix,
        tooltip: durationDisplay.tooltip,
      },
    },
    {
      name: 'top_agent',
      type: 'number_chart',
      layout: layout(16, 0, 4, 3, 'top_agent'),
      data: {
        title: __('Top agent: {0}', [topAgentName]),
        tooltip: __('Picked calls: {0}', [topAgentCount]),
        value: topAgentCount,
        suffix: ` ${__('calls')}`,
      },
    },
    {
      name: 'leads_by_status',
      type: 'donut_chart',
      layout: layout(0, 3, 10, 9, 'leads_by_status'),
      data: {
        title: __('Leads by status'),
        subtitle: __('Matched leads for this number'),
        categoryColumn: 'status',
        valueColumn: 'count',
        data: leadsByStatus,
      },
    },
    {
      name: 'deals_by_status',
      type: 'donut_chart',
      layout: layout(10, 3, 10, 9, 'deals_by_status'),
      data: {
        title: __('Deals by status'),
        subtitle: __('Matched deals for this number'),
        categoryColumn: 'status',
        valueColumn: 'count',
        data: dealsByStatus,
      },
    },

  ]
}

usePageMeta(() => ({ title: __('Customer360') }))
</script>
