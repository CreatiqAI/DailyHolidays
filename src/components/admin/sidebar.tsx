"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Inbox, LayoutDashboard, LogOut, Map, Menu, Route, X } from "lucide-react";
import { signOut } from "@/app/admin/actions";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/tours", label: "Tours", icon: Route },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/destinations", label: "Destinations", icon: Map },
];

export function Sidebar({ email, newEnquiries }: { email: string; newEnquiries: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-white/10 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white"
            }`}
          >
            <it.icon className="size-4" /> {it.label}
            {it.href === "/admin/enquiries" && newEnquiries > 0 && (
              <span className="ml-auto rounded-full bg-sun-500 px-2 py-0.5 text-xs font-bold text-white">{newEnquiries}</span>
            )}
          </Link>
        );
      })}
      <Link href="/" target="_blank" className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-200 hover:bg-white/5 hover:text-white">
        <ExternalLink className="size-4" /> View website
      </Link>
      <div className="mt-auto border-t border-white/10 pt-3">
        <p className="truncate px-3 text-xs text-navy-300">{email}</p>
        <form action={signOut}>
          <button type="submit" className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-200 hover:bg-white/5 hover:text-white">
            <LogOut className="size-4" /> Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <div className="flex h-14 items-center justify-between bg-navy-950 px-4 text-white lg:hidden">
        <span className="font-semibold">Daily Holidays Admin</span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && <div className="flex flex-col bg-navy-950 lg:hidden">{nav}</div>}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy-950 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="font-script text-2xl text-white">Daily</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-sun-400">Admin</span>
        </div>
        {nav}
      </aside>
    </>
  );
}
