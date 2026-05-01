"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowRightLeft } from "lucide-react";

interface Props {
  members: { id: string; name: string }[];
  currentMemberId: string;
  onTransferAdded?: () => void;
}

export function TransferForm({ members, currentMemberId, onTransferAdded }: Props) {
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (fromMemberId === toMemberId) {
      setError("From and To member cannot be the same");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setLoading(true);

    const fromName = members.find((m) => m.id === fromMemberId)?.name || "";
    const toName = members.find((m) => m.id === toMemberId)?.name || "";
    const desc = `Transfer: ${fromName} → ${toName}${note ? ` (${note})` : ""}`;
    const today = new Date().toISOString().split("T")[0];

    // Create expense transaction for "from" member
    const { error: err1 } = await supabase.from("transactions").insert({
      member_id: fromMemberId,
      type: "expense",
      amount: transferAmount,
      description: desc,
      transaction_date: today,
      created_by: currentMemberId,
    });

    // Create income transaction for "to" member
    const { error: err2 } = await supabase.from("transactions").insert({
      member_id: toMemberId,
      type: "income",
      amount: transferAmount,
      description: desc,
      donor_name: fromName,
      transaction_date: today,
      created_by: currentMemberId,
    });

    if (err1 || err2) {
      setError("Failed to create transfer. Please try again.");
    } else {
      setFromMemberId("");
      setToMemberId("");
      setAmount("");
      setNote("");
      onTransferAdded?.();
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <ArrowRightLeft className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-gray-800">New Transfer</h3>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <select
        value={fromMemberId}
        onChange={(e) => setFromMemberId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        required
      >
        <option value="">From Member</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        value={toMemberId}
        onChange={(e) => setToMemberId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        required
      >
        <option value="">To Member</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

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
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
      >
        {loading ? "Processing..." : "Transfer Funds"}
      </button>
    </form>
  );
}
