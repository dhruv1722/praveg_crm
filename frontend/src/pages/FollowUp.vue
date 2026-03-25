<template>
  <LayoutHeader>
    <template #left-header>
      <ViewBreadcrumbs routeName="Follow Up" />
    </template>
    <template #right-header>
      <Button
        :label="__('Refresh')"
        :icon="RefreshIcon"
        :loading="followUpLeads.loading"
        @click="reloadFollowUps()"
      />
    </template>
  </LayoutHeader>

  <div class="border-b px-5 py-4">
    <div class="flex flex-wrap items-end gap-3">
      <div
        v-for="filter in quickFilters"
        :key="filter.fieldname"
        class="min-w-[180px] flex-1"
      >
        <QuickFilterField
          :filter="filter"
          @applyQuickFilter="(f, v) => applyQuickFilter(f, v)"
        />
      </div>
      <Button :label="__('Clear')" @click="clearFilters" />
    </div>
  </div>

  <div
    v-if="followUpLeads.loading && !followUpLeads.data"
    class="flex h-full items-center justify-center"
  >
    <div class="flex items-center gap-3 text-ink-gray-6">
      <LoadingIndicator class="h-5 w-5" />
      <span>{{ __('Loading follow ups...') }}</span>
    </div>
  </div>

  <div v-else-if="totalCount" class="pt-4">
    <div class="pb-5">
      <ListView
        class="h-full"
        :columns="columns"
        :rows="rows"
        :options="listOptions"
        row-key="name"
      >
        <ListHeader class="sm:mx-5 mx-3">
          <ListHeaderItem
            v-for="column in columns"
            :key="column.key"
            :item="column"
          >
            <button
              class="flex w-full items-center gap-1 text-left text-sm font-medium text-ink-gray-6"
              @click="toggleSort(column.key)"
            >
              <span>{{ column.label }}</span>
              <FeatherIcon
                v-if="sortState.key === column.key"
                :name="sortState.direction === 'asc' ? 'arrow-up' : 'arrow-down'"
                class="h-3.5 w-3.5 text-ink-gray-8"
              />
            </button>
          </ListHeaderItem>
        </ListHeader>

        <ListRows :rows="rows" doctype="CRM Lead" v-slot="{ column, item }">
          <ListRowItem :item="item" :align="column.align">
            <template #prefix>
              <div v-if="column.key === 'lead_name'">
                <Avatar
                  v-if="item.label"
                  class="flex items-center"
                  :image="item.image"
                  :label="item.image_label || item.label"
                  size="sm"
                />
              </div>
              <div v-else-if="column.key === 'status'">
                <IndicatorIcon :class="item.color" />
              </div>
            </template>

            <template #default="{ label }">
              <div
                v-if="column.key === 'next_follow_up_date'"
                class="truncate text-base font-medium"
              >
                {{ label }}
              </div>
              <div
                v-else-if="column.key === 'due_in_label'"
                class="truncate text-base font-medium"
              >
                {{ label }}
              </div>
              <div v-else-if="label" class="truncate text-base">
                {{ label }}
              </div>
            </template>
          </ListRowItem>
        </ListRows>
      </ListView>
    </div>

    <ListFooter
      v-if="followUpLeads.data?.total_count"
      class="border-t px-3 py-2 sm:px-5"
      v-model="pageLengthCount"
      :options="{
        rowCount: followUpLeads.data?.row_count || 0,
        totalCount: followUpLeads.data?.total_count || 0,
      }"
      @loadMore="loadMoreRows"
    />
  </div>

  <EmptyState
    v-else
    name="follow ups"
    :title="emptyState.title"
    :description="emptyState.description"
    :icon="CalendarIcon"
  />
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import EmptyState from '@/components/ListViews/EmptyState.vue'
import QuickFilterField from '@/components/QuickFilterField.vue'
import ListRows from '@/components/ListViews/ListRows.vue'
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import RefreshIcon from '@/components/Icons/RefreshIcon.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import { statusesStore } from '@/stores/statuses'
import { formatDate } from '@/utils'
import {
  Avatar,
  ListView,
  ListHeader,
  ListHeaderItem,
  ListRowItem,
  ListFooter,
  createResource,
  toast,
  FeatherIcon,
} from 'frappe-ui'
import { computed, ref, watch } from 'vue'

const { getLeadStatus } = statusesStore()

const pageLengthCount = ref(20)
const pageLength = ref(20)
const filters = ref({})
const orderBy = ref('next_follow_up_date asc')
const quickFilters = ref([])

function getParams() {
  return {
    page_length: pageLength.value,
    page_length_count: pageLengthCount.value,
    filters: filters.value,
    order_by: orderBy.value,
  }
}

const followUpLeads = createResource({
  url: 'praveg.api.follow_up.get_follow_up_leads',
  params: getParams(),
  auto: true,
  onSuccess(data) {
    quickFilters.value = (data.quick_filters || []).map((filter) => ({
      ...filter,
      value: getFilterDisplayValue(filter.fieldname),
    }))
  },
  onError(error) {
    toast.error(
      error?.messages?.[0] ||
        error?.message ||
        __('Unable to load follow up leads'),
    )
  },
})

const totalCount = computed(() => followUpLeads.data?.total_count || 0)

const sortState = computed(() => getSortState())

const columns = [
  { label: __('Lead'), key: 'lead_name', width: '16rem' },
  { label: __('Organization'), key: 'organization', width: '14rem' },
  { label: __('Status'), key: 'status', width: '10rem' },
  { label: __('Follow Up'), key: 'next_follow_up_label', width: '10rem' },
  { label: __('Due Date'), key: 'next_follow_up_date', width: '10rem' },
  { label: __('Due In'), key: 'due_in_label', width: '10rem' },
  { label: __('Mobile No'), key: 'mobile_no', width: '11rem' },
]

const rows = computed(() => {
  return (followUpLeads.data?.data || []).map((lead) => ({
    name: lead.name,
    lead_name: {
      label: lead.lead_name || lead.name,
      image: lead.image,
      image_label: lead.first_name || lead.lead_name || lead.name,
    },
    organization: {
      label: lead.organization || '',
    },
    status: {
      label: lead.status || '',
      color: getLeadStatus(lead.status)?.color,
    },
    next_follow_up_label: {
      label: lead.next_follow_up_label || '',
    },
    next_follow_up_date: {
      label: formatDate(lead.next_follow_up_date, '', true),
    },
    due_in_label: {
      label: lead.due_in_label || '',
    },
    mobile_no: {
      label: lead.mobile_no || '',
    },
  }))
})

const hasActiveFilters = computed(() => Object.keys(filters.value).length > 0)

const emptyState = computed(() => {
  if (hasActiveFilters.value) {
    return {
      title: __('No matching follow ups'),
      description: __('Try changing filters or clear the current filters.'),
    }
  }

  return {
    title: __('No follow ups due'),
    description: __(
      'Leads assigned to you with follow up dates from today onward will appear here.',
    ),
  }
})

const listOptions = {
  getRowRoute: (row) => ({
    name: 'Lead',
    params: { leadId: row.name },
  }),
  selectable: false,
  showTooltip: false,
  resizeColumn: true,
}

watch(pageLengthCount, (value, oldValue) => {
  if (!value || value === oldValue) return
  reloadFollowUps(true)
})

function reloadFollowUps(resetPageLength = false) {
  if (resetPageLength) {
    pageLength.value = pageLengthCount.value
  }

  followUpLeads.params = getParams()
  followUpLeads.reload()
}

function getFilterDisplayValue(fieldname) {
  const value = filters.value[fieldname]

  if (Array.isArray(value) && value[0] === 'LIKE') {
    return (value[1] || '').replace(/^%|%$/g, '')
  }

  return value || ''
}

function syncQuickFilters() {
  quickFilters.value = quickFilters.value.map((filter) => ({
    ...filter,
    value: getFilterDisplayValue(filter.fieldname),
  }))
}

function applyQuickFilter(filter, value) {
  const nextFilters = { ...filters.value }

  if (value) {
    if (
      ['Check', 'Select', 'Link', 'Date', 'Datetime'].includes(
        filter.fieldtype,
      )
    ) {
      nextFilters[filter.fieldname] = value
    } else {
      nextFilters[filter.fieldname] = ['LIKE', `%${value}%`]
    }
  } else {
    delete nextFilters[filter.fieldname]
  }

  filters.value = nextFilters
  syncQuickFilters()
  reloadFollowUps(true)
}

function loadMoreRows() {
  pageLength.value += pageLengthCount.value
  reloadFollowUps()
}

function clearFilters() {
  filters.value = {}
  orderBy.value = 'next_follow_up_date asc'
  syncQuickFilters()
  reloadFollowUps(true)
}

function getSortState() {
  const [key = 'next_follow_up_date', direction = 'asc'] =
    orderBy.value.split(' ')

  return { key, direction }
}

function toggleSort(key) {
  const current = getSortState()
  const nextDirection =
    current.key === key && current.direction === 'asc' ? 'desc' : 'asc'

  orderBy.value = `${key} ${nextDirection}`
  reloadFollowUps()
}
</script>
