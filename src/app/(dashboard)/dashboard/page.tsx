"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface CategorySummary {
  id: string;
  name: string;
  income: number;
  expense: number;
  balance: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [incomeRes, expenseRes, recentRes, categoriesRes, allTxnRes, membersRes] = await Promise.all([
        supabase.from("transactions").select("amount").eq("type", "income"),
        supabase.from("transactions").select("amount").eq("type", "expense"),
        supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("categories").select("*").order("name"),
        supabase.from("transactions").select("type, amount, event_id"),
        supabase.from("members").select("id, name"),
      ]);

      if (incomeRes.error) console.error("Income fetch error:", incomeRes.error);
      if (recentRes.error) console.error("Recent txns fetch error:", recentRes.error);
      if (allTxnRes.error) console.error("All txns fetch error:", allTxnRes.error);

      const incomeData = incomeRes.data;
      const expenseData = expenseRes.data;
      const recent = recentRes.data;
      const categories = categoriesRes.data;
      const allTxns = allTxnRes.data;

      // Build members map
      const membersMap = (membersRes.data || []).reduce((acc: any, m: any) => {
        acc[m.id] = m.name;
        return acc;
      }, {} as Record<string, string>);

      // Get event->category mapping
      const eventIds = [...new Set((allTxns || []).map((t: any) => t.event_id).filter(Boolean))];
      let eventCategoryMap: Record<string, string> = {};
      let eventNameMap: Record<string, string> = {};
      if (eventIds.length > 0) {
        const { data: eventsData } = await supabase
          .from("events")
          .select("id, name, category_id")
          .in("id", eventIds);
        (eventsData || []).forEach((ev: any) => {
          eventCategoryMap[ev.id] = ev.category_id;
          eventNameMap[ev.id] = ev.name;
        });
      }

      const income = incomeData?.reduce((s, t) => s + Number(t.amount), 0) || 0;
      const expense = expenseData?.reduce((s, t) => s + Number(t.amount), 0) || 0;
      setTotalIncome(income);
      setTotalExpense(expense);
      setRecentTxns(
        (recent || [])
          .filter((t: any) => !t.description?.startsWith("Transfer:"))
          .slice(0, 7)
          .map((t: any) => ({
            ...t,
            member: { name: membersMap[t.member_id] || "Unknown" },
            event: t.event_id ? { name: eventNameMap[t.event_id] || "Event" } : null,
          }))
      );

      const catSummaries = (categories || []).map((cat: any) => {
        const catTxns = (allTxns || []).filter(
          (t: any) => eventCategoryMap[t.event_id] === cat.id
        );
        const catIncome = catTxns
          .filter((t: any) => t.type === "income")
          .reduce((s: number, t: any) => s + Number(t.amount), 0);
        const catExpense = catTxns
          .filter((t: any) => t.type === "expense")
          .reduce((s: number, t: any) => s + Number(t.amount), 0);
        return { ...cat, income: catIncome, expense: catExpense, balance: catIncome - catExpense };
      });
      setCategorySummaries(catSummaries);
      setLoading(false);
    }

    fetchData();
  }, []);

  const netBalance = totalIncome - totalExpense;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expense</p>
              <p className="text-xl font-bold text-red-700">
                {formatCurrency(totalExpense)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Balance</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(netBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Summaries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">By Category</h2>
          <Link
            href="/dashboard/categories"
            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categorySummaries.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
            >
              <p className="font-medium text-gray-800">{cat.name}</p>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-green-600">
                  +{formatCurrency(cat.income)}
                </span>
                <span className="text-red-600">
                  -{formatCurrency(cat.expense)}
                </span>
                <span className="font-medium text-gray-900">
                  = {formatCurrency(cat.balance)}
                </span>
              </div>
            </div>
          ))}
          {categorySummaries.length === 0 && (
            <p className="text-sm text-gray-500 col-span-2">
              No categories yet. Add one to get started.
            </p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Recent Transactions
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {recentTxns.map((txn: any) => (
            <div
              key={txn.id}
              className="px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {txn.type === "income"
                    ? txn.donor_name || "Collection"
                    : txn.description || "Expense"}
                </p>
                <p className="text-xs text-gray-500">
                  {txn.member?.name} • {txn.event?.name || "General"}
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
          ))}
          {recentTxns.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No transactions yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
