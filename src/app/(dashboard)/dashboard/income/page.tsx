"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateReceipt } from "@/lib/generate-receipt";
import { Loader2, Search, IndianRupee, FileText } from "lucide-react";

interface IncomeRow {
  id: string;
  amount: number;
  donor_name: string | null;
  description: string | null;
  member_id: string;
  event_id: string | null;
  transaction_date: string | null;
  created_at: string;
}

export default function IncomePage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<IncomeRow[]>([]);
  const [members, setMembers] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Record<string, { name: string; date: string; category: string }>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterMember, setFilterMember] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [txnRes, membersRes, eventsRes, catsRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("type", "income")
          .order("created_at", { ascending: false }),
        supabase.from("members").select("id, name"),
        supabase.from("events").select("id, name, date, category_id"),
        supabase.from("categories").select("id, name").order("name"),
      ]);

      if (txnRes.error) console.error("Income fetch error:", txnRes.error);

      setTransactions(txnRes.data || []);
      setCategories(catsRes.data || []);

      // Build members map
      const mMap: Record<string, string> = {};
      (membersRes.data || []).forEach((m: any) => { mMap[m.id] = m.name; });
      setMembers(mMap);

      // Build events map with category name
      const catMap: Record<string, string> = {};
      (catsRes.data || []).forEach((c: any) => { catMap[c.id] = c.name; });

      const eMap: Record<string, { name: string; date: string; category: string }> = {};
      (eventsRes.data || []).forEach((e: any) => {
        eMap[e.id] = { name: e.name, date: e.date, category: catMap[e.category_id] || "—" };
      });
      setEvents(eMap);

      setLoading(false);
    }

    fetchData();
  }, []);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((txn) => {
      const eventInfo = txn.event_id ? events[txn.event_id] : null;
      const memberName = members[txn.member_id] || "";
      const donor = txn.donor_name || "";

      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchText = [
          donor,
          memberName,
          eventInfo?.name || "",
          eventInfo?.category || "",
          txn.description || "",
        ].join(" ").toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      // Category filter (uses category from event)
      if (filterCategory) {
        if (!eventInfo) return false;
        const evEntry = Object.entries(events).find(([eid]) => eid === txn.event_id);
        if (!evEntry || evEntry[1].category !== filterCategory) return false;
      }

      // Event filter
      if (filterEvent && txn.event_id !== filterEvent) return false;

      // Member filter
      if (filterMember && txn.member_id !== filterMember) return false;

      return true;
    });
  }, [transactions, searchQuery, filterCategory, filterEvent, filterMember, events, members]);

  const totalFiltered = filtered.reduce((s, t) => s + Number(t.amount), 0);

  // Unique events for filter dropdown
  const eventOptions = useMemo(() => {
    const eventIds = Array.from(
      new Set(
        transactions
          .map((t) => t.event_id)
          .filter((eventId): eventId is string => Boolean(eventId))
      )
    );
    return eventIds.map((eid) => ({ id: eid, name: events[eid]?.name || "Unknown" }));
  }, [transactions, events]);

  // Unique members for filter
  const memberOptions = useMemo(() => {
    const memberIds = Array.from(
      new Set(
        transactions
          .map((t) => t.member_id)
          .filter((memberId): memberId is string => Boolean(memberId))
      )
    );
    return memberIds.map((mid) => ({ id: mid, name: members[mid] || "Unknown" }));
  }, [transactions, members]);

  function handleReceipt(txn: IncomeRow) {
    const eventInfo = txn.event_id ? events[txn.event_id] : null;
    const receiptNo = txn.id.slice(0, 8).toUpperCase();
    generateReceipt({
      receiptNo,
      eventDate: eventInfo?.date ? formatDate(eventInfo.date) : null,
      transactionDate: formatDate(txn.transaction_date || txn.created_at),
      donorName: txn.donor_name || "Anonymous",
      amount: Number(txn.amount),
      description: txn.description,
      eventName: eventInfo?.name || null,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Income</h1>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg">
          <IndianRupee className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700">
            {formatCurrency(totalFiltered)}
          </span>
          <span className="text-xs text-green-600">({filtered.length})</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search donor, member, event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Events</option>
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>

          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Members</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {(searchQuery || filterCategory || filterEvent || filterMember) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterCategory("");
                setFilterEvent("");
                setFilterMember("");
              }}
              className="text-xs text-red-600 hover:text-red-700 px-2 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Donor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Event</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((txn) => {
                const eventInfo = txn.event_id ? events[txn.event_id] : null;
                return (
                  <tr key={txn.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(txn.transaction_date || txn.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {txn.donor_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {eventInfo?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {txn.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {formatCurrency(Number(txn.amount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleReceipt(txn)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition"
                        title="Generate Receipt"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map((txn) => {
            const eventInfo = txn.event_id ? events[txn.event_id] : null;
            return (
              <div key={txn.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {txn.donor_name || txn.description || "Collection"}
                    </p>
                    <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-500">
                      {eventInfo && <span>{eventInfo.name}</span>}
                      <span>{formatDate(txn.transaction_date || txn.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-700">
                      +{formatCurrency(Number(txn.amount))}
                    </span>
                    <button
                      onClick={() => handleReceipt(txn)}
                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition"
                      title="Receipt"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-500 text-center">
            No income transactions found.
          </p>
        )}
      </div>
    </div>
  );
}
