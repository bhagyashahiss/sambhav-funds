"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  ArrowRightLeft,
  FolderOpen,
  ListChecks,
  IndianRupee,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/income", label: "Income", icon: IndianRupee },
  { href: "/dashboard/transfers", label: "Transfer", icon: ArrowRightLeft },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/categories", label: "Categories", icon: FolderOpen },
  { href: "/dashboard/expense-items", label: "Items", icon: ListChecks },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex items-center overflow-x-auto no-scrollbar h-16 px-1">
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
                "flex flex-col items-center justify-center min-w-[4.5rem] h-full text-xs gap-1 transition-colors",
                isActive
                  ? "text-primary-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
