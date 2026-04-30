"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EventDetail } from "@/components/events/event-detail";
import { Loader2 } from "lucide-react";

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const onTransactionAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    async function fetchData() {
      console.log("Fetching event data for id:", id);
      const [eventRes, txnRes, membersRes, itemsRes, userRes] = await Promise.all([
        supabase.from("events").select("*, category:categories(name)").eq("id", id).single(),
        supabase
          .from("transactions")
          .select("*")
          .eq("event_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("members").select("id, name").order("name"),
        supabase.from("expense_items_master").select("*").order("name"),
        supabase.auth.getUser(),
      ]);

      if (txnRes.error) console.error("Transactions fetch error:", txnRes.error);
      if (eventRes.error) console.error("Event fetch error:", eventRes.error);

      const membersMap = (membersRes.data || []).reduce((acc: any, m: any) => {
        acc[m.id] = m.name;
        return acc;
      }, {} as Record<string, string>);

      // Load expense lines separately (table may not exist)
      const txns = txnRes.data || [];
      let linesMap: Record<string, any[]> = {};
      if (txns.length > 0) {
        const { data: expenseLines } = await supabase
          .from("event_expense_lines")
          .select("*")
          .in("transaction_id", txns.map((t: any) => t.id));

        (expenseLines || []).forEach((line: any) => {
          if (!linesMap[line.transaction_id]) linesMap[line.transaction_id] = [];
          linesMap[line.transaction_id].push(line);
        });
      }

      setTransactions(txns.map((t: any) => ({
        ...t,
        member: { name: membersMap[t.member_id] || "Unknown" },
        expense_lines: linesMap[t.id] || [],
      })));

      setEvent(eventRes.data);
      setMembers(membersRes.data || []);
      setExpenseItems(itemsRes.data || []);

      const user = userRes.data?.user;
      if (user) {
        const { data: currentMember } = await supabase
          .from("members")
          .select("id, role")
          .eq("auth_user_id", user.id)
          .single();
        setIsAdmin(currentMember?.role === "admin" || currentMember?.role === "super-admin");
        setIsSuperAdmin(currentMember?.role === "super-admin");
        setCurrentMemberId(currentMember?.id || "");
      }

      setLoading(false);
    }

    fetchData();
  }, [id, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-gray-500">Event not found</div>
    );
  }

  return (
    <EventDetail
      event={event}
      transactions={transactions}
      members={members}
      expenseItems={expenseItems}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      currentMemberId={currentMemberId}
      onTransactionAdded={onTransactionAdded}
    />
  );
}
