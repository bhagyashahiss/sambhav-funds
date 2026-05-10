import * as XLSX from "xlsx";
import { formatDate } from "./utils";

interface ExportTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  donor_name: string | null;
  donor_phone: string | null;
  payment_mode: string | null;
  transaction_date: string | null;
  incident_date: string | null;
  created_at: string;
  member_id: string;
  event_id: string | null;
  member: { name: string } | null;
  event: {
    name: string;
    date: string;
    category_id: string;
    category: { name: string } | null;
  } | null;
  expense_lines: { id: string; item_name: string; amount: number }[];
}

interface ExportCategory {
  id: string;
  name: string;
}

interface ExportEvent {
  id: string;
  name: string;
  date: string;
  category_id: string;
  category?: { name: string } | null;
}

interface ExportMember {
  id: string;
  name: string;
}

interface ExportOptions {
  filterType: "all" | "event" | "category";
  filterId?: string;
  filterName?: string;
}

export function exportToExcel(
  fullTransactions: ExportTransaction[],
  categories: ExportCategory[],
  events: ExportEvent[],
  members: ExportMember[],
  options: ExportOptions
) {
  let txns = [...fullTransactions];
  let fileLabel = "All_Data";

  // Apply filter
  if (options.filterType === "event" && options.filterId) {
    txns = txns.filter((t) => t.event_id === options.filterId);
    fileLabel = `Event_${(options.filterName || "").replace(/[^a-zA-Z0-9]/g, "_")}`;
  } else if (options.filterType === "category" && options.filterId) {
    txns = txns.filter((t) => t.event?.category_id === options.filterId);
    fileLabel = `Category_${(options.filterName || "").replace(/[^a-zA-Z0-9]/g, "_")}`;
  }

  const wb = XLSX.utils.book_new();

  // ---- 1. SUMMARY SHEET ----
  buildSummarySheet(wb, txns, categories, events, members, options);

  // ---- 2. INCOME SHEET ----
  buildIncomeSheet(wb, txns);

  // ---- 3. EXPENSE SHEET ----
  buildExpenseSheet(wb, txns);

  // ---- 4. TRANSFERS SHEET ----
  buildTransfersSheet(wb, txns);

  // ---- 5. RECEIVABLES SHEET ----
  buildReceivablesSheet(wb, txns);

  // ---- 6. PAYABLES SHEET ----
  buildPayablesSheet(wb, txns);

  // Generate and download
  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `Sambhav_Funds_${fileLabel}_${today}.xlsx`);
}

function buildSummarySheet(
  wb: XLSX.WorkBook,
  txns: ExportTransaction[],
  categories: ExportCategory[],
  events: ExportEvent[],
  members: ExportMember[],
  options: ExportOptions
) {
  const rows: any[][] = [];

  // Overall Summary
  const totalIncome = txns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const receivableTotal = txns.filter((t) => t.type === "income" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);
  const payableTotal = txns.filter((t) => t.type === "expense" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);
  const settledIncome = totalIncome - receivableTotal;
  const settledExpense = totalExpense - payableTotal;

  rows.push(["SAMBHAV FUNDS - REPORT SUMMARY"]);
  rows.push(["Generated On", new Date().toLocaleString("en-IN")]);
  if (options.filterType !== "all") {
    rows.push(["Filter", `${options.filterType === "event" ? "Event" : "Category"}: ${options.filterName}`]);
  }
  rows.push([]);
  rows.push(["OVERALL SUMMARY"]);
  rows.push(["Total Income", totalIncome]);
  rows.push(["Total Expense", totalExpense]);
  rows.push(["Net Balance", totalIncome - totalExpense]);
  rows.push([]);
  rows.push(["Settled Income (Received)", settledIncome]);
  rows.push(["Settled Expense (Paid)", settledExpense]);
  rows.push(["Pending Receivables", receivableTotal]);
  rows.push(["Pending Payables", payableTotal]);
  rows.push(["Total Transactions", txns.length]);
  rows.push([]);

  // Category-wise summary
  rows.push(["CATEGORY-WISE SUMMARY"]);
  rows.push(["Category", "Income", "Expense", "Balance", "Receivable", "Payable"]);

  const relevantCatIds = new Set(txns.map((t) => t.event?.category_id).filter(Boolean));
  const filteredCats = options.filterType === "category" && options.filterId
    ? categories.filter((c) => c.id === options.filterId)
    : categories.filter((c) => relevantCatIds.has(c.id));

  for (const cat of filteredCats) {
    const catTxns = txns.filter((t) => t.event?.category_id === cat.id);
    const inc = catTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const exp = catTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const recv = catTxns.filter((t) => t.type === "income" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);
    const pay = catTxns.filter((t) => t.type === "expense" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);
    rows.push([cat.name, inc, exp, inc - exp, recv, pay]);
  }
  rows.push([]);

  // Event-wise summary
  rows.push(["EVENT-WISE SUMMARY"]);
  rows.push(["Event", "Category", "Event Date", "Income", "Expense", "Balance", "Receivable", "Payable"]);

  const relevantEventIds = new Set(txns.map((t) => t.event_id).filter(Boolean));
  const filteredEvts = options.filterType === "event" && options.filterId
    ? events.filter((e) => e.id === options.filterId)
    : events.filter((e) => relevantEventIds.has(e.id));

  for (const evt of filteredEvts) {
    const evtTxns = txns.filter((t) => t.event_id === evt.id);
    const inc = evtTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const exp = evtTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const recv = evtTxns.filter((t) => t.type === "income" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);
    const pay = evtTxns.filter((t) => t.type === "expense" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);
    rows.push([evt.name, evt.category?.name || "", evt.date, inc, exp, inc - exp, recv, pay]);
  }
  rows.push([]);

  // Member-wise summary
  rows.push(["MEMBER-WISE SUMMARY"]);
  rows.push(["Member", "Collected (Income)", "Spent (Expense)", "Holding"]);

  for (const mem of members) {
    const memTxns = txns.filter((t) => t.member_id === mem.id);
    if (memTxns.length === 0) continue;
    const collected = memTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const spent = memTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    rows.push([mem.name, collected, spent, collected - spent]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoFitColumns(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, "Summary");
}

function buildIncomeSheet(wb: XLSX.WorkBook, txns: ExportTransaction[]) {
  const incomeTxns = txns.filter((t) => t.type === "income");

  const headers = [
    "Date", "Donor Name", "Donor Phone", "Amount (₹)", "Description",
    "Payment Mode", "Event", "Category", "Collected By", "Status",
    "Created At"
  ];

  const rows = incomeTxns.map((t) => [
    t.transaction_date || "",
    t.donor_name || "",
    t.donor_phone || "",
    Number(t.amount),
    t.description || "",
    (t.payment_mode || "cash").toUpperCase(),
    t.event?.name || "(No Event)",
    t.event?.category?.name || "",
    t.member?.name || "",
    t.transaction_date ? "Received" : "Receivable",
    t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : "",
  ]);

  // Totals row
  const totalAmount = incomeTxns.reduce((s, t) => s + Number(t.amount), 0);
  rows.push(["", "", "TOTAL", totalAmount, "", "", "", "", "", "", ""]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoFitColumns(ws, [headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Income");
}

function buildExpenseSheet(wb: XLSX.WorkBook, txns: ExportTransaction[]) {
  const expenseTxns = txns.filter((t) => t.type === "expense");

  const headers = [
    "Date", "Description", "Amount (₹)", "Expense Items",
    "Payment Mode", "Event", "Category", "Spent By", "Status",
    "Created At"
  ];

  const rows = expenseTxns.map((t) => {
    const itemsStr = (t.expense_lines || [])
      .map((l) => `${l.item_name}: ₹${Number(l.amount)}`)
      .join("; ");
    return [
      t.transaction_date || "",
      t.description || "",
      Number(t.amount),
      itemsStr,
      (t.payment_mode || "cash").toUpperCase(),
      t.event?.name || "(No Event)",
      t.event?.category?.name || "",
      t.member?.name || "",
      t.transaction_date ? "Paid" : "Payable",
      t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : "",
    ];
  });

  const totalAmount = expenseTxns.reduce((s, t) => s + Number(t.amount), 0);
  rows.push(["", "TOTAL", totalAmount, "", "", "", "", "", "", ""]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoFitColumns(ws, [headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Expense");
}

function buildTransfersSheet(wb: XLSX.WorkBook, txns: ExportTransaction[]) {
  // Transfers are expense + income pairs with description like "Transfer: X → Y"
  const transferTxns = txns.filter(
    (t) => t.description && t.description.startsWith("Transfer:")
  );

  const headers = [
    "Date", "Description", "Type", "Amount (₹)", "Member",
    "Payment Mode", "Created At"
  ];

  const rows = transferTxns.map((t) => [
    t.transaction_date || "",
    t.description || "",
    t.type === "expense" ? "Sent" : "Received",
    Number(t.amount),
    t.member?.name || "",
    (t.payment_mode || "cash").toUpperCase(),
    t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : "",
  ]);

  if (rows.length === 0) {
    rows.push(["No transfers found", "", "", "", "", "", ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoFitColumns(ws, [headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Transfers");
}

function buildReceivablesSheet(wb: XLSX.WorkBook, txns: ExportTransaction[]) {
  const receivables = txns.filter((t) => t.type === "income" && !t.transaction_date);

  const headers = [
    "Donor Name", "Donor Phone", "Amount (₹)", "Description",
    "Payment Mode", "Event", "Category", "Assigned To (Member)",
    "Created At"
  ];

  const rows = receivables.map((t) => [
    t.donor_name || "",
    t.donor_phone || "",
    Number(t.amount),
    t.description || "",
    (t.payment_mode || "cash").toUpperCase(),
    t.event?.name || "(No Event)",
    t.event?.category?.name || "",
    t.member?.name || "",
    t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : "",
  ]);

  const totalAmount = receivables.reduce((s, t) => s + Number(t.amount), 0);
  if (rows.length > 0) {
    rows.push(["", "TOTAL", totalAmount, "", "", "", "", "", ""]);
  } else {
    rows.push(["No pending receivables", "", "", "", "", "", "", "", ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoFitColumns(ws, [headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Receivables");
}

function buildPayablesSheet(wb: XLSX.WorkBook, txns: ExportTransaction[]) {
  const payables = txns.filter((t) => t.type === "expense" && !t.transaction_date);

  const headers = [
    "Description", "Amount (₹)", "Expense Items",
    "Payment Mode", "Event", "Category", "Assigned To (Member)",
    "Created At"
  ];

  const rows = payables.map((t) => {
    const itemsStr = (t.expense_lines || [])
      .map((l) => `${l.item_name}: ₹${Number(l.amount)}`)
      .join("; ");
    return [
      t.description || "",
      Number(t.amount),
      itemsStr,
      (t.payment_mode || "cash").toUpperCase(),
      t.event?.name || "(No Event)",
      t.event?.category?.name || "",
      t.member?.name || "",
      t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : "",
    ];
  });

  const totalAmount = payables.reduce((s, t) => s + Number(t.amount), 0);
  if (rows.length > 0) {
    rows.push(["TOTAL", totalAmount, "", "", "", "", "", ""]);
  } else {
    rows.push(["No pending payables", "", "", "", "", "", "", ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoFitColumns(ws, [headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Payables");
}

export function exportAllCombined(
  fullTransactions: ExportTransaction[],
  categories: ExportCategory[],
  events: ExportEvent[],
  members: ExportMember[]
) {
  const wb = XLSX.utils.book_new();
  const allTxns = [...fullTransactions];

  // 1. Overall Summary sheet
  buildSummarySheet(wb, allTxns, categories, events, members, { filterType: "all" });

  // 2. Per-category sheets (summary + income + expense)
  for (const cat of categories) {
    const catTxns = allTxns.filter((t) => t.event?.category_id === cat.id);
    if (catTxns.length === 0) continue;
    const sheetName = sanitizeSheetName(cat.name);

    const inc = catTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const exp = catTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const recv = catTxns.filter((t) => t.type === "income" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);
    const pay = catTxns.filter((t) => t.type === "expense" && !t.transaction_date).reduce((s, t) => s + Number(t.amount), 0);

    const rows: any[][] = [];
    rows.push([`CATEGORY: ${cat.name}`]);
    rows.push(["Total Income", inc]);
    rows.push(["Total Expense", exp]);
    rows.push(["Balance", inc - exp]);
    rows.push(["Receivable", recv]);
    rows.push(["Payable", pay]);
    rows.push([]);

    // Events in this category
    const catEvents = events.filter((e) => e.category_id === cat.id);
    rows.push(["EVENT SUMMARY"]);
    rows.push(["Event", "Date", "Income", "Expense", "Balance"]);
    for (const evt of catEvents) {
      const evtTxns = catTxns.filter((t) => t.event_id === evt.id);
      if (evtTxns.length === 0) continue;
      const eInc = evtTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const eExp = evtTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      rows.push([evt.name, evt.date, eInc, eExp, eInc - eExp]);
    }
    rows.push([]);

    // Income transactions
    rows.push(["INCOME TRANSACTIONS"]);
    rows.push(["Date", "Donor", "Phone", "Amount", "Description", "Payment Mode", "Event", "Member", "Status"]);
    catTxns.filter((t) => t.type === "income").forEach((t) => {
      rows.push([
        t.transaction_date || "", t.donor_name || "", t.donor_phone || "",
        Number(t.amount), t.description || "",
        (t.payment_mode || "cash").toUpperCase(),
        t.event?.name || "", t.member?.name || "",
        t.transaction_date ? "Received" : "Receivable",
      ]);
    });
    rows.push([]);

    // Expense transactions
    rows.push(["EXPENSE TRANSACTIONS"]);
    rows.push(["Date", "Description", "Amount", "Items", "Payment Mode", "Event", "Member", "Status"]);
    catTxns.filter((t) => t.type === "expense").forEach((t) => {
      const itemsStr = (t.expense_lines || []).map((l) => `${l.item_name}: ₹${Number(l.amount)}`).join("; ");
      rows.push([
        t.transaction_date || "", t.description || "",
        Number(t.amount), itemsStr,
        (t.payment_mode || "cash").toUpperCase(),
        t.event?.name || "", t.member?.name || "",
        t.transaction_date ? "Paid" : "Payable",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    autoFitColumns(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // 3. Transfers sheet
  buildTransfersSheet(wb, allTxns);

  // 4. Receivables sheet
  buildReceivablesSheet(wb, allTxns);

  // 5. Payables sheet
  buildPayablesSheet(wb, allTxns);

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `Sambhav_Funds_Complete_${today}.xlsx`);
}

function sanitizeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no special chars
  return name.replace(/[\[\]\*\?\/\\:]/g, "").slice(0, 31);
}

function autoFitColumns(ws: XLSX.WorkSheet, data: any[][]) {
  if (!data || data.length === 0) return;
  const colWidths = data[0].map((_: any, colIdx: number) => {
    let maxLen = 10;
    for (const row of data) {
      const cell = row[colIdx];
      const len = cell != null ? String(cell).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;
}
