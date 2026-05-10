"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { exportToExcel, exportAllCombined } from "@/lib/export-excel";
import { Download, ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  category_id: string;
  category?: { name: string } | null;
}

interface Member {
  id: string;
  name: string;
}

interface Transaction {
  type: string;
  amount: number;
  member_id: string;
  event_id: string | null;
  event?: { category_id: string } | null;
}

interface Props {
  categories: Category[];
  events: Event[];
  members: Member[];
  transactions: Transaction[];
  fullTransactions: any[];
}

export function ReportsView({ categories, events, members, transactions, fullTransactions }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Balance per category
  const categorySummaries = categories.map((cat) => {
    const catTxns = transactions.filter(
      (t) => t.event?.category_id === cat.id
    );
    const income = catTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = catTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    return { ...cat, income, expense, balance: income - expense };
  });

  // Events filtered by selected category
  const filteredEvents = selectedCategory
    ? events.filter((e) => e.category_id === selectedCategory)
    : events;

  // Balance per event
  const eventSummaries = filteredEvents.map((evt) => {
    const evtTxns = transactions.filter((t) => t.event_id === evt.id);
    const income = evtTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = evtTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    return { ...evt, income, expense, balance: income - expense };
  });

  // Totals for filtered events
  const filteredTotalIncome = eventSummaries.reduce((s, e) => s + e.income, 0);
  const filteredTotalExpense = eventSummaries.reduce((s, e) => s + e.expense, 0);
  const filteredBalance = filteredTotalIncome - filteredTotalExpense;

  // Balance per member
  const memberSummaries = members.map((mem) => {
    const memTxns = transactions.filter((t) => t.member_id === mem.id);
    const collected = memTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const spent = memTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    return { ...mem, collected, spent, holding: collected - spent };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

        {/* Export Excel Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Download className="w-4 h-4" />
            Export Excel
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 max-h-80 overflow-y-auto">
                <button
                  onClick={() => {
                    exportAllCombined(fullTransactions, categories, events, members);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition font-semibold border-b border-gray-100"
                >
                  📦 Download All (Combined Excel)
                </button>
                <button
                  onClick={() => {
                    exportToExcel(fullTransactions, categories, events, members, {
                      filterType: "all",
                    });
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition font-medium"
                >
                  📊 Export All (Flat Sheets)
                </button>

                <div className="border-t border-gray-100 my-1" />
                <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase">By Category</p>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      exportToExcel(fullTransactions, categories, events, members, {
                        filterType: "category",
                        filterId: cat.id,
                        filterName: cat.name,
                      });
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition"
                  >
                    {cat.name}
                  </button>
                ))}

                <div className="border-t border-gray-100 my-1" />
                <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase">By Event</p>
                {events.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      exportToExcel(fullTransactions, categories, events, members, {
                        filterType: "event",
                        filterId: evt.id,
                        filterName: evt.name,
                      });
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition"
                  >
                    <span>{evt.name}</span>
                    <span className="text-xs text-gray-400 ml-1">({evt.category?.name})</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Balance per Category */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Balance per Category
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Category
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-green-600">
                  Income
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-red-600">
                  Expense
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-blue-600">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categorySummaries.map((cat) => (
                <tr
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? "" : cat.id)}
                  className={`cursor-pointer transition ${
                    selectedCategory === cat.id
                      ? "bg-primary-50 border-l-4 border-l-primary-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {cat.name}
                    {selectedCategory === cat.id && (
                      <span className="ml-2 text-xs text-primary-600">(selected)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-600">
                    {formatCurrency(cat.income)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-600">
                    {formatCurrency(cat.expense)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                    {formatCurrency(cat.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categorySummaries.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No data yet.
            </p>
          )}
        </div>
        {!selectedCategory && (
          <p className="text-xs text-gray-500 mt-1">
            Tap a category to see its events as a balance sheet
          </p>
        )}
      </section>

      {/* Events Balance Sheet (filtered by category) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedCategory
              ? `Events in "${categories.find((c) => c.id === selectedCategory)?.name}"`
              : "All Events"}
          </h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory("")}
              className="text-xs text-primary-600 hover:underline"
            >
              Show All
            </button>
          )}
        </div>

        {/* Summary for filtered view */}
        {selectedCategory && eventSummaries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-700">Total Income</p>
              <p className="text-sm font-bold text-green-800">
                {formatCurrency(filteredTotalIncome)}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xs text-red-700">Total Expense</p>
              <p className="text-sm font-bold text-red-800">
                {formatCurrency(filteredTotalExpense)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-700">Balance</p>
              <p className="text-sm font-bold text-blue-800">
                {formatCurrency(filteredBalance)}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Event
                </th>
                {!selectedCategory && (
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">
                    Category
                  </th>
                )}
                <th className="text-right px-4 py-2.5 font-medium text-green-600">
                  Income
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-red-600">
                  Expense
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-blue-600">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eventSummaries.map((evt: any) => (
                <tr key={evt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {evt.name}
                  </td>
                  {!selectedCategory && (
                    <td className="px-4 py-2.5 text-gray-500">
                      {evt.category?.name}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right text-green-600">
                    {formatCurrency(evt.income)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-600">
                    {formatCurrency(evt.expense)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                    {formatCurrency(evt.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {eventSummaries.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No events {selectedCategory ? "in this category" : ""} yet.
            </p>
          )}
        </div>
      </section>

      {/* Balance per Member */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Balance per Member
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Member
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-green-600">
                  Collected
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-red-600">
                  Spent
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-blue-600">
                  Holding
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memberSummaries.map((mem) => (
                <tr key={mem.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {mem.name}
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-600">
                    {formatCurrency(mem.collected)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-600">
                    {formatCurrency(mem.spent)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                    {formatCurrency(mem.holding)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {memberSummaries.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No data yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
