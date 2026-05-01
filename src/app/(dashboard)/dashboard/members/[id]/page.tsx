"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
} from "lucide-react";

type MemberScope = "collected" | "spent" | "receivable" | "payable" | "all";

export default function MemberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [scope, setScope] = useState<MemberScope>("all");

  useEffect(() => {
    async function fetchData() {
      const [{ data: memberData }, txnRes, { data: eventsData }] = await Promise.all([
        supabase.from("members").select("*").eq("id", id).single(),
        supabase
          .from("transactions")
          .select("*")
          .eq("member_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("events").select("id, name, category:categories(name)"),
      ]);

      const txns = txnRes.data || [];
      const eventsMap = (eventsData || []).reduce((acc: any, ev: any) => {
        acc[ev.id] = ev;
        return acc;
      }, {} as Record<string, any>);

      setMember(memberData);
      setTransactions(txns.map((t: any) => ({
        ...t,
        event: t.event_id ? eventsMap[t.event_id] || null : null,
        expense_lines: [],
      })));
      setLoading(false);
    }

    fetchData();
  }, [id]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const settled = Boolean(txn.transaction_date);
      if (scope === "collected") return txn.type === "income" && settled;
      if (scope === "spent") return txn.type === "expense" && settled;
      if (scope === "receivable") return txn.type === "income" && !settled;
      if (scope === "payable") return txn.type === "expense" && !settled;
      return true;
    });
  }, [transactions, scope]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!member) {
    return <div className="text-center py-20 text-gray-500">Member not found</div>;
  }

  const totalCollected = transactions
    .filter((t) => t.type === "income" && Boolean(t.transaction_date))
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalSpent = transactions
    .filter((t) => t.type === "expense" && Boolean(t.transaction_date))
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalReceivable = transactions
    .filter((t) => t.type === "income" && !t.transaction_date)
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalPayable = transactions
    .filter((t) => t.type === "expense" && !t.transaction_date)
    .reduce((s, t) => s + Number(t.amount), 0);
  const holding = totalCollected - totalSpent;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/members"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
          <p className="text-sm text-gray-500 capitalize">
            {member.role} • {member.email}
          </p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setScope("collected")}
          className={`rounded-lg p-3 text-center border transition ${
            scope === "collected"
              ? "bg-green-100 border-green-300"
              : "bg-green-50 border-green-100 hover:border-green-200"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
          <p className="text-xs text-green-700 mt-1">Collected (Received)</p>
          <p className="text-sm font-bold text-green-800">
            {formatCurrency(totalCollected)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setScope("spent")}
          className={`rounded-lg p-3 text-center border transition ${
            scope === "spent"
              ? "bg-red-100 border-red-300"
              : "bg-red-50 border-red-100 hover:border-red-200"
          }`}
        >
          <TrendingDown className="w-4 h-4 text-red-600 mx-auto" />
          <p className="text-xs text-red-700 mt-1">Spent (Paid)</p>
          <p className="text-sm font-bold text-red-800">
            {formatCurrency(totalSpent)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`rounded-lg p-3 text-center border transition ${
            scope === "all"
              ? "bg-blue-100 border-blue-300"
              : "bg-blue-50 border-blue-100 hover:border-blue-200"
          }`}
        >
          <Wallet className="w-4 h-4 text-blue-600 mx-auto" />
          <p className="text-xs text-blue-700 mt-1">Holding (Settled)</p>
          <p className="text-sm font-bold text-blue-800">
            {formatCurrency(holding)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setScope("receivable")}
          className={`rounded-lg p-3 text-center border transition ${
            scope === "receivable"
              ? "bg-amber-100 border-amber-300"
              : "bg-amber-50 border-amber-100 hover:border-amber-200"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-700 mx-auto" />
          <p className="text-xs text-amber-700 mt-1">Receivable</p>
          <p className="text-sm font-bold text-amber-800">
            {formatCurrency(totalReceivable)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setScope("payable")}
          className={`rounded-lg p-3 text-center border transition ${
            scope === "payable"
              ? "bg-orange-100 border-orange-300"
              : "bg-orange-50 border-orange-100 hover:border-orange-200"
          }`}
        >
          <TrendingDown className="w-4 h-4 text-orange-700 mx-auto" />
          <p className="text-xs text-orange-700 mt-1">Payable</p>
          <p className="text-sm font-bold text-orange-800">
            {formatCurrency(totalPayable)}
          </p>
        </button>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Transaction History
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {(filteredTransactions || []).map((txn: any) => (
            <div
              key={txn.id}
              className={`px-4 py-3 ${
                !txn.transaction_date
                  ? txn.type === "income"
                    ? "bg-amber-50"
                    : "bg-orange-50"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {txn.type === "income"
                      ? txn.donor_name || "Collection"
                      : txn.description || "Expense"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {txn.event?.name || "General"}{" "}
                    {txn.event?.category?.name && `(${txn.event.category.name})`}{" "}
                    • {txn.transaction_date ? formatDate(txn.transaction_date) : "Pending"}
                  </p>
                  {!txn.transaction_date && (
                    <p
                      className={`text-xs font-medium mt-1 ${
                        txn.type === "income" ? "text-amber-700" : "text-orange-700"
                      }`}
                    >
                      {txn.type === "income" ? "Receivable (Pending)" : "Payable (Pending)"}
                    </p>
                  )}
                </div>
                <span
                  className={`text-sm font-semibold ${
                    txn.type === "income" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {txn.type === "income" ? "+" : "-"}
                  {formatCurrency(Number(txn.amount))}
                </span>
              </div>
              {txn.expense_lines && txn.expense_lines.length > 0 && (
                <div className="mt-2 ml-4 space-y-1">
                  {txn.expense_lines.map((line: any) => (
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
          {filteredTransactions.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No transactions for this filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
