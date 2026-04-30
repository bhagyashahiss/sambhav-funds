"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ExpenseItemsList } from "@/components/expense-items/expense-items-list";
import { Loader2 } from "lucide-react";

export default function ExpenseItemsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [{ data: itemsData }, { data: { user } }] = await Promise.all([
        supabase.from("expense_items_master").select("*").order("name"),
        supabase.auth.getUser(),
      ]);

      setItems(itemsData || []);

      if (user) {
        const { data: member } = await supabase
          .from("members")
          .select("role")
          .eq("auth_user_id", user.id)
          .single();
        setIsAdmin(member?.role === "admin" || member?.role === "super-admin");
      }

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Expense Items Master</h1>
      <p className="text-sm text-gray-500">
        Common expense items that appear as suggestions when adding expenses to
        events. You can always type custom items per event.
      </p>
      <ExpenseItemsList items={items} isAdmin={isAdmin} />
    </div>
  );
}
