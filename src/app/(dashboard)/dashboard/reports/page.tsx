"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReportsView } from "@/components/reports/reports-view";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [
        { data: cats },
        { data: evts },
        { data: mems },
        { data: txns },
      ] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("events").select("*, category:categories(name)").order("date", { ascending: false }),
        supabase.from("members").select("*").order("name"),
        supabase.from("transactions").select("type, amount, member_id, event_id"),
      ]);

      // Build event->category map
      const eventCatMap = (evts || []).reduce((acc: any, ev: any) => {
        acc[ev.id] = ev.category_id;
        return acc;
      }, {} as Record<string, string>);

      // Enrich transactions with event category_id
      const enrichedTxns = (txns || []).map((t: any) => ({
        ...t,
        event: t.event_id ? { category_id: eventCatMap[t.event_id] } : null,
      }));

      setCategories(cats || []);
      setEvents(evts || []);
      setMembers(mems || []);
      setTransactions(enrichedTxns);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <ReportsView
      categories={categories}
      events={events}
      members={members}
      transactions={transactions}
    />
  );
}
