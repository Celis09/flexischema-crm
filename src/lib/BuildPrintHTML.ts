// buildPrintHTML.js
// Generates a self-contained HTML print-preview page from contacts data.
// Usage: const html = buildPrintHTML(selectedCols, contacts, definitions)

import { Contact, ExtraFieldDefinition } from "@/types";

const BUILTIN_LABELS: Record<string, string> = {
  id:          "ID",
  name:        "Name",
  email:       "Email",
  status:      "Status",
  createdDate: "Created Date",
};

// Extracts the numeric part from IDs like "extra-99" → "99"
function normalizeColId(colId: string) {
  return colId.startsWith("extra-") ? colId.slice(6) : colId;
}

function getLabel(colId: string, definitions: ExtraFieldDefinition[]) {
  if (BUILTIN_LABELS[colId]) return BUILTIN_LABELS[colId];
  const normalized = normalizeColId(colId);
  const def = definitions.find(
    d =>
      d.fieldName === colId ||
      String(d.extraFieldDefinitionId) === normalized ||
      String(d.extraFieldDefinitionId) === colId
  );
  return def?.fieldName ?? colId;
}

function getCellValue(contact: Contact, colId: string) {
  if (colId === "id")          return String(contact.id ?? "");
  if (colId === "name")        return contact.name  ?? "";
  if (colId === "email")       return contact.email ?? "";
  if (colId === "status")      return String(contact.status ?? "");
  if (colId === "createdDate") {
    if (!contact.createdDate) return "";
    const d = new Date(contact.createdDate);
    return isNaN(d.getTime()) ? String(contact.createdDate) : d.toLocaleDateString();
  }
  const normalized = normalizeColId(colId);
  const ef = (contact.extraFields ?? []).find(
    f =>
      f.fieldName === colId ||
      String(f.extraFieldDefinitionId) === normalized ||
      String(f.extraFieldDefinitionId) === colId
  );
  return ef?.fieldValue ?? "";
}

function esc(str: any) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPrintHTML(columns: string[], contacts: Contact[], definitions: ExtraFieldDefinition[]) {
  const printedAt = new Date().toLocaleString();
  const count     = contacts.length;

  const headerCells = columns
    .map(id => `<th>${esc(getLabel(id, definitions))}</th>`)
    .join("");

  const bodyRows = contacts
    .map((c, i) => {
      const cells = columns.map(id => `<td>${esc(getCellValue(c, id))}</td>`).join("");
      return `<tr class="${i % 2 === 0 ? "even" : "odd"}">${cells}</tr>`;
    })
    .join("\n");

  const colCount = columns.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contacts – Print Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #111;
      background: #fff;
      padding: 28px 32px;
    }

    /* ── Toolbar (hidden when printing) ── */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .btn-print {
  margin-left: auto; 
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.2px;
  transition: background 0.15s;
}
.btn-print:hover { background: #333; }

    .btn-close {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: transparent;
      color: #555;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-close:hover { border-color: #999; color: #111; }

    .record-count {
      margin-right: auto;
      font-size: 12px;
      color: #777;
    }

    /* ── Header ── */
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 2px solid #111;
    }

    header h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.4px;
    }

    header h1 span {
      font-weight: 300;
      color: #555;
    }

    .meta {
      font-size: 11px;
      color: #666;
      text-align: right;
      line-height: 1.6;
    }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }

    thead tr {
      background: #111;
    }

    th {
      color: #fff;
      text-align: left;
      padding: 7px 10px;
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      padding: 5px 10px;
      border-bottom: 1px solid #e8e8e8;
      vertical-align: top;
      word-break: break-word;
      max-width: 260px;
    }

    tr.even td  { background: #f8f8f8; }
    tr.odd  td  { background: #fff; }
    tbody tr:hover td { background: #eef3ff; }

    /* ── Footer row ── */
    tfoot td {
      padding-top: 10px;
      font-size: 11px;
      color: #999;
      border-top: 1px solid #ddd;
      border-bottom: none;
      background: transparent !important;
    }

    /* ── Status badge ── */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .badge-active   { background: #dcfce7; color: #166534; }
    .badge-inactive { background: #fef9c3; color: #854d0e; }
    .badge-archived { background: #f1f5f9; color: #64748b; }

    /* ── Print media ── */
    @media print {
      body { padding: 0; }
      .toolbar { display: none; }
      tbody tr:hover td { background: inherit; }

      @page {
        margin: 12mm 10mm;
        size: landscape;
      }

      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>

<div class="toolbar">
  <button class="btn-print" onclick="window.print()">⎙&nbsp; Print</button>
  <button class="btn-close" onclick="window.close()">✕&nbsp; Close</button>
</div>

  <header>
    <h1>Contacts <span>Directory</span></h1>
    <div class="meta">
      <div>Printed ${esc(printedAt)}</div>
      <div>${count} record${count !== 1 ? "s" : ""} · ${colCount} column${colCount !== 1 ? "s" : ""}</div>
    </div>
  </header>

  <table>
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="${colCount}">
          ${count} record${count !== 1 ? "s" : ""} exported · Generated ${esc(printedAt)}
        </td>
      </tr>
    </tfoot>
  </table>

</body>
</html>`;
}
