"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CategoryList } from "@/components/categories/category-list";
import { Loader2 } from "lucide-react";

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [{ data: cats }, { data: { user } }] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.auth.getUser(),
      ]);

      setCategories(cats || []);

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
      <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
      <CategoryList categories={categories} isAdmin={isAdmin} />
    </div>
  );
}
