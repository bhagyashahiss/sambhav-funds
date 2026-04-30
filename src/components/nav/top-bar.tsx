"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  LogOut,
  FolderOpen,
  ListChecks,
  ArrowRightLeft,
  IndianRupee,
} from "lucide-react";
import { UserRole } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/income", label: "Income", icon: IndianRupee },
  { href: "/dashboard/transfers", label: "Transfers", icon: ArrowRightLeft },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/categories", label: "Categories", icon: FolderOpen },
  { href: "/dashboard/expense-items", label: "Items", icon: ListChecks },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

interface TopBarProps {
  memberName: string;
  role: UserRole;
}

export function TopBar({ memberName, role }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary-700">SS</span>
          </div>
          <span className="font-semibold text-sm text-gray-900 hidden sm:block">
            SSYG Funds
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{memberName}</p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
