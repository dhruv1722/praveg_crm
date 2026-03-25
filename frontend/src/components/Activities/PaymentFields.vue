<template>
  <div class="my-3 flex items-center justify-between text-lg font-medium sm:mb-4 sm:mt-8">
    <div class="flex h-8 items-center text-xl font-semibold text-ink-gray-8">
      {{ __('Payment') }}
      <Badge v-if="document.isDirty" class="ml-3" :label="'Not Saved'" theme="orange" />
    </div>
    <div class="flex gap-1">
      <Button label="Save" :disabled="!document.isDirty" variant="solid" :loading="document.save.loading"
        @click="saveChanges" />
    </div>
  </div>

  <div v-if="document.get.loading"
    class="flex flex-1 flex-col items-center justify-center gap-3 text-xl font-medium text-ink-gray-6">
    <LoadingIndicator class="h-6 w-6" />
    <span>{{ __('Loading...') }}</span>
  </div>

  <div v-else class="pb-8">
    <FieldLayout v-if="tabs.data" :tabs="tabs.data" :data="document.doc" :doctype="doctype" />
    <div class="mt-6 flex justify-end">
      <Button
        label="Save"
        :disabled="!document.isDirty"
        variant="solid"
        :loading="document.save.loading"
        @click="saveChanges"
      />
    </div>
  </div>
</template>

<script setup>
import FieldLayout from '@/components/FieldLayout/FieldLayout.vue'
import { Badge, createResource } from 'frappe-ui'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { useDocument } from '@/data/document'
import { ref, watch, getCurrentInstance, provide } from 'vue'

const props = defineProps({
  doctype: { type: String, required: true },
  docname: { type: String, required: true },
})
const emit = defineEmits(['beforeSave', 'afterSave'])

const instance = getCurrentInstance()
const attrs = instance?.vnode?.props ?? {}

const { document } = useDocument(props.doctype, props.docname)

const tabs = createResource({
  url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['PaymentFields', props.doctype],
  params: { doctype: props.doctype, type: 'Payment Fields' }, // <--- important: type name
  auto: true,
  transform: (_tabs) => _tabs,
})

function saveChanges() {
  if (!document.isDirty) return

  const updatedDoc = { ...document.doc }
  const oldDoc = { ...document.originalDoc }

  const changes = Object.keys(updatedDoc).reduce((acc, key) => {
    if (JSON.stringify(updatedDoc[key]) !== JSON.stringify(oldDoc[key])) {
      acc[key] = updatedDoc[key]
    }
    return acc
  }, {})

  const hasListener = attrs['onBeforeSave'] !== undefined

  if (hasListener) {
    emit('beforeSave', changes)
  } else {
    document.save.submit(null, {
      onSuccess: () => emit('afterSave', changes),
    })
  }
}

provide('saveDataFieldsChanges', saveChanges)

watch(
  () => document.doc,
  (newValue, oldValue) => {
    if (!oldValue) return
    if (newValue && oldValue) {
      const isDirty =
        JSON.stringify(newValue) !== JSON.stringify(document.originalDoc)
      document.isDirty = isDirty
      if (isDirty) {
        document.save.loading = false
      }
    }
  },
  { deep: true },
)
</script>

<!-- Customization added in this file -->