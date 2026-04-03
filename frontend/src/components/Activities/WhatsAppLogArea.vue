<template>
  <div>
    <div class="mb-1 flex items-center justify-stretch gap-2 py-1 text-base">
      <div class="inline-flex items-center flex-wrap gap-1 text-ink-gray-5">
        <span class="font-medium text-ink-gray-8">
          {{ activity.owner_name }}
        </span>
        <span>{{ __('sent WhatsApp message for') }}</span>
        <span class="font-medium text-ink-gray-8">
          {{ activity.data.action_type }}
        </span>
        <span>{{ __('to') }}</span>
        <span class="font-medium text-ink-gray-8">
          {{ recipientLabel }}
        </span>
      </div>
      <div class="ml-auto whitespace-nowrap">
        <Tooltip :text="formatDate(activity.creation)">
          <div class="text-sm text-ink-gray-5">
            {{ __(timeAgo(activity.creation)) }}
          </div>
        </Tooltip>
      </div>
    </div>

    <div
      class="flex flex-col gap-2 rounded-md border border-outline-gray-modals bg-surface-cards px-3 py-2.5 text-ink-gray-9"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Badge :label="activity.data.action_type" theme="green" />
        <Badge :label="activity.data.status" :theme="statusTheme" />
        <!-- <Badge :label="activity.data.direction" theme="gray" /> -->
      </div>

      <div class="text-sm text-ink-gray-5">
        {{ activity.data.recipient_number }}
      </div>

      <div class="whitespace-pre-wrap text-base leading-6 text-ink-gray-8">
        {{ activity.data.message_text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Badge, Tooltip } from 'frappe-ui'
import { timeAgo, formatDate } from '@/utils'

const props = defineProps({
  activity: Object,
})

const recipientLabel = computed(() => {
  return (
    props.activity?.data?.recipient_name ||
    props.activity?.data?.recipient_number ||
    __('Unknown recipient')
  )
})

const statusTheme = computed(() => {
  const map = {
    Prepared: 'orange',
    Opened: 'blue',
    Sent: 'green',
    Delivered: 'green',
    Failed: 'red',
  }
  return map[props.activity?.data?.status] || 'gray'
})
</script>
