const ALLOWED_SECTIONS = ['processing', 'ai_insights', 'transcript']

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

  const indexColumnStyle = 'width:10%;'
  const actionColumnStyle = 'width:96px;'

  const body = rows.length
    ? rows
        .map((row, index) => {
          const dialogId = getDialogId(row, index)
          const detailHtml = buildAIDataDetailTable(getRowJson(row))

          return `
            <tr>
              <td style="${cellStyle} text-align:center;">
                ${escapeHtml(index + 1)}
              </td>
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
                    width:min(920px, 92vw);
                    max-height:82vh;
                    border:1px solid var(--outline-gray-2);
                    border-radius:12px;
                    padding:0;
                    background:var(--surface-modal);
                    color:var(--ink-gray-8);
                  "
                >
                  <div style="padding:16px 18px;border-bottom:1px solid var(--outline-gray-2);display:flex;align-items:center;justify-content:space-between;gap:12px;">
                    <div style="font-size:16px;font-weight:600;">AI Data #${escapeHtml(index + 1)}</div>
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

                  <div style="padding:16px 18px;max-height:calc(82vh - 70px);overflow:auto;">
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
        <td style="${cellStyle} text-align:center;" colspan="2">
          No AI Data found
        </td>
      </tr>
    `

  return `
    <table style="${tableStyle}">
      <colgroup>
        <col style="${indexColumnStyle}">
        <col style="${actionColumnStyle}">
      </colgroup>
      <tbody>
        <tr>
          <th style="${headerStyle}">No</th>
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

  const sectionStyle = [
    'text-align:center',
    'font-weight:600',
    'background:var(--surface-gray-2);',
  ].join(';')

  const subsectionStyle = [
    'font-weight:600',
    'background:var(--surface-gray-1);',
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
              <td style="${cellStyle}">${escapeHtml(titleize(subKey))}</td>
              <td style="${cellStyle}">${formatValue(subValue)}</td>
            </tr>`,
          )
        }
      } else {
        rows.push(
          `<tr>
            <td style="${cellStyle}">${escapeHtml(titleize(key))}</td>
            <td style="${cellStyle}">${formatValue(value)}</td>
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

  return `<table style="${tableStyle}"><tbody>${rows.join('')}</tbody></table>`
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
