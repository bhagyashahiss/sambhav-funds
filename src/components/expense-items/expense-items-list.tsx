"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ExpenseItemMaster } from "@/lib/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Props {
  items: ExpenseItemMaster[];
  isAdmin: boolean;
}

export function ExpenseItemsList({ items, isAdmin }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      await supabase
        .from("expense_items_master")
        .update({ name })
        .eq("id", editingId);
    } else {
      await supabase.from("expense_items_master").insert({ name });
    }

    setName("");
    setShowForm(false);
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("expense_items_master").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setName("");
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      )}

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3"
        >
          <input
            type="text"
            placeholder="Item name (e.g., Diva, Prabhavna, Lucky Draw)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {items.map((item) => (
          <div
            key={item.id}
            className="px-4 py-3 flex items-center justify-between"
          >
            <p className="text-sm font-medium text-gray-800">{item.name}</p>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setName(item.name);
                    setShowForm(true);
                  }}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">
            No expense items yet.
          </p>
        )}
      </div>
    </div>
  );
}
