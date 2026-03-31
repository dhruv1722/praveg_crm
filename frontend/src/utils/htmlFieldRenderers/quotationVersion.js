export function buildQuotationVersionHtml(doc) {
  const versions = [...(doc?.custom_quotation_version || [])].sort(
    (a, b) => Number(b.version || 0) - Number(a.version || 0),
  )

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
    'vertical-align:top',
    'color:var(--ink-gray-8);',
  ].join(';')

  const headerStyle = [
    cellStyle,
    'background:var(--surface-gray-2)',
    'font-weight:600',
    'text-align:center;',
  ].join(';')

  const linkStyle = [
    'color:var(--ink-blue-3)',
    'text-decoration:none',
    'font-weight:500;',
  ].join(';')

  const versionColumnStyle = 'width:10%;'
  const fileColumnStyle = 'width:auto;'

  const rows = versions.length
    ? versions
      .map((row) => {
        const fileUrl = row.file_url || '#'
        const fileName = getFileName(fileUrl)

        return `
            <tr>
              <td style="${cellStyle} text-align:center;">
                ${escapeHtml(row.version || '-')}
              </td>
              <td style="${cellStyle}">
                <a
                  href="${escapeAttribute(fileUrl)}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="${linkStyle}"
                  title="${escapeAttribute(fileName)}"
                >
                  ${escapeHtml(fileName)}
                </a>
              </td>
            </tr>
          `
      })
      .join('')
    : `
      <tr>
        <td style="${cellStyle} text-align:center;" colspan="2">
          No quotation versions found
        </td>
      </tr>
    `

  return `
    <table style="${tableStyle}">
      <colgroup>
        <col style="${versionColumnStyle}">
        <col style="${fileColumnStyle}">
      </colgroup>
      <tbody>
        <tr>
          <th style="${headerStyle}">Version</th>
          <th style="${headerStyle}">File</th>
        </tr>
        ${rows}
      </tbody>
    </table>
  `
}

function getFileName(value) {
  if (!value) return '-'
  const fileName = value.split('/').pop() || value
  try {
    return decodeURIComponent(fileName)
  } catch {
    return fileName
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value) {
  return escapeHtml(value)
}
