import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav/bottom-nav";
import { TopBar } from "@/components/nav/top-bar";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check auth from cookies only - no network call
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const hasSession = allCookies.some(
    (c) => c.name.includes("auth-token") || c.name.includes("sb-")
  );

  if (!hasSession) {
    redirect("/login");
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Get member info for role
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .single();

  const role = member?.role || "viewer";

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar memberName={member?.name || session.user.email || ""} role={role} />
      <main className="max-w-5xl mx-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
