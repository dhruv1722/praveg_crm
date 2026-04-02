import { formatDate } from '@/utils'

const ALLOWED_SECTIONS = ['processing', 'ai_insights', 'transcript']

const EXPECTED_AI_PAYLOAD_FIELDS = [
  { key: 'lead_id', label: 'Lead ID', paths: [['lead_id']] },
  { key: 'call_log_id', label: 'Call Log ID', paths: [['call_log_id']] },
  { key: 'mobile_no', label: 'Mobile No', paths: [['person', 'mobile_no'], ['mobile_no']] },
  { key: 'user_type', label: 'User Type', paths: [['person', 'user_type'], ['user_type']] },
  { key: 'salutation', label: 'Salutation', paths: [['person', 'salutation'], ['salutation']] },
  { key: 'first_name', label: 'First Name', paths: [['person', 'first_name'], ['first_name']] },
  { key: 'last_name', label: 'Last Name', paths: [['person', 'last_name'], ['last_name']] },
  { key: 'email', label: 'Email', paths: [['person', 'email'], ['email']] },
  { key: 'city', label: 'City', paths: [['person', 'city'], ['city']] },
  { key: 'state', label: 'State', paths: [['person', 'state'], ['state']] },
  { key: 'country', label: 'Country', paths: [['person', 'country'], ['country']] },
  { key: 'pincode', label: 'Pincode', paths: [['person', 'pincode'], ['pincode']] },
  { key: 'hotel_property', label: 'Hotel Property', paths: [['booking', 'hotel_property'], ['hotel_property']] },
  { key: 'check_in', label: 'Check In', paths: [['booking', 'check_in'], ['check_in']] },
  { key: 'check_out', label: 'Check Out', paths: [['booking', 'check_out'], ['check_out']] },
]

const EXPECTED_GUEST_ROWS = [
  {
    type: 'Room',
    fields: [
      { key: 'room_category', label: 'Room Category' },
      { key: 'no_of_rooms', label: 'No Of Rooms' },
      { key: 'extra_beds', label: 'Extra Beds' },
      { key: 'adult', label: 'Adult' },
      { key: 'child', label: 'Child' },
      { key: 'first_child_age', label: 'First Child Age' },
      { key: 'second_child_age', label: 'Second Child Age' },
    ],
  },
  {
    type: 'Meal',
    fields: [
      { key: 'meal_plan', label: 'Meal Plan' },
      { key: 'number_of_meal_persons', label: 'Number Of Meal Persons' },
    ],
  },
  {
    type: 'Package',
    fields: [
      { key: 'package', label: 'Package' },
      { key: 'total_package', label: 'Total Package' },
    ],
  },
]


export function buildAIDataListHtml(doc) {
  const rows = getSortedRows(doc?.custom_ai_data_table || [])

  const tableStyle = [
    'width:100%',
    'border-collapse:collapse',
    'table-layout:fixed',
    'color:var(--ink-gray-8)',
    'font-size:13px;',
  ].join(';')

  const cellStyle = [
    'border:1px solid var(--outline-gray-2)',
    'padding:6px 8px',
    'vertical-align:middle',
    'color:var(--ink-gray-8);',
  ].join(';')

  const headerStyle = [
    cellStyle,
    'background:var(--surface-gray-2)',
    'font-weight:600',
    'text-align:center;',
  ].join(';')

  const body = rows.length
    ? rows
      .map((row, index) => {
        const dialogId = getDialogId(row, index)
        const data = getRowJson(row)
        const coverage = getPayloadCoverage(data)
        const detailHtml = buildAIDataDetailTable(data)

        return `
            <tr>
              <td style="${cellStyle} text-align:center;">${escapeHtml(index + 1)}</td>
              <td style="${cellStyle}">${escapeHtml(formatDateTime(row.creation))}</td>
              <td style="${cellStyle}">${escapeHtml(row.owner || '-')}</td>
              <td style="${cellStyle} text-align:center;">${escapeHtml(`${coverage.ratio}%`)}</td>
              <td style="${cellStyle} text-align:center;">
                <button
                  type="button"
                  onclick="document.getElementById('${dialogId}').showModal()"
                  title="Open AI data"
                  style="
                    border:0;
                    background:transparent;
                    cursor:pointer;
                    padding:0;
                    color:var(--ink-blue-3);
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                  "
                >
                  ${getOpenIcon()}
                </button>

                <dialog
                  id="${dialogId}"
                  style="
                    width:min(980px, 94vw);
                    height:min(82vh, 900px);
                    border:1px solid var(--outline-gray-2);
                    border-radius:12px;
                    padding:0;
                    background:var(--surface-modal);
                    color:var(--ink-gray-8);
                    overflow:hidden;
                  "
                >
                  <div style="padding:16px 18px;border-bottom:1px solid var(--outline-gray-2);display:flex;align-items:center;justify-content:space-between;gap:12px;">
                    <div>
                      <div style="font-size:16px;font-weight:600;">AI Data #${escapeHtml(index + 1)}</div>
                      <div style="font-size:12px;color:var(--ink-gray-6);margin-top:4px;">
                        Field Coverage: ${escapeHtml(`${coverage.receivedCount}/${coverage.totalCount} (${coverage.ratio}%)`)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onclick="document.getElementById('${dialogId}').close()"
                      style="
                        border:0;
                        background:transparent;
                        cursor:pointer;
                        font-size:20px;
                        line-height:1;
                        color:var(--ink-gray-6);
                      "
                    >
                      &times;
                    </button>
                  </div>

                  <div
                    style="
                      padding:16px 18px;
                      height:calc(82vh - 70px);
                      overflow-y:auto;
                      overflow-x:hidden;
                      box-sizing:border-box;
                    "
                  >
                    ${detailHtml}
                  </div>
                </dialog>
              </td>
            </tr>
          `
      })
      .join('')
    : `
      <tr>
        <td style="${cellStyle} text-align:center;" colspan="5">
          No AI Data found
        </td>
      </tr>
    `

  return `
    <table style="${tableStyle}">
      <colgroup>
        <col style="width:8%">
        <col style="width:24%">
        <col style="width:24%">
        <col style="width:14%">
        <col style="width:96px">
      </colgroup>
      <tbody>
        <tr>
          <th style="${headerStyle}">No</th>
          <th style="${headerStyle}">Received At</th>
          <th style="${headerStyle}">Received By</th>
          <th style="${headerStyle}">Coverage</th>
          <th style="${headerStyle}">Open</th>
        </tr>
        ${body}
      </tbody>
    </table>
  `
}


export function buildAIDataDetailTable(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return `
      <div style="padding:12px;border:1px solid var(--outline-gray-2);border-radius:8px;">
        No AI data available
      </div>
    `
  }

  const coverage = getPayloadCoverage(data)

  return `
    <div style="display:grid;gap:16px;">
      ${buildCoverageSummaryHtml(coverage)}
      ${buildPayloadComparisonTable(coverage.rows)}
      ${buildAIStructuredDataTable(data)}
    </div>
  `
}


function buildAIStructuredDataTable(data) {
  const tableStyle = [
    'width:100%',
    'border-collapse:collapse',
    'color:var(--ink-gray-8)',
    'font-size:13px;',
  ].join(';')

  const cellStyle = [
    'border:1px solid var(--outline-gray-2)',
    'padding:6px 8px',
    'vertical-align:top',
    'color:var(--ink-gray-8);',
  ].join(';')

  const labelCellStyle = [cellStyle, 'text-align:left', 'font-weight:600;'].join(';')
  const valueCellStyle = [
    cellStyle,
    'text-align:left',
    'white-space:pre-wrap',
    'word-break:break-word;',
  ].join(';')

  const sectionStyle = [
    'text-align:center',
    'font-weight:600',
    'background:var(--surface-gray-2);',
  ].join(';')

  const subsectionStyle = [
    'text-align:center',
    'font-weight:600',
    'background:var(--surface-gray-2);',
  ].join(';')

  const rows = []

  for (const section of ALLOWED_SECTIONS) {
    const sectionData = data?.[section]
    if (!isPlainObject(sectionData)) continue

    rows.push(
      `<tr><th colspan="2" style="${cellStyle}${sectionStyle}">${escapeHtml(titleize(section))}</th></tr>`,
    )

    for (const [key, value] of Object.entries(sectionData)) {
      if (isPlainObject(value)) {
        rows.push(
          `<tr><th colspan="2" style="${cellStyle}${subsectionStyle}">${escapeHtml(titleize(key))}</th></tr>`,
        )

        for (const [subKey, subValue] of Object.entries(value)) {
          rows.push(
            `<tr>
              <td style="${labelCellStyle}">${escapeHtml(titleize(subKey))}</td>
              <td style="${valueCellStyle}">${formatValue(subValue)}</td>
            </tr>`,
          )
        }
      } else {
        rows.push(
          `<tr>
            <td style="${labelCellStyle}">${escapeHtml(titleize(key))}</td>
            <td style="${valueCellStyle}">${formatValue(value)}</td>
          </tr>`,
        )
      }
    }
  }

  if (!rows.length) {
    rows.push(
      `<tr><td style="${cellStyle} text-align:center;" colspan="2">No AI Data available</td></tr>`,
    )
  }

  return `
    <div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px;">AI Sections</div>
      <table style="${tableStyle}">
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `
}


function getPayloadCoverage(data) {
  const mainRows = EXPECTED_AI_PAYLOAD_FIELDS.map((field) => {
    const value = getFirstAvailableValue(data, field.paths)
    const received = hasMeaningfulValue(value)

    return {
      key: field.key,
      label: field.label,
      received,
      value,
    }
  })

  const guestRows = getGuestCoverageRows(data)
  const rows = [...mainRows, ...guestRows]

  const totalCount = rows.length
  const receivedCount = rows.filter((row) => row.received).length
  const ratio = totalCount ? Math.round((receivedCount / totalCount) * 100) : 0

  return {
    rows,
    totalCount,
    receivedCount,
    ratio,
  }
}

function getGuestCoverageRows(data) {
  const guestRows = Array.isArray(data?.booking?.guest)
    ? data.booking.guest
    : Array.isArray(data?.guest)
      ? data.guest
      : []

  const coverageRows = []

  for (const guestConfig of EXPECTED_GUEST_ROWS) {
    const guestRow = findGuestRowByType(guestRows, guestConfig.type)

    for (const field of guestConfig.fields) {
      const value = guestRow?.[field.key]
      const received = hasMeaningfulValue(value)

      coverageRows.push({
        key: `guest_${guestConfig.type.toLowerCase()}_${field.key}`,
        label: `${guestConfig.type} - ${field.label}`,
        received,
        value,
      })
    }
  }

  return coverageRows
}

function findGuestRowByType(rows, type) {
  return rows.find((row) => String(row?.type || '').trim().toLowerCase() === type.toLowerCase()) || null
}



function getFirstAvailableValue(source, paths) {
  for (const path of paths) {
    const value = getValueByPath(source, path)
    if (hasMeaningfulValue(value)) return value
  }

  return null
}

function getValueByPath(source, path) {
  let current = source

  for (const segment of path) {
    if (!current || typeof current !== 'object') return undefined
    current = current[segment]
  }

  return current
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (isPlainObject(value)) return Object.keys(value).length > 0
  return true
}

function buildCoverageSummaryHtml(coverage) {
  return `
    <div style="padding:12px 14px;border:1px solid var(--outline-gray-2);border-radius:8px;background:var(--surface-gray-1);">
      <div style="font-size:14px;font-weight:600;">Payload Coverage Summary</div>
      <div style="margin-top:6px;font-size:13px;color:var(--ink-gray-7);">
        ${escapeHtml(`${coverage.receivedCount} of ${coverage.totalCount} expected fields received`)}
      </div>
      <div style="margin-top:4px;font-size:18px;font-weight:700;color:var(--ink-blue-3);">
        ${escapeHtml(`${coverage.ratio}%`)}
      </div>
    </div>
  `
}

function buildPayloadComparisonTable(rows) {
  const tableStyle = [
    'width:100%',
    'border-collapse:collapse',
    'color:var(--ink-gray-8)',
    'font-size:13px;',
  ].join(';')

  const cellStyle = [
    'border:1px solid var(--outline-gray-2)',
    'padding:6px 8px',
    'vertical-align:top',
    'color:var(--ink-gray-8);',
  ].join(';')

  const headerStyle = [
    cellStyle,
    'background:var(--surface-gray-2)',
    'font-weight:600',
    'text-align:center;',
  ].join(';')

  const body = rows
    .map((row) => {
      return `
        <tr>
          <td style="${cellStyle} font-weight:600;">${escapeHtml(row.label)}</td>
          <td style="${cellStyle}">${row.received ? formatCoverageValue(row.key, row.value) : '-'}</td>
          <td style="${cellStyle} text-align:center;">${row.received ? '-' : 'Yes'}</td>
        </tr>
      `
    })
    .join('')

  return `
    <div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Expected Field Comparison</div>
      <table style="${tableStyle}">
        <colgroup>
          <col style="width:28%">
          <col style="width:52%">
          <col style="width:20%">
        </colgroup>
        <tbody>
          <tr>
            <th style="${headerStyle}">Field</th>
            <th style="${headerStyle}">Received</th>
            <th style="${headerStyle}">Not Received</th>
          </tr>
          ${body}
        </tbody>
      </table>
    </div>
  `
}

function formatCoverageValue(fieldKey, value) {
  if (!hasMeaningfulValue(value)) return '-'

  if (Array.isArray(value)) {
    return value.map((item) => escapeHtml(String(item))).join('<br>')
  }

  if (isPlainObject(value)) {
    return escapeHtml(JSON.stringify(value))
  }

  return escapeHtml(String(value))
}



function getSortedRows(rows) {
  return [...rows].sort((a, b) => {
    const aCreation = toTimestamp(a?.creation)
    const bCreation = toTimestamp(b?.creation)
    if (aCreation !== bCreation) return bCreation - aCreation

    const aIdx = Number(a?.idx || 0)
    const bIdx = Number(b?.idx || 0)
    return bIdx - aIdx
  })
}

function getRowJson(row) {
  const value = row?.ai_data_json

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  if (value && typeof value === 'object') {
    return value
  }

  return null
}

function titleize(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatValue(value) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) {
    return '-'
  }

  if (Array.isArray(value)) {
    return value.map((item) => escapeHtml(item)).join('<br>')
  }

  if (isPlainObject(value)) {
    return escapeHtml(JSON.stringify(value))
  }

  return escapeHtml(String(value))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getDialogId(row, index) {
  return `ai-data-dialog-${escapeId(row?.name || row?.idx || index + 1)}`
}

function formatDateTime(value) {
  if (!value) return '-'
  return formatDate(value, 'DD/MM/YYYY, hh:mm:ss A')
}

function escapeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getOpenIcon() {
  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `
}
