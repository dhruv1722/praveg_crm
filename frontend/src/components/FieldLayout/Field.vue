<template>
  <div v-if="field.visible" class="field">
    <div v-if="!['Check', 'Button' , 'HTML'].includes(field.fieldtype)" class="mb-2 text-sm text-ink-gray-5">
      {{ __(field.label) }}
      <span v-if="
        field.reqd ||
        (field.mandatory_depends_on && field.mandatory_via_depends_on)
      " class="text-ink-red-2">*</span>
    </div>

    <!-- custom code -->

    <div v-if="field.fieldtype === 'HTML'" v-html="getHtmlFieldContent(field)"></div>

    <div v-else-if="field.fieldtype === 'Code' && field.options === 'HTML'" class="ai-html text-ink-gray-2"
      v-html="data[field.fieldname] || ''"></div>

    <div v-else-if="['Attach', 'Attach Image'].includes(field.fieldtype)">
      <div v-if="data[field.fieldname]">
        <AttachmentItem :label="getAttachLabel(data[field.fieldname])" :url="data[field.fieldname]">
          <template #suffix>
            <Button icon="x" variant="ghost" @click.stop="() => fieldChange('', field)" />
          </template>
        </AttachmentItem>
      </div>
      <FileUploader :upload-args="{
        doctype: doctype,
        docname: isGridRow && parentDoc ? parentDoc.name : data.value?.name,
        private: true
      }" @success="(file) => fieldChange(file.file_url, field)">
        <template #default="{ openFileSelector }">
          <Button variant="ghost" :label="data[field.fieldname] ? __('Replace') : __('Attach')"
            @click="openFileSelector()" />
        </template>
      </FileUploader>
    </div>

    <!-- custom code -->

    <FormControl v-else-if="
      field.read_only &&
      !['Int', 'Float', 'Currency', 'Percent', 'Check', 'Button'].includes(
        field.fieldtype,
      )
    " type="text" :placeholder="getPlaceholder(field)" v-model="data[field.fieldname]" :disabled="true"
      :description="field.description" />
    <Grid v-else-if="field.fieldtype === 'Table'" v-model="data[field.fieldname]" v-model:parent="data"
      :doctype="field.options" :parentDoctype="doctype" :parentFieldname="field.fieldname" />
    <FormControl v-else-if="field.fieldtype === 'Select'" type="select" class="form-control"
      :class="field.prefix ? 'prefix' : ''" :options="field.options" v-model="data[field.fieldname]"
      @change="(e) => fieldChange(e.target.value, field)" :placeholder="getPlaceholder(field)"
      :description="field.description">
      <template v-if="field.prefix" #prefix>
        <IndicatorIcon :class="field.prefix" />
      </template>
    </FormControl>
    <div v-else-if="field.fieldtype == 'Check'" class="flex items-center gap-2">
      <FormControl class="form-control" type="checkbox" v-model="data[field.fieldname]"
        @change="(e) => fieldChange(e.target.checked, field)" :disabled="Boolean(field.read_only)"
        :description="field.description" />
      <label class="text-sm text-ink-gray-5" @click="
        () => {
          if (!Boolean(field.read_only)) {
            data[field.fieldname] = !data[field.fieldname]
          }
        }
      ">
        {{ __(field.label) }}
        <span class="text-ink-red-3" v-if="field.mandatory">*</span>
      </label>
    </div>
    <div class="flex gap-1" v-else-if="['Link', 'Dynamic Link'].includes(field.fieldtype)">
      <Link class="form-control flex-1 truncate" :value="data[field.fieldname]" :doctype="field.fieldtype == 'Link' ? field.options : data[field.options]
        " :filters="field.filters" :row="isGridRow ? data : null" @change="(v) => fieldChange(v, field)"
        :placeholder="getPlaceholder(field)" :onCreate="field.create" />
      <Button v-if="data[field.fieldname] && field.edit" class="shrink-0" :label="__('Edit')" :iconLeft="EditIcon"
        @click="field.edit(data[field.fieldname])" />
    </div>

    <TableMultiselectInput v-else-if="field.fieldtype === 'Table MultiSelect'" v-model="data[field.fieldname]"
      :doctype="field.options" @change="(v) => fieldChange(v, field)" />

    <!-- // custom code -->
    <Button v-else-if="field.fieldtype === 'Button'" class="w-full" :label="__(field.label)"
      :disabled="Boolean(field.read_only)" @click="handleButtonClick(field)" />
    <!-- // custom code -->

    <Link v-else-if="field.fieldtype === 'User'" class="form-control text-ink-gray-5"
      :value="data[field.fieldname] && getUser(data[field.fieldname]).full_name" :doctype="field.options"
      :filters="field.filters" @change="(v) => fieldChange(v, field)" :placeholder="getPlaceholder(field)"
      :hideMe="true">
      <template #prefix>
        <UserAvatar v-if="data[field.fieldname]" class="mr-2" :user="data[field.fieldname]" size="sm" />
      </template>
      <template #item-prefix="{ option }">
        <UserAvatar class="mr-2" :user="option.value" size="sm" />
      </template>
      <template #item-label="{ option }">
        <Tooltip :text="option.value">
          <div class="cursor-pointer text-ink-gray-9">
            {{ getUser(option.value).full_name }}
          </div>
        </Tooltip>
      </template>
    </Link>
    <Combobox v-else-if="field.fieldtype === 'Autocomplete'" v-model="data[field.fieldname]"
      @update:modelValue="(v) => fieldChange(v, field, data)" :options="getOptions(field.options)"
      :placeholder="getPlaceholder(field)" :disabled="Boolean(field.read_only)" />
    <TimePicker v-else-if="field.fieldtype === 'Time'" :value="data[field.fieldname]"
      :format="getFormat('', '', false, true, false)" :placeholder="getPlaceholder(field)" input-class="border-none"
      @change="(v) => fieldChange(v, field)" />
    <DateTimePicker v-else-if="field.fieldtype === 'Datetime'" :value="data[field.fieldname]"
      :formatter="(date) => getFormat(date, '', true, true)" :placeholder="getPlaceholder(field)"
      input-class="border-none" @change="(v) => fieldChange(v, field)" />
    <DatePicker v-else-if="field.fieldtype === 'Date'" :value="data[field.fieldname]"
      :formatter="(date) => getFormat(date, '', true)" :format="field.date_format || 'DD-MM-YYYY'"
      :placeholder="getPlaceholder(field)" input-class="border-none" @change="(v) => fieldChange(v, field)" />
    <FormControl v-else-if="
      ['Small Text', 'Text', 'Long Text', 'Code'].includes(field.fieldtype)
    " type="textarea" :rows="getRows(field)" :value="data[field.fieldname]" :placeholder="getPlaceholder(field)"
      :description="field.description" @change="fieldChange($event.target.value, field)" />
    <Password v-else-if="field.fieldtype === 'Password'" :value="data[field.fieldname]"
      :placeholder="getPlaceholder(field)" :description="field.description"
      @change="fieldChange($event.target.value, field)" />
    <FormattedInput v-else-if="field.fieldtype === 'Int'" type="text" :placeholder="getPlaceholder(field)"
      :value="data[field.fieldname] || '0'" :disabled="Boolean(field.read_only)" :description="field.description"
      @change="fieldChange($event.target.value, field)" />
    <FormattedInput v-else-if="field.fieldtype === 'Percent'" type="text"
      :value="getFormattedPercent(field.fieldname, data)" :placeholder="getPlaceholder(field)"
      :disabled="Boolean(field.read_only)" :description="field.description"
      @change="fieldChange(flt($event.target.value), field)" />
    <FormattedInput v-else-if="field.fieldtype === 'Float'" type="text"
      :value="getFormattedFloat(field.fieldname, data)" :placeholder="getPlaceholder(field)"
      :disabled="Boolean(field.read_only)" :description="field.description"
      @change="fieldChange(flt($event.target.value), field)" />
    <FormattedInput v-else-if="field.fieldtype === 'Currency'" type="text"
      :value="getFormattedCurrency(field.fieldname, data, parentDoc)" :placeholder="getPlaceholder(field)"
      :disabled="Boolean(field.read_only)" :description="field.description"
      @change="fieldChange(flt($event.target.value), field)" />
    <FormControl v-else type="text" :placeholder="getPlaceholder(field)"
      :value="getDataValue(data[field.fieldname], field)" :disabled="Boolean(field.read_only)"
      :description="field.description" @change="fieldChange($event.target.value, field)" />
  </div>
</template>
<script setup>
import Password from '@/components/Controls/Password.vue'
import FormattedInput from '@/components/Controls/FormattedInput.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'
import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import TableMultiselectInput from '@/components/Controls/TableMultiselectInput.vue'
import Link from '@/components/Controls/Link.vue'
import Grid from '@/components/Controls/Grid.vue'
import AttachmentItem from '@/components/AttachmentItem.vue'
import { createDocument } from '@/composables/document'
import { getFormat, evaluateDependsOnValue } from '@/utils'
import { flt } from '@/utils/numberFormat.js'
import { getMeta } from '@/stores/meta'
import { sessionStore } from '@/stores/session'
import { usersStore } from '@/stores/users'
import { useDocument } from '@/data/document'
import { Combobox, Tooltip, DatePicker, DateTimePicker, TimePicker, FileUploader , dayjs } from 'frappe-ui'
import { computed, provide, inject, watchEffect } from 'vue'

const props = defineProps({
  field: Object,
})



const data = inject('data')
const doctype = inject('doctype')
const preview = inject('preview')
const isGridRow = inject('isGridRow')


const { getFormattedPercent, getFormattedFloat, getFormattedCurrency } =
  getMeta(doctype)

const { users, getUser } = usersStore()
const session = sessionStore()

// custom code
const fieldButtonHandlers = inject('fieldButtonHandlers', null)
const fieldHtmlRenderers = inject('fieldHtmlRenderers', null)
const fieldTextareaRowsMap = inject('fieldTextareaRowsMap', null)
// custom code

let triggerOnChange
let parentDoc

if (!isGridRow) {
  const {
    triggerOnChange: trigger,
    triggerOnRowAdd,
    triggerOnRowRemove,
  } = useDocument(doctype, data.value.name)
  triggerOnChange = trigger

  provide('triggerOnChange', triggerOnChange)
  provide('triggerOnRowAdd', triggerOnRowAdd)
  provide('triggerOnRowRemove', triggerOnRowRemove)
} else {
  triggerOnChange = inject('triggerOnChange', () => { })
  parentDoc = inject('parentDoc')
}

const field = computed(() => {
  let field = props.field
  if (field.fieldtype == 'Select' && typeof field.options === 'string') {
    field.options = field.options.split('\n').map((option) => {
      return { label: option, value: option }
    })

    if (field.options[0].value !== '') {
      field.options.unshift({ label: '', value: '' })
    }
  }

  if (field.fieldtype === 'Link' && field.options === 'User') {
    field.fieldtype = 'User'
    field.link_filters = JSON.stringify({
      ...(field.link_filters ? JSON.parse(field.link_filters) : {}),
      name: ['in', users.data.crmUsers?.map((user) => user.name)],
    })
  }

  if (field.fieldtype === 'Link' && field.options !== 'User') {
    if (!field.create) {
      field.create = (value, close) => {
        const callback = (d) => {
          if (d) fieldChange(d.name, field)
        }
        createDocument(field.options, value, close, callback)
      }
    }
  }

  const read_only_via_depends_on = evaluateDependsOnValue(
    field.read_only_depends_on,
    data.value,
  )


  let _field = {
    ...field,
    filters: field.link_filters && JSON.parse(field.link_filters),
    placeholder: field.placeholder || field.label,
    display_via_depends_on: evaluateDependsOnValue(
      field.depends_on,
      data.value,
    ),
    mandatory_via_depends_on: evaluateDependsOnValue(
      field.mandatory_depends_on,
      data.value,
    ),
    read_only:
      field.read_only ||
      (field.read_only_depends_on && read_only_via_depends_on),
  }

  _field.visible = isFieldVisible(_field)
  return _field
})

watchEffect(() => {
  const df = field.value

  if (!df?.default || !shouldApplyResolvedDefault(df)) return

  data.value[df.fieldname] = getDefaultValue(df.default, df.fieldtype)
})

function isFieldVisible(field) {
  if (preview.value) return true

  const hideEmptyReadOnly = Number(
    window.sysdefaults?.hide_empty_read_only_fields ?? 1,
  )

  const shouldShowReadOnly =
    field.read_only && (data.value[field.fieldname] || !hideEmptyReadOnly)

  return (
    (field.fieldtype == 'Check' || shouldShowReadOnly || !field.read_only) &&
    (!field.depends_on || field.display_via_depends_on) &&
    !field.hidden
  )
}


const getPlaceholder = (field) => {
  if (field.placeholder) {
    return __(field.placeholder)
  }
  if (['Select', 'Link'].includes(field.fieldtype)) {
    return __('Select {0}', [__(field.label)])
  } else {
    return __('Enter {0}', [__(field.label)])
  }
}

const getOptions = (options) => {
  if (Array.isArray(options)) {
    return options
  } else if (typeof options === 'string') {
    return options.split('\n').map((option) => {
      return { label: option, value: option }
    })
  } else {
    return []
  }
}

function fieldChange(value, df) {
  value = Array.isArray(value)
    ? value
    : typeof value === 'object' && value !== null && 'value' in value
      ? value.value
      : value
  if (isGridRow) {
    triggerOnChange(df.fieldname, value, data.value)
  } else {
    triggerOnChange(df.fieldname, value)
  }
}

function getDataValue(value, field) {
  if (field.fieldtype === 'Duration') {
    return value || 0
  }
  return value
}

function shouldApplyResolvedDefault(df) {
  if (!data.value) return false

  if (isGridRow) {
    if (!data.value.__islocal) return false
  } else if (!data.value.name) {
    return false
  }

  const value = data.value[df.fieldname]

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return value === undefined || value === null || value === ''
}

function getDefaultValue(defaultValue, fieldtype) {
  if (defaultValue === '__user') {
    return session.user
  }

  if (['Float', 'Currency', 'Percent'].includes(fieldtype)) {
    return flt(defaultValue)
  } else if (fieldtype === 'Check') {
    if (['1', 'true', 'True'].includes(defaultValue)) {
      return true
    } else if (['0', 'false', 'False'].includes(defaultValue)) {
      return false
    }
  } else if (fieldtype === 'Int') {
    return parseInt(defaultValue)
  } else if (defaultValue === 'Today' && fieldtype === 'Date') {
    return dayjs().format('YYYY-MM-DD')
  } else if (
    ['Now', 'now'].includes(defaultValue) &&
    fieldtype === 'Datetime'
  ) {
    return dayjs().format('YYYY-MM-DD HH:mm:ss')
  } else if (['Now', 'now'].includes(defaultValue) && fieldtype === 'Time') {
    return dayjs().format('HH:mm:ss')
  } else if (fieldtype === 'Date') {
    return dayjs(defaultValue).format('YYYY-MM-DD')
  } else if (fieldtype === 'Datetime') {
    return dayjs(defaultValue).format('YYYY-MM-DD HH:mm:ss')
  } else if (fieldtype === 'Time') {
    return dayjs(defaultValue).format('HH:mm:ss')
  }

  return defaultValue
}

// custom code
function handleButtonClick(df) {
  const handler = fieldButtonHandlers?.[df.fieldname]
  if (typeof handler === 'function') {
    // If this field is rendered inside a grid row, pass the row object (data.value)
    if (isGridRow) {
      return handler(data.value, df)
    }
    // Non-grid fields: call handler with df (or no args) depending on handler implementation
    return handler(df)
  }
  return fieldChange(data.value?.[df.fieldname], df)
}
// custom code

// custom code
function getAttachLabel(value) {
  if (!value) return ''
  const fileName = value.split('/').pop() || value
  return decodeURIComponent(fileName)
}

function getRows(df) {
  return fieldTextareaRowsMap?.[df.fieldname] ?? 4
}

function getHtmlFieldContent(df) {
  const renderer = fieldHtmlRenderers?.[df.fieldname]

  if (typeof renderer === 'function') {
    return renderer(data.value, df)
  }

  return df.options || ''
}


// custom code

</script>
<style scoped>
:deep(.form-control.prefix select) {
  padding-left: 2rem;
}
</style>

<!-- Customization added in this file -->