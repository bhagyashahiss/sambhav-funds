"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { User, Loader2, Pencil, Trash2 } from "lucide-react";

export default function MembersPage() {
  const [loading, setLoading] = useState(true);
  const [memberBalances, setMemberBalances] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [{ data: members }, { data: transactions }, { data: { user } }] = await Promise.all([
        supabase.from("members").select("*").order("name"),
        supabase.from("transactions").select("member_id, type, amount"),
        supabase.auth.getUser(),
      ]);

      if (user) {
        const me = (members || []).find((m: any) => m.auth_user_id === user.id);
        setIsSuperAdmin(me?.role === "super-admin");
      }

      const balances = (members || []).map((member: any) => {
        const memberTxns = (transactions || []).filter(
          (t: any) => t.member_id === member.id
        );
        const collected = memberTxns
          .filter((t: any) => t.type === "income")
          .reduce((s: number, t: any) => s + Number(t.amount), 0);
        const spent = memberTxns
          .filter((t: any) => t.type === "expense")
          .reduce((s: number, t: any) => s + Number(t.amount), 0);
        return { ...member, collected, spent, holding: collected - spent };
      });

      setMemberBalances(balances);
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

  function startEditMember(member: any) {
    setEditingMember(member);
    setEditName(member.name);
    setEditRole(member.role);
  }

  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    await supabase
      .from("members")
      .update({ name: editName, role: editRole })
      .eq("id", editingMember.id);
    setEditingMember(null);
    window.location.reload();
  }

  async function handleDeleteMember(memberId: string) {
    if (!confirm("Delete this member? Their transactions will remain.")) return;
    await supabase.from("members").delete().eq("id", memberId);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Members</h1>

      {editingMember && (
        <form
          onSubmit={handleUpdateMember}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3"
        >
          <p className="text-sm font-medium text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg">
            Editing Member
          </p>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          />
          <select
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
            <option value="super-admin">Super Admin</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Update Member
            </button>
            <button
              type="button"
              onClick={() => setEditingMember(null)}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {memberBalances.map((member) => (
          <div key={member.id} className="px-4 py-3 hover:bg-gray-50 transition">
            <div className="flex items-center justify-between">
              <Link
                href={`/dashboard/members/${member.id}`}
                className="flex items-center gap-3 flex-1"
              >
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {member.role}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-700">
                    {formatCurrency(member.holding)}
                  </p>
                  <p className="text-xs text-gray-500">holding</p>
                </div>
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => startEditMember(member)}
                      className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
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
        {memberBalances.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">
            No members yet.
          </p>
        )}
      </div>
    </div>
  );
}
