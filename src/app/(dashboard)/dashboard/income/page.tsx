"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateReceipt } from "@/lib/generate-receipt";
import { Loader2, Search, IndianRupee, FileText, MessageCircle } from "lucide-react";

interface IncomeRow {
  id: string;
  amount: number;
  donor_name: string | null;
  donor_phone: string | null;
  description: string | null;
  payment_mode: "cash" | "upi" | null;
  member_id: string;
  event_id: string | null;
  transaction_date: string | null;
  incident_date: string | null;
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
  const [markingTxnId, setMarkingTxnId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [txnRes, membersRes, eventsRes, catsRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("type", "income")
          .not("description", "like", "Transfer:%")
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
    if (!txn.transaction_date) {
      alert("Mark this transaction as received before generating receipt.");
      return;
    }
    const eventInfo = txn.event_id ? events[txn.event_id] : null;
    const receiptNo = txn.id.slice(0, 8).toUpperCase();
    // Use incident_date if available, fallback to event date, then transaction_date
    const eventDate = txn.incident_date
      ? formatDate(txn.incident_date)
      : eventInfo?.date
        ? formatDate(eventInfo.date)
        : formatDate(txn.transaction_date);
    generateReceipt({
      receiptNo,
      eventDate,
      receivedOn: formatDate(txn.transaction_date),
      donorName: txn.donor_name || "Anonymous",
      amount: Number(txn.amount),
      eventName: eventInfo?.name || null,
    });
  }

  async function handleWhatsAppShare(txn: IncomeRow) {
    if (!txn.transaction_date) {
      alert("Mark this transaction as received before sharing.");
      return;
    }
    const phone = txn.donor_phone?.replace(/\D/g, "") || "";
    if (!phone) {
      alert("No phone number available for this donor. Please add a phone number when recording income.");
      return;
    }
    const eventInfo = txn.event_id ? events[txn.event_id] : null;
    const receiptNo = txn.id.slice(0, 8).toUpperCase();
    const eventDate = txn.incident_date
      ? formatDate(txn.incident_date)
      : eventInfo?.date
        ? formatDate(eventInfo.date)
        : formatDate(txn.transaction_date);

    const blob = await generateReceipt({
      receiptNo,
      eventDate,
      receivedOn: formatDate(txn.transaction_date!),
      donorName: txn.donor_name || "Anonymous",
      amount: Number(txn.amount),
      eventName: eventInfo?.name || null,
    });

    const filename = `Receipt_${receiptNo}_${txn.donor_name?.replace(/\s+/g, "_") || "donor"}.pdf`;
    const whatsappPhone = phone.startsWith("91") ? phone : "91" + phone;
    const shareText = `Pranam 🙏\n\nThank you for your contribution of Rs. ${Number(txn.amount).toLocaleString("en-IN")} towards ${eventInfo?.name || "Sambhav Shanti Yuva Group"}.\n\nReceipt No: ${receiptNo}\n\n- Sambhav Shanti Yuva Group`;

    // Download the receipt PDF first
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Open the specific WhatsApp chat with pre-filled message
    const message = encodeURIComponent(shareText);
    window.location.href = `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${message}`;
  }

  async function handleMarkReceived(txn: IncomeRow) {
    const today = new Date().toISOString().split("T")[0];
    const pickedDate = window.prompt(
      "Set received date (YYYY-MM-DD)",
      txn.transaction_date || today
    );
    if (pickedDate === null) return;
    const finalDate = pickedDate || today;

    setMarkingTxnId(txn.id);
    const { error } = await supabase
      .from("transactions")
      .update({ transaction_date: finalDate })
      .eq("id", txn.id);

    if (error) {
      alert("Failed to update transaction: " + error.message);
      setMarkingTxnId(null);
      return;
    }

    setTransactions((prev) =>
      prev.map((item) =>
        item.id === txn.id ? { ...item, transaction_date: finalDate } : item
      )
    );
    setMarkingTxnId(null);
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mode</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Receipt</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((txn) => {
                const eventInfo = txn.event_id ? events[txn.event_id] : null;
                const pending = !txn.transaction_date;
                return (
                  <tr
                    key={txn.id}
                    className={`transition ${pending ? "bg-amber-50/70 hover:bg-amber-100/70" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {txn.transaction_date ? formatDate(txn.transaction_date) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {txn.donor_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {eventInfo?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
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
                    <td className="px-4 py-3 text-gray-600">
                      {txn.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pending ? (
                        <button
                          onClick={() => handleMarkReceived(txn)}
                          disabled={markingTxnId === txn.id}
                          className="text-xs px-2 py-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition disabled:opacity-60"
                        >
                          {markingTxnId === txn.id ? "Saving..." : "Receivable"}
                        </button>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700">
                          Received
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {formatCurrency(Number(txn.amount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleReceipt(txn)}
                        disabled={!txn.transaction_date}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Generate Receipt"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleWhatsAppShare(txn)}
                        disabled={!txn.transaction_date || !txn.donor_phone}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                        title={txn.donor_phone ? "Share via WhatsApp" : "No phone number"}
                      >
                        <MessageCircle className="w-4 h-4" />
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
            const pending = !txn.transaction_date;
            return (
              <div
                key={txn.id}
                className={`px-4 py-3 ${pending ? "bg-amber-50/70" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {txn.donor_name || txn.description || "Collection"}
                    </p>
                    <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-500">
                      {eventInfo && <span>{eventInfo.name}</span>}
                      {txn.transaction_date ? (
                        <span>{formatDate(txn.transaction_date)}</span>
                      ) : (
                        <button
                          onClick={() => handleMarkReceived(txn)}
                          disabled={markingTxnId === txn.id}
                          className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800"
                        >
                          {markingTxnId === txn.id ? "Saving..." : "Receivable"}
                        </button>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded-full border text-[11px] font-medium ${
                          txn.payment_mode === "upi"
                            ? "text-indigo-700 border-indigo-200 bg-indigo-50"
                            : "text-emerald-700 border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        {(txn.payment_mode || "cash").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-700">
                      +{formatCurrency(Number(txn.amount))}
                    </span>
                    <button
                      onClick={() => handleReceipt(txn)}
                      disabled={!txn.transaction_date}
                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Receipt"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare(txn)}
                      disabled={!txn.transaction_date || !txn.donor_phone}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title={txn.donor_phone ? "Share via WhatsApp" : "No phone number"}
                    >
                      <MessageCircle className="w-4 h-4" />
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
