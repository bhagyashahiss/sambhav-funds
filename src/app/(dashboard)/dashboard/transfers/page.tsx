"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TransferForm } from "@/components/transfers/transfer-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function TransfersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [transfers, setTransfers] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [
      { data: membersData },
      { data: { user } },
      { data: transfersData },
    ] = await Promise.all([
      supabase.from("members").select("id, name").order("name"),
      supabase.auth.getUser(),
      supabase
        .from("transactions")
        .select("*")
        .like("description", "Transfer:%")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const membersMap = (membersData || []).reduce((acc: any, m: any) => {
      acc[m.id] = m.name;
      return acc;
    }, {} as Record<string, string>);

    setMembers(membersData || []);
    setTransfers(
      (transfersData || []).map((t: any) => ({
        ...t,
        member: { name: membersMap[t.member_id] || "Unknown" },
      }))
    );

    if (user) {
      const { data: currentMember } = await supabase
        .from("members")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single();
      setIsAdmin(currentMember?.role === "admin" || currentMember?.role === "super-admin");
      setCurrentMemberId(currentMember?.id || "");
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Member Transfers</h1>
      <p className="text-sm text-gray-500">
        Transfer funds between members. This records an expense from one member
        and income to another.
      </p>

      {isAdmin && (
        <TransferForm
          members={members}
          currentMemberId={currentMemberId}
          onTransferAdded={fetchData}
        />
      )}

      {/* Recent Transfers */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Recent Transfers
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {transfers.map((txn: any) => (
            <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {txn.description}
                </p>
                <p className="text-xs text-gray-500">
                  {txn.member?.name} • {formatDate(txn.created_at)}
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  txn.type === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {txn.type === "income" ? "+" : "-"}
                {formatCurrency(Number(txn.amount))}
              </span>
            </div>
          ))}
          {transfers.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No transfers yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
