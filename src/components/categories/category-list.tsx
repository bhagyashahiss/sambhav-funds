"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Category } from "@/lib/types";
import { Plus, Pencil } from "lucide-react";

interface Props {
  categories: Category[];
  isSuperAdmin: boolean;
}

export function CategoryList({ categories, isSuperAdmin }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      await supabase
        .from("categories")
        .update({ name, description: description || null })
        .eq("id", editingId);
    } else {
      await supabase
        .from("categories")
        .insert({ name, description: description || null });
    }

    setName("");
    setDescription("");
    setShowForm(false);
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setName("");
            setDescription("");
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      )}

      {showForm && isSuperAdmin && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3"
        >
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
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
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-800">{cat.name}</p>
              {cat.description && (
                <p className="text-xs text-gray-500">{cat.description}</p>
              )}
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => startEdit(cat)}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">
            No categories yet.
          </p>
        )}
      </div>
    </div>
  );
}
