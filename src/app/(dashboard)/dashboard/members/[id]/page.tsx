"use client";

import { useEffect, useState } from "react";
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

export default function MemberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

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
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalSpent = transactions
    .filter((t) => t.type === "expense")
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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
          <p className="text-xs text-green-700 mt-1">Collected</p>
          <p className="text-sm font-bold text-green-800">
            {formatCurrency(totalCollected)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <TrendingDown className="w-4 h-4 text-red-600 mx-auto" />
          <p className="text-xs text-red-700 mt-1">Spent</p>
          <p className="text-sm font-bold text-red-800">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <Wallet className="w-4 h-4 text-blue-600 mx-auto" />
          <p className="text-xs text-blue-700 mt-1">Holding</p>
          <p className="text-sm font-bold text-blue-800">
            {formatCurrency(holding)}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Transaction History
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {(transactions || []).map((txn: any) => (
            <div key={txn.id} className="px-4 py-3">
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
                    • {formatDate(txn.created_at)}
                  </p>
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
          {transactions.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No transactions for this member.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
