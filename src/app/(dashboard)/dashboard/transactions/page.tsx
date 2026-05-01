"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Scope = "income" | "expense" | "receivable" | "payable" | "all";

interface TxnRow {
  id: string;
  type: "income" | "expense";
  amount: number;
  donor_name: string | null;
  description: string | null;
  payment_mode: "cash" | "upi" | null;
  transaction_date: string | null;
  created_at: string;
  member_id: string;
  event_id: string | null;
}

function getScopeTitle(scope: Scope) {
  if (scope === "income") return "Total Income (Received) Transactions";
  if (scope === "expense") return "Total Expense (Paid) Transactions";
  if (scope === "receivable") return "Total Receivable Transactions";
  if (scope === "payable") return "Total Payable Transactions";
  return "All Transactions";
}

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const scopeParam = (searchParams.get("scope") || "all").toLowerCase() as Scope;
  const scope: Scope = ["income", "expense", "receivable", "payable", "all"].includes(scopeParam)
    ? scopeParam
    : "all";

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TxnRow[]>([]);
  const [members, setMembers] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [txnRes, membersRes, eventsRes] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("members").select("id, name"),
        supabase.from("events").select("id, name"),
      ]);

      if (txnRes.error) {
        console.error("Transactions fetch error:", txnRes.error);
      }

      setTransactions((txnRes.data || []) as TxnRow[]);

      const memberMap: Record<string, string> = {};
      (membersRes.data || []).forEach((m: any) => {
        memberMap[m.id] = m.name;
      });
      setMembers(memberMap);

      const eventMap: Record<string, string> = {};
      (eventsRes.data || []).forEach((e: any) => {
        eventMap[e.id] = e.name;
      });
      setEvents(eventMap);

      setLoading(false);
    }

    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const settled = Boolean(t.transaction_date);

      if (scope === "income") return t.type === "income" && settled;
      if (scope === "expense") return t.type === "expense" && settled;
      if (scope === "receivable") return t.type === "income" && !settled;
      if (scope === "payable") return t.type === "expense" && !settled;
      return true;
    });
  }, [transactions, scope]);

  const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getScopeTitle(scope)}</h1>
          <p className="text-sm text-gray-500">
            {filtered.length} transactions • {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Event</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mode</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Donor</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((txn) => {
                const pending = !txn.transaction_date;
                return (
                  <tr
                    key={txn.id}
                    className={pending ? (txn.type === "income" ? "bg-amber-50" : "bg-orange-50") : "hover:bg-gray-50"}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {txn.transaction_date
                        ? formatDate(txn.transaction_date)
                        : txn.type === "income"
                          ? "Receivable"
                          : "Payable"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{txn.type}</td>
                    <td className="px-4 py-3 text-gray-700">{members[txn.member_id] || "Unknown"}</td>
                    <td className="px-4 py-3 text-gray-700">{txn.event_id ? events[txn.event_id] || "Event" : "General"}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-xs font-medium ${
                          txn.payment_mode === "upi"
                            ? "text-indigo-700 border-indigo-200 bg-indigo-50"
                            : "text-emerald-700 border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        {(txn.payment_mode || "cash").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {txn.type === "income"
                        ? txn.donor_name || txn.description || "Collection"
                        : txn.description || "Expense"}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${txn.type === "income" ? "text-green-700" : "text-red-700"}`}>
                      {txn.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(txn.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-500 text-center">
            No transactions found for this filter.
          </p>
        )}
      </div>
    </div>
  );
}
