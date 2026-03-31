<template>
  <Dialog v-model="show" :options="{ size: '4xl' }">
    <template #body>
      <div class="bg-surface-modal px-4 pb-6 pt-5 sm:px-6">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
              {{ __('Editing row {0}', [index + 1]) }}
            </h3>
          </div>
          <div class="flex items-center gap-1">
            <Button v-if="isManager()" :tooltip="__('Edit fields layout')" variant="ghost" class="w-7" :icon="EditIcon"
              @click="openGridRowFieldsModal" />
            <Button icon="x" variant="ghost" class="w-7" @click="show = false" />
          </div>
        </div>
        <div>
          <FieldLayout v-if="tabs.data" :tabs="tabs.data" :data="data" :doctype="doctype" :isGridRow="true" />
        </div>
        <!-- template: add below FieldLayout block -->
        <div v-if="showApplyButton" class="mt-6 flex justify-end">
          <Button :label="__('Apply')" variant="solid" @click="applyChanges" />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import EditIcon from '@/components/Icons/EditIcon.vue'
import FieldLayout from '@/components/FieldLayout/FieldLayout.vue'
import { usersStore } from '@/stores/users'
import { createResource } from 'frappe-ui'
import { computed, inject, nextTick, ref, watch } from 'vue'
import { globalStore } from '@/stores/global'

const { $dialog } = globalStore()

const props = defineProps({
  index: Number,
  data: Object,
  doctype: String,
  parentDoctype: String,
})

const { isManager } = usersStore()

const show = defineModel()
const showGridRowFieldsModal = defineModel('showGridRowFieldsModal')

const tabs = createResource({
  url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['Grid Row', props.doctype, props.parentDoctype],
  params: {
    doctype: props.doctype,
    type: 'Grid Row',
    parent_doctype: props.parentDoctype,
  },
  auto: true,
})

const saveDataFieldsChanges = inject('saveDataFieldsChanges', null)

const showApplyButton = computed(() => {
  return (
    ['CRM Lead', 'CRM Deal'].includes(props.parentDoctype) &&
    ['CRM Guest Details', 'Payment Receipt'].includes(props.doctype) &&
    ['custom_guest', 'custom_payment_receipt'].includes(props.data?.parentfield || '')
  )
})


const originalRowSnapshot = ref('{}')

function getRowSnapshot(row) {
  return JSON.stringify(row ?? {})
}

function captureRowSnapshot() {
  originalRowSnapshot.value = getRowSnapshot(props.data)
}

const isRowDirty = computed(() => {
  return getRowSnapshot(props.data) !== originalRowSnapshot.value
})

const shouldConfirmRateChange = computed(() => {
  return (
    ['CRM Lead', 'CRM Deal'].includes(props.parentDoctype) &&
    props.doctype === 'CRM Guest Details' &&
    props.data?.parentfield === 'custom_guest' &&
    props.data?.type === 'Room' &&
    !!props.data?.__rateModifierButtonClicked
  )
})

watch(
  () => show.value,
  (visible) => {
    if (visible) {
      captureRowSnapshot()
    }
  },
  { immediate: true },
)


function openGridRowFieldsModal() {
  showGridRowFieldsModal.value = true
  nextTick(() => (show.value = false))
}

function saveRowChanges() {
  delete props.data.__rateModifierButtonClicked
  show.value = false

  if (typeof saveDataFieldsChanges === 'function') {
    saveDataFieldsChanges()
  }
}

function applyChanges() {
  if (!isRowDirty.value) {
    show.value = false
    return
  }

  if (!shouldConfirmRateChange.value) {
    saveRowChanges()
    return
  }

  $dialog({
    title: __('Confirm rate change'),
    message: __('Are you sure you want to proceed with this rate change?'),
    actions: [
      {
        label: __('Proceed'),
        variant: 'solid',
        onClick(close) {
          close()
          saveRowChanges()
        },
      },
    ],
  })
}
</script>

<!-- Customization added in this file -->