"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  SendHorizontal,
  Settings,
  ShieldCheck,
  Activity,
  LogOut,
  Fingerprint
} from "lucide-react";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-primary",
  },
  {
    label: "Send & Receive",
    icon: SendHorizontal,
    href: "/send",
    color: "text-emerald-400",
  },
  {
    label: "Simulate Tx",
    icon: Activity,
    href: "/simulate",
    color: "text-amber-400",
  },
  {
    label: "Guardians",
    icon: ShieldCheck,
    href: "/guardians",
    color: "text-purple-400",
  },
  {
    label: "Security Settings",
    icon: Settings,
    href: "/settings",
    color: "text-slate-300",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#0a0e17]/80 backdrop-blur-xl border-r border-white/10 text-white w-64 flex-shrink-0">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <Fingerprint className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-glow">
            BioVault
          </h1>
        </Link>
        <div className="space-y-2">
          {routes.map((route) => (
            <Link
              href={route.href}
              key={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 mb-4">
        <Link href="/" className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-red-400 text-zinc-400 hover:bg-white/10 rounded-lg transition-colors">
          <div className="flex items-center flex-1">
            <LogOut className="h-5 w-5 mr-3 text-red-400" />
            Lock Wallet
          </div>
        </Link>
      </div>
    </div>
  );
}
