"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Category } from "@/lib/types";
import { Plus, Calendar, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface EventRow {
  id: string;
  name: string;
  date: string;
  description: string | null;
  category_id: string;
  category: { name: string } | null;
}

interface Props {
  events: EventRow[];
  categories: Category[];
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  onEventsChanged?: () => Promise<void> | void;
}

export function EventsList({ events, categories, isAdmin, isSuperAdmin, onEventsChanged }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("events").insert({
      name,
      date,
      category_id: categoryId,
      description: description || null,
    });

    if (error) {
      setLoading(false);
      alert("Failed to create event: " + error.message);
      return;
    }

    setName("");
    setDate("");
    setCategoryId("");
    setDescription("");
    setShowForm(false);
    setLoading(false);
    await onEventsChanged?.();
  }

  function startEditEvent(event: EventRow) {
    setEditingEvent(event);
    setName(event.name);
    setDate(event.date);
    setCategoryId(event.category_id);
    setDescription(event.description || "");
    setShowForm(true);
  }

  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setLoading(true);

    const { error } = await supabase
      .from("events")
      .update({
        name,
        date,
        category_id: categoryId,
        description: description || null,
      })
      .eq("id", editingEvent.id);

    if (error) {
      setLoading(false);
      alert("Failed to update event: " + error.message);
      return;
    }

    setName("");
    setDate("");
    setCategoryId("");
    setDescription("");
    setShowForm(false);
    setEditingEvent(null);
    setLoading(false);
    await onEventsChanged?.();
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Delete this event and all its transactions?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      alert("Failed to delete event: " + error.message);
      return;
    }
    await onEventsChanged?.();
  }

  const filtered = filter
    ? events.filter((e) => e.category_id === filter)
    : events;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        )}

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={editingEvent ? handleUpdateEvent : handleSubmit}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3"
        >
          {editingEvent && (
            <p className="text-sm font-medium text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg">
              Editing Event
            </p>
          )}
          <input
            type="text"
            placeholder="Event name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
              {editingEvent ? "Update Event" : "Create Event"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingEvent(null); }}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filtered.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-primary-200 transition"
          >
            <div className="flex items-start justify-between">
              <Link
                href={`/dashboard/events/${event.id}`}
                className="flex-1"
              >
                <p className="font-medium text-gray-800">{event.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {event.category?.name}
                  {event.description && ` • ${event.description}`}
                </p>
              </Link>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(event.date)}
                </div>
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => startEditEvent(event)}
                      className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No events found.
          </p>
        )}
      </div>
    </div>
  );
}
