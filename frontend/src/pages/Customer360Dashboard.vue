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
          <TextInput
            v-model="inputMobile"
            class="form-control w-72"
            :placeholder="__('Enter mobile number')"
            @keyup.enter="searchByMobile"
          />
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

      <DashboardGrid
        v-else-if="!customer360.error && dashboardItems.length"
        v-model="dashboardItems"
        :editing="false"
      />

      <div
        v-if="activeMobile"
        class="rounded-md bg-surface-white shadow overflow-hidden border border-outline-gray-modals"
      >
        <div class="px-4 py-3 border-b border-outline-gray-modals font-semibold text-ink-gray-8">
          {{ __('Leads') }} ({{ leadList.data?.total_count || 0 }})
        </div>

        <LeadsListView
          v-if="leadRows.length"
          v-model="leadPageLength"
          v-model:list="leadList"
          :rows="leadRows"
          :columns="leadColumns"
          :options="{
            selectable: false,
            showTooltip: false,
            resizeColumn: true,
            rowCount: leadList.data?.row_count || 0,
            totalCount: leadList.data?.total_count || 0
          }"
          @loadMore="loadMoreLead"
          @updatePageCount="updateLeadPageCount"
        />
        <div v-else class="px-4 py-4 text-ink-gray-6">{{ __('No leads found') }}</div>
      </div>

      <div
        v-if="activeMobile"
        class="rounded-md bg-surface-white shadow overflow-hidden border border-outline-gray-modals"
      >
        <div class="px-4 py-3 border-b border-outline-gray-modals font-semibold text-ink-gray-8">
          {{ __('Deals') }} ({{ dealList.data?.total_count || 0 }})
        </div>

        <DealsListView
          v-if="dealRows.length"
          v-model="dealPageLength"
          v-model:list="dealList"
          :rows="dealRows"
          :columns="dealColumns"
          :options="{
            selectable: false,
            showTooltip: false,
            resizeColumn: true,
            rowCount: dealList.data?.row_count || 0,
            totalCount: dealList.data?.total_count || 0
          }"
          @loadMore="loadMoreDeal"
          @updatePageCount="updateDealPageCount"
        />
        <div v-else class="px-4 py-4 text-ink-gray-6">{{ __('No deals found') }}</div>
      </div>

      <div
        v-if="activeMobile"
        class="rounded-md bg-surface-white shadow overflow-hidden border border-outline-gray-modals"
      >
        <div class="px-4 py-3 border-b border-outline-gray-modals font-semibold text-ink-gray-8">
          {{ __('Call Logs') }} ({{ callLogsRaw.length }})
        </div>

        <CallLogsListView
          v-if="callLogRows.length"
          v-model="callLogPageLength"
          v-model:list="callLogsListState"
          :rows="callLogRows"
          :columns="callLogColumns"
          :options="{
            selectable: false,
            showTooltip: false,
            resizeColumn: true,
            rowCount: callLogRows.length,
            totalCount: callLogsRaw.length
          }"
          @showCallLog="openCallLog"
          @loadMore="loadMoreCallLogs"
          @updatePageCount="updateCallLogPageCount"
        />
        <div v-else class="px-4 py-4 text-ink-gray-6">{{ __('No call logs found') }}</div>
      </div>

      <div v-if="activeMobile && customer360.error" class="text-red-600">
        {{ __('Unable to load Customer360 data') }}
      </div>
    </div>

    <CallLogDetailModal
      v-model="showCallLogDetailModal"
      v-model:callLogModal="showCallLogModal"
      v-model:callLog="callLog"
    />
    <CallLogModal
      v-if="showCallLogModal && callLog?.data"
      v-model="showCallLogModal"
      :data="callLog.data"
    />
  </div>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import DashboardGrid from '@/components/Dashboard/DashboardGrid.vue'
import LeadsListView from '@/components/ListViews/LeadsListView.vue'
import DealsListView from '@/components/ListViews/DealsListView.vue'
import CallLogsListView from '@/components/ListViews/CallLogsListView.vue'
import CallLogDetailModal from '@/components/Modals/CallLogDetailModal.vue'
import CallLogModal from '@/components/Modals/CallLogModal.vue'
import { usersStore } from '@/stores/users'
import { statusesStore } from '@/stores/statuses'
import { formatDate, timeAgo } from '@/utils'
import { getCallLogDetail } from '@/utils/callLog'
import { Button, TextInput, createResource, usePageMeta, call, toast } from 'frappe-ui'
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()

const { getUser } = usersStore()
const { getLeadStatus, getDealStatus } = statusesStore()

const inputMobile = ref('')
const dashboardItems = ref([])
const showCallLogDetailModal = ref(false)
const showCallLogModal = ref(false)
const callLog = ref({ data: null })

const activeMobile = computed(() => String(route.query.mobile_no || '').trim())

const leadPageLength = ref(20)
const dealPageLength = ref(20)
const callLogPageLength = ref(20)

const callLogsRaw = ref([])
const callLogsListState = ref({ params: { filters: {} }, reload: () => {} })
const basePayload = ref({})

const leadStatusBuckets = ref([])
const dealStatusBuckets = ref([])

const LEAD_DEFAULT_FILTERS = { converted: 0 }
const DEAL_DEFAULT_FILTERS = {}

const leadColumnsConfig = [
  { label: 'First name', type: 'Data', key: 'first_name', width: '14rem' },
  { label: 'Mobile no', type: 'Data', key: 'mobile_no', width: '12rem' },
  { label: 'Status', type: 'Select', key: 'status', width: '10rem' },
  { label: 'Lead owner', type: 'Link', key: 'lead_owner', width: '12rem' },
  { label: 'Modified', type: 'Datetime', key: 'modified', width: '9rem' },
]

const dealColumnsConfig = [
  { label: 'First name', type: 'Data', key: 'first_name', width: '14rem' },
  { label: 'Mobile no', type: 'Data', key: 'mobile_no', width: '12rem' },
  { label: 'Status', type: 'Select', key: 'status', width: '10rem' },
  { label: 'Deal owner', type: 'Link', key: 'deal_owner', width: '12rem' },
  { label: 'Modified', type: 'Datetime', key: 'modified', width: '9rem' },
]

const CALL_LOG_COLUMNS = [
  { label: 'Caller', type: 'Link', key: 'caller', options: 'User', width: '9rem' },
  { label: 'Receiver', type: 'Link', key: 'receiver', options: 'User', width: '9rem' },
  { label: 'Type', type: 'Select', key: 'type', width: '9rem' },
  { label: 'Status', type: 'Select', key: 'status', width: '9rem' },
  { label: 'Duration', type: 'Duration', key: 'duration', width: '6rem' },
  { label: 'From (number)', type: 'Data', key: 'from', width: '9rem' },
  { label: 'To (number)', type: 'Data', key: 'to', width: '9rem' },
  { label: 'Created on', type: 'Datetime', key: 'creation', width: '8rem' },
]

const CALL_LOG_ROWS = [
  'name',
  'caller',
  'receiver',
  'type',
  'status',
  'duration',
  'from',
  'to',
  'creation',
]

function normalizeMobile(raw) {
  return String(raw || '').replace(/\D/g, '')
}

function mobileLikeFilter(raw) {
  const digits = normalizeMobile(raw)
  const last10 = digits.slice(-10)
  return last10.length === 10 ? { mobile_no: ['LIKE', `%${last10}%`] } : {}
}

function coreParams(doctype, mobile, columns, rows, pageLen, defaultFilters = {}) {
  return {
    doctype,
    filters: mobileLikeFilter(mobile),
    default_filters: defaultFilters,
    order_by: 'modified desc',
    page_length: pageLen,
    page_length_count: pageLen,
    columns,
    rows,
    view: { custom_view_name: '', view_type: 'list', group_by_field: 'owner' },
  }
}

function safeName(value) {
  const v = String(value || '').trim()
  return v || __('Unknown')
}

function unwrapPayload(response) {
  const level1 = response?.message ?? response ?? {}
  const level2 = level1?.message ?? level1
  return level2 || {}
}

function unwrapCallLogPayload(response) {
  const level1 = response?.message ?? response ?? {}
  const level2 = level1?.message ?? level1
  return level2 || null
}

function extractGetDataRows(payload) {
  const data = payload?.message ?? payload ?? {}
  return Array.isArray(data?.data) ? data.data : []
}

function countByStatus(rows) {
  const map = {}
  ;(rows || []).forEach((r) => {
    const status = String(r?.status || __('Unknown')).trim() || __('Unknown')
    map[status] = (map[status] || 0) + 1
  })
  return Object.keys(map).map((status) => ({ status, count: map[status] }))
}

function layout(x, y, w, h, i) {
  return { x, y, w, h, i }
}

function syncDashboard() {
  dashboardItems.value = buildDashboardItems(basePayload.value)
}

const leadList = createResource({
  url: 'crm.api.doc.get_data',
  auto: false,
  makeParams: () =>
    coreParams(
      'CRM Lead',
      activeMobile.value,
      leadColumnsConfig,
      ['name', 'first_name', 'mobile_no', 'status', 'lead_owner', 'modified'],
      leadPageLength.value,
      LEAD_DEFAULT_FILTERS,
    ),
  onSuccess() {
    syncDashboard()
  },
  onError() {
    syncDashboard()
  },
})

const dealList = createResource({
  url: 'crm.api.doc.get_data',
  auto: false,
  makeParams: () =>
    coreParams(
      'CRM Deal',
      activeMobile.value,
      dealColumnsConfig,
      ['name', 'first_name', 'mobile_no', 'status', 'deal_owner', 'modified'],
      dealPageLength.value,
      DEAL_DEFAULT_FILTERS,
    ),
  onSuccess() {
    syncDashboard()
  },
  onError() {
    syncDashboard()
  },
})

const leadStatusSource = createResource({
  url: 'crm.api.doc.get_data',
  auto: false,
  makeParams: () =>
    coreParams(
      'CRM Lead',
      activeMobile.value,
      [{ label: 'Status', type: 'Select', key: 'status', width: '10rem' }],
      ['name', 'status'],
      5000,
      LEAD_DEFAULT_FILTERS,
    ),
  onSuccess(resp) {
    leadStatusBuckets.value = countByStatus(extractGetDataRows(resp))
    syncDashboard()
  },
  onError() {
    leadStatusBuckets.value = []
    syncDashboard()
  },
})

const dealStatusSource = createResource({
  url: 'crm.api.doc.get_data',
  auto: false,
  makeParams: () =>
    coreParams(
      'CRM Deal',
      activeMobile.value,
      [{ label: 'Status', type: 'Select', key: 'status', width: '10rem' }],
      ['name', 'status'],
      5000,
      DEAL_DEFAULT_FILTERS,
    ),
  onSuccess(resp) {
    dealStatusBuckets.value = countByStatus(extractGetDataRows(resp))
    syncDashboard()
  },
  onError() {
    dealStatusBuckets.value = []
    syncDashboard()
  },
})

const customer360 = createResource({
  url: 'praveg.api.customer360.get_customer_360',
  makeParams() {
    return {
      mobile_no: activeMobile.value,
      call_log_limit: 100,
    }
  },
  onSuccess(response) {
    basePayload.value = unwrapPayload(response)
    callLogsRaw.value = Array.isArray(basePayload.value.call_logs)
      ? basePayload.value.call_logs
      : Array.isArray(basePayload.value.recent_calls)
        ? basePayload.value.recent_calls
        : []
    syncDashboard()
  },
  onError() {
    basePayload.value = {}
    callLogsRaw.value = []
    syncDashboard()
  },
})

const leadColumns = computed(() => leadList.data?.columns || [])
const dealColumns = computed(() => dealList.data?.columns || [])

const leadRows = computed(() => {
  const rows = leadList.data?.data || []
  return rows.map((lead) => {
    const ownerUser = lead.lead_owner ? getUser(lead.lead_owner) : null
    return {
      ...lead,
      first_name: { label: safeName(lead.first_name || lead.lead_name) },
      status: { label: lead.status, color: getLeadStatus(lead.status)?.color },
      lead_owner: {
        label: ownerUser?.full_name || lead.lead_owner || '-',
        ...(ownerUser || {}),
      },
      modified: {
        label: lead.modified ? formatDate(lead.modified) : '-',
        timeAgo: lead.modified ? __(timeAgo(lead.modified)) : '-',
      },
    }
  })
})

const dealRows = computed(() => {
  const rows = dealList.data?.data || []
  return rows.map((deal) => {
    const ownerUser = deal.deal_owner ? getUser(deal.deal_owner) : null
    return {
      ...deal,
      first_name: { label: safeName(deal.first_name || deal.lead_name) },
      status: { label: deal.status, color: getDealStatus(deal.status)?.color },
      deal_owner: {
        label: ownerUser?.full_name || deal.deal_owner || '-',
        ...(ownerUser || {}),
      },
      modified: {
        label: deal.modified ? formatDate(deal.modified) : '-',
        timeAgo: deal.modified ? __(timeAgo(deal.modified)) : '-',
      },
    }
  })
})

const callLogColumns = computed(() =>
  CALL_LOG_COLUMNS.map((col, index) =>
    index === CALL_LOG_COLUMNS.length - 1 ? { ...col, align: 'right' } : col,
  ),
)

const callLogRows = computed(() => {
  const sliced = callLogsRaw.value.slice(0, callLogPageLength.value)
  return sliced.map((raw) => {
    const log = normalizeCustomer360Call(raw)
    const row = {}
    CALL_LOG_ROWS.forEach((field) => {
      row[field] = getCallLogDetail(field, log, callLogColumns.value)
    })
    return row
  })
})

function normalizeCustomer360Call(raw) {
  const type = raw?.type || 'Incoming'
  const agentLabel = raw?.agent_name || raw?.agent_id || ''
  const durationSeconds = Number(raw?.duration_seconds || 0)

  return {
    ...raw,
    caller: type === 'Outgoing' ? agentLabel || raw?.from : raw?.from,
    receiver: type === 'Incoming' ? agentLabel || raw?.to : raw?.to,
    duration: durationSeconds,
    _duration: raw?.duration_label || `${durationSeconds}s`,
    from: raw?.from || '',
    to: raw?.to || '',
    status: raw?.status || '',
    type,
    creation: raw?.creation || '',
    name: raw?.name || '',
    reference_doctype: raw?.reference_doctype,
    reference_docname: raw?.reference_docname,
  }
}

watch(
  activeMobile,
  (value) => {
    inputMobile.value = value
    dashboardItems.value = []
    callLogsRaw.value = []
    basePayload.value = {}
    leadStatusBuckets.value = []
    dealStatusBuckets.value = []
    callLogPageLength.value = 20

    if (!value) return

    customer360.fetch()
    leadList.fetch()
    dealList.fetch()
    leadStatusSource.fetch()
    dealStatusSource.fetch()
  },
  { immediate: true },
)

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
  leadList.fetch()
  dealList.fetch()
  leadStatusSource.fetch()
  dealStatusSource.fetch()
}

function loadMoreLead() {
  if (!leadList.params) return
  leadList.params.page_length += leadList.params.page_length_count || 20
  leadList.reload()
}

function loadMoreDeal() {
  if (!dealList.params) return
  dealList.params.page_length += dealList.params.page_length_count || 20
  dealList.reload()
}

function updateLeadPageCount(count) {
  const value = Number(count || 20)
  if (!leadList.params) return
  leadPageLength.value = value > 0 ? value : 20
  leadList.params.page_length = leadPageLength.value
  leadList.params.page_length_count = leadPageLength.value
  leadList.reload()
}

function updateDealPageCount(count) {
  const value = Number(count || 20)
  if (!dealList.params) return
  dealPageLength.value = value > 0 ? value : 20
  dealList.params.page_length = dealPageLength.value
  dealList.params.page_length_count = dealPageLength.value
  dealList.reload()
}

function loadMoreCallLogs() {
  callLogPageLength.value += 20
}

function updateCallLogPageCount(count) {
  const value = Number(count || 20)
  callLogPageLength.value = value > 0 ? value : 20
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
    if (!data) throw new Error('Empty call log response')

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
    return { value: sec, suffix: 's', tooltip: `${sec}s` }
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
  const durationDisplay = getDurationDisplay(summary.total_talk_seconds)

  const topAgent = summary?.most_picked_agent || {}
  const topAgentName = topAgent?.full_name || __('No agent')
  const topAgentCount = Number(topAgent?.call_count || 0)

  const leadsCount = Number(leadList.data?.total_count || 0)
  const dealsCount = Number(dealList.data?.total_count || 0)

  const leadBucketsFallback = countByStatus(leadList.data?.data || [])
  const dealBucketsFallback = countByStatus(dealList.data?.data || [])

  const leadBuckets = leadStatusBuckets.value.length ? leadStatusBuckets.value : leadBucketsFallback
  const dealBuckets = dealStatusBuckets.value.length ? dealStatusBuckets.value : dealBucketsFallback

  const leadHasData = leadsCount > 0 && leadBuckets.length > 0
  const dealHasData = dealsCount > 0 && dealBuckets.length > 0

  return [
    {
      name: 'leads_count',
      type: 'number_chart',
      layout: layout(0, 0, 4, 3, 'leads_count'),
      data: {
        title: __('Leads from this number'),
        tooltip: __('Core CRM Lead filter match'),
        value: leadsCount,
      },
    },
    {
      name: 'calls_count',
      type: 'number_chart',
      layout: layout(4, 0, 4, 3, 'calls_count'),
      data: {
        title: __('Total calls'),
        tooltip: __('CRM Call Log from/to match'),
        value: Number(summary.call_count || 0),
      },
    },
    {
      name: 'deals_count',
      type: 'number_chart',
      layout: layout(8, 0, 4, 3, 'deals_count'),
      data: {
        title: __('Deals from this number'),
        tooltip: __('Core CRM Deal filter match'),
        value: dealsCount,
      },
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
        subtitle: leadHasData ? __('Matched leads for this number') : __('No leads found'),
        categoryColumn: 'status',
        valueColumn: 'count',
        data: leadHasData ? leadBuckets : [],
      },
    },
    {
      name: 'deals_by_status',
      type: 'donut_chart',
      layout: layout(10, 3, 10, 9, 'deals_by_status'),
      data: {
        title: __('Deals by status'),
        subtitle: dealHasData ? __('Matched deals for this number') : __('No deals found'),
        categoryColumn: 'status',
        valueColumn: 'count',
        data: dealHasData ? dealBuckets : [],
      },
    },
  ]
}

usePageMeta(() => ({ title: __('Customer360') }))
</script>
