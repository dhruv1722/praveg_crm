import { formatDate } from '@/utils'

export function buildAIDataListHtml(doc) {
  const rows = getSortedRows(doc?.custom_ai_data_table || [])

  const tableStyle = [
    'width:100%',
    'border-collapse:collapse',
    'table-layout:fixed',
    'color:var(--ink-gray-8)',
    'font-size:13px',
  ].join(';')

  const cellStyle = [
    'border:1px solid var(--outline-gray-2)',
    'padding:6px 8px',
    'vertical-align:middle',
    'color:var(--ink-gray-8)',
  ].join(';')

  const headerStyle = [
    cellStyle,
    'background:var(--surface-gray-2)',
    'font-weight:600',
    'text-align:center',
  ].join(';')

  const body = rows.length
    ? rows
        .map((row, index) => {
          const dialogId = getDialogId(row, index)
          const rowNumber = rows.length - index
          const detailHtml = buildAIDataDetailTable(row?.ai_data_json)

          return `
            <tr>
              <td style="${cellStyle}; text-align:center;">${escapeHtml(rowNumber)}</td>
              <td style="${cellStyle}">${escapeHtml(formatDateTime(row.creation))}</td>
              <td style="${cellStyle}; text-align:center;">
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
                    width:min(1040px, 96vw);
                    height:min(84vh, 920px);
                    border:1px solid var(--outline-gray-2);
                    border-radius:12px;
                    padding:0;
                    background:var(--surface-modal);
                    color:var(--ink-gray-8);
                    overflow:hidden;
                  "
                >
                  <div style="padding:16px 18px; border-bottom:1px solid var(--outline-gray-2); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div>
                      <div style="font-size:16px; font-weight:600;">AI Data #${escapeHtml(rowNumber)}</div>
                      <div style="font-size:12px; color:var(--ink-gray-6); margin-top:4px;">
                        JSON rendered as table
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
                      height:calc(84vh - 70px);
                      overflow:auto;
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
        <td style="${cellStyle}; text-align:center;" colspan="3">
          No AI Data found
        </td>
      </tr>
    `

  return `
    <table style="${tableStyle}">
      <colgroup>
        <col style="width:12%">
        <col style="width:auto">
        <col style="width:96px">
      </colgroup>
      <tbody>
        <tr>
          <th style="${headerStyle}">No</th>
          <th style="${headerStyle}">Received At</th>
          <th style="${headerStyle}">Open</th>
        </tr>
        ${body}
      </tbody>
    </table>
  `
}

export function buildAIDataDetailTable(rawValue) {
  const parsed = parseJsonSafely(rawValue)
  const content = getRenderableValue(rawValue, parsed)

  if (content === null || content === undefined || content === '') {
    return `
      <div style="padding:12px; border:1px solid var(--outline-gray-2); border-radius:8px;">
        No AI data available
      </div>
    `
  }

  return `
    <div style="display:grid; gap:12px;">
      <div style="font-size:14px; font-weight:600;">AI Data</div>
      ${renderJsonNode(content, 0)}
    </div>
  `
}

function getRenderableValue(rawValue, parsedValue) {
  if (parsedValue !== null) return parsedValue
  if (typeof rawValue === 'string' && rawValue.trim()) return rawValue.trim()
  if (rawValue && typeof rawValue === 'object') return rawValue
  return null
}

function renderJsonNode(value, depth = 0) {
  if (Array.isArray(value)) {
    return renderArrayTable(value, depth)
  }

  if (isPlainObject(value)) {
    return renderObjectTable(value, depth)
  }

  return renderPrimitiveBlock(value)
}

function renderObjectTable(obj, depth = 0) {
  const entries = Object.entries(obj || {})

  if (!entries.length) {
    return renderPrimitiveBlock('-')
  }

  const rows = entries
    .map(([key, value]) => {
      const label = titleize(key)

      if (isComplexValue(value)) {
        return `
          <tr>
            <th colspan="2" style="${getSectionCellStyle(depth)}">${escapeHtml(label)}</th>
          </tr>
          <tr>
            <td colspan="2" style="${getValueWrapperStyle()}">
              ${renderJsonNode(value, depth + 1)}
            </td>
          </tr>
        `
      }

      return `
        <tr>
          <td style="${getLabelCellStyle()}">${escapeHtml(label)}</td>
          <td style="${getValueCellStyle()}">${formatPrimitive(value)}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table style="${getNestedTableStyle(depth)}">
      <tbody>${rows}</tbody>
    </table>
  `
}

function renderArrayTable(items, depth = 0) {
  if (!items.length) {
    return renderPrimitiveBlock('[]')
  }

  const rows = items
    .map((item, index) => {
      const itemLabel = `Item ${index + 1}`

      if (isComplexValue(item)) {
        return `
          <tr>
            <th colspan="2" style="${getSectionCellStyle(depth)}">${escapeHtml(itemLabel)}</th>
          </tr>
          <tr>
            <td colspan="2" style="${getValueWrapperStyle()}">
              ${renderJsonNode(item, depth + 1)}
            </td>
          </tr>
        `
      }

      return `
        <tr>
          <td style="${getLabelCellStyle()}">${escapeHtml(itemLabel)}</td>
          <td style="${getValueCellStyle()}">${formatPrimitive(item)}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table style="${getNestedTableStyle(depth)}">
      <tbody>${rows}</tbody>
    </table>
  `
}

function renderPrimitiveBlock(value) {
  return `
    <div
      style="
        padding:10px 12px;
        border:1px solid var(--outline-gray-2);
        border-radius:8px;
        background:var(--surface-gray-1);
        white-space:pre-wrap;
        word-break:break-word;
        text-align:left;
      "
    >
      ${formatPrimitive(value)}
    </div>
  `
}

function formatPrimitive(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return escapeHtml(String(value))
}

function isComplexValue(value) {
  return Array.isArray(value) || isPlainObject(value)
}

function getNestedTableStyle(depth = 0) {
  const margin = depth === 0 ? '0' : '4px 0 0'
  return [
    'width:100%',
    'border-collapse:collapse',
    'table-layout:fixed',
    'font-size:13px',
    'color:var(--ink-gray-8)',
    `margin:${margin}`,
  ].join(';')
}

function getLabelCellStyle() {
  return [
    'width:28%',
    'border:1px solid var(--outline-gray-2)',
    'padding:8px 10px',
    'vertical-align:top',
    'font-weight:600',
    'background:var(--surface-gray-1)',
    'text-align:left',
    'word-break:break-word',
  ].join(';')
}

function getValueCellStyle() {
  return [
    'border:1px solid var(--outline-gray-2)',
    'padding:8px 10px',
    'vertical-align:top',
    'text-align:left',
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';')
}

function getValueWrapperStyle() {
  return [
    'border:1px solid var(--outline-gray-2)',
    'padding:8px',
    'vertical-align:top',
    'text-align:left',
  ].join(';')
}

function getSectionCellStyle(depth = 0) {
  const backgrounds = [
    'var(--surface-gray-2)',
    'var(--surface-gray-1)',
    'var(--surface-gray-2)',
  ]

  return [
    'border:1px solid var(--outline-gray-2)',
    'padding:8px 10px',
    'text-align:left',
    'font-weight:700',
    `background:${backgrounds[depth % backgrounds.length]}`,
    'word-break:break-word',
  ].join(';')
}

function parseJsonSafely(value) {
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

function titleize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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
