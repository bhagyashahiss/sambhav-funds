"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import Link from "next/link";

interface ExpenseLine {
  id: string;
  item_name: string;
  amount: number;
}

interface TransactionRow {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  donor_name: string | null;
  transaction_date: string | null;
  created_at: string;
  member_id: string;
  member: { name: string } | null;
  expense_lines: ExpenseLine[];
}

interface Props {
  event: {
    id: string;
    name: string;
    date: string;
    description: string | null;
    category: { name: string } | null;
  };
  transactions: TransactionRow[];
  members: { id: string; name: string }[];
  expenseItems: { id: string; name: string }[];
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  currentMemberId: string;
  onTransactionAdded?: () => void;
}

export function EventDetail({
  event,
  transactions,
  members,
  expenseItems,
  isAdmin,
  isSuperAdmin = false,
  currentMemberId,
  onTransactionAdded,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState<TransactionRow | null>(null);
  const [txnType, setTxnType] = useState<"income" | "expense">("income");
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState<{ item_name: string; amount: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  function addLine() {
    setLines([...lines, { item_name: "", amount: "" }]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: "item_name" | "amount", value: string) {
    const updated = [...lines];
    updated[idx][field] = value;
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const txnAmount =
      txnType === "expense" && lines.length > 0
        ? lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
        : parseFloat(amount);

    if (!currentMemberId) {
      alert("Error: Your user account is not linked to a member. Contact admin.");
      setLoading(false);
      return;
    }

    const { data: txn, error: txnError } = await supabase
      .from("transactions")
      .insert({
        event_id: event.id,
        member_id: memberId,
        type: txnType,
        amount: txnAmount,
        donor_name: txnType === "income" ? donorName || null : null,
        description: description || null,
        transaction_date: transactionDate || null,
        created_by: currentMemberId,
      })
      .select()
      .single();

    if (txnError) {
      console.error("Transaction insert error:", txnError);
      alert("Failed to add transaction: " + txnError.message);
      setLoading(false);
      return;
    }

    if (txn && txnType === "expense" && lines.length > 0) {
      const lineInserts = lines
        .filter((l) => l.item_name && l.amount)
        .map((l) => ({
          transaction_id: txn.id,
          item_name: l.item_name,
          amount: parseFloat(l.amount),
        }));
      if (lineInserts.length > 0) {
        await supabase.from("event_expense_lines").insert(lineInserts);
      }
    }

    // Reset form
    setAmount("");
    setDonorName("");
    setDescription("");
    setMemberId("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setLines([]);
    setShowForm(false);
    setLoading(false);
    setEditingTxn(null);
    if (onTransactionAdded) onTransactionAdded();
  }

  function startEdit(txn: TransactionRow) {
    setEditingTxn(txn);
    setTxnType(txn.type);
    setAmount(String(Number(txn.amount)));
    setDonorName(txn.donor_name || "");
    setDescription(txn.description || "");
    setTransactionDate(txn.transaction_date || new Date().toISOString().split("T")[0]);
    setMemberId(txn.member_id || "");
    setLines(txn.expense_lines.map((l) => ({ item_name: l.item_name, amount: String(Number(l.amount)) })));
    setShowForm(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTxn) return;
    setLoading(true);

    const txnAmount =
      txnType === "expense" && lines.length > 0
        ? lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
        : parseFloat(amount);

    const { error } = await supabase
      .from("transactions")
      .update({
        member_id: memberId,
        type: txnType,
        amount: txnAmount,
        donor_name: txnType === "income" ? donorName || null : null,
        description: description || null,
        transaction_date: transactionDate || null,
      })
      .eq("id", editingTxn.id);

    if (error) {
      alert("Failed to update: " + error.message);
      setLoading(false);
      return;
    }

    // Update expense lines: delete old, insert new
    await supabase.from("event_expense_lines").delete().eq("transaction_id", editingTxn.id);
    if (txnType === "expense" && lines.length > 0) {
      const lineInserts = lines
        .filter((l) => l.item_name && l.amount)
        .map((l) => ({ transaction_id: editingTxn.id, item_name: l.item_name, amount: parseFloat(l.amount) }));
      if (lineInserts.length > 0) {
        await supabase.from("event_expense_lines").insert(lineInserts);
      }
    }

    setAmount("");
    setDonorName("");
    setDescription("");
    setMemberId("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setLines([]);
    setShowForm(false);
    setEditingTxn(null);
    setLoading(false);
    if (onTransactionAdded) onTransactionAdded();
  }

  async function handleDeleteTxn(txnId: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", txnId);
    if (error) {
      alert("Failed to delete: " + error.message);
      return;
    }
    if (onTransactionAdded) onTransactionAdded();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/events"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500">
            {event.category?.name} • {formatDate(event.date)}
          </p>
        </div>
      </div>

      {/* Event Balance Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
          <p className="text-xs text-green-700 mt-1">Income</p>
          <p className="text-sm font-bold text-green-800">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <TrendingDown className="w-4 h-4 text-red-600 mx-auto" />
          <p className="text-xs text-red-700 mt-1">Expense</p>
          <p className="text-sm font-bold text-red-800">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <Wallet className="w-4 h-4 text-blue-600 mx-auto" />
          <p className="text-xs text-blue-700 mt-1">Balance</p>
          <p className="text-sm font-bold text-blue-800">
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Add Transaction Button */}
      {isAdmin && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      )}

      {/* Add/Edit Transaction Form */}
      {showForm && isAdmin && (
        <form
          onSubmit={editingTxn ? handleUpdate : handleSubmit}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3"
        >
          {editingTxn && (
            <p className="text-sm font-medium text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg">
              Editing Transaction
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTxnType("income")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                txnType === "income"
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => {
                setTxnType("expense");
                if (lines.length === 0) {
                  setLines([{ item_name: "", amount: "" }]);
                }
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                txnType === "expense"
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Expense
            </button>
          </div>

          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          >
            <option value="">Select Member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {txnType === "income" && (
            <>
              <input
                type="number"
                placeholder="Amount (₹)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
                min="1"
              />
              <input
                type="text"
                placeholder="Donor name (Labharthi)"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </>
          )}

          {txnType === "expense" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Expense Items
                </p>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs text-primary-600 hover:underline"
                >
                  + Add Item
                </button>
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <input
                      list="expense-items-list"
                      placeholder="Select or type item"
                      value={line.item_name}
                      onChange={(e) =>
                        updateLine(idx, "item_name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <input
                    type="number"
                    placeholder="₹"
                    value={line.amount}
                    onChange={(e) => updateLine(idx, "amount", e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {/* Quick select from master items */}
              {expenseItems.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {expenseItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLines([...lines, { item_name: item.name, amount: "" }])}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-600 rounded border border-gray-200 transition"
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              )}
              {lines.length > 0 && (
                <p className="text-xs text-gray-500 text-right">
                  Total:{" "}
                  {formatCurrency(
                    lines.reduce(
                      (s, l) => s + (parseFloat(l.amount) || 0),
                      0
                    )
                  )}
                </p>
              )}
              <datalist id="expense-items-list">
                {expenseItems.map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
            </div>
          )}

          <input
            type="text"
            placeholder="Description / Note (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Transaction Date (when money was received/spent)
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {editingTxn ? "Update Transaction" : "Save Transaction"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingTxn(null); }}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Transactions List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {transactions.map((txn) => (
            <div key={txn.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {txn.type === "income"
                      ? txn.donor_name || "Collection"
                      : txn.description || "Expense"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {txn.member?.name} •{" "}
                    {formatDate(txn.transaction_date || txn.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      txn.type === "income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {txn.type === "income" ? "+" : "-"}
                    {formatCurrency(Number(txn.amount))}
                  </span>
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => startEdit(txn)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTxn(txn.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Expense line items */}
              {txn.expense_lines && txn.expense_lines.length > 0 && (
                <div className="mt-2 ml-4 space-y-1">
                  {txn.expense_lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex justify-between text-xs text-gray-600"
                    >
                      <span>{line.item_name}</span>
                      <span>{formatCurrency(Number(line.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No transactions for this event yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
