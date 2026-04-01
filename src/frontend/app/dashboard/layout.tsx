"use client";

import { useAuth } from "@/lib/auth";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ownerLinks = [
  { href: "/dashboard/objects/", label: "Мои объекты", icon: "🏡" },
  { href: "/dashboard/objects/new/", label: "Создать объект", icon: "➕" },
  { href: "/dashboard/profile/", label: "Профиль", icon: "👤" },
];

const adminLinks = [
  { href: "/dashboard/admin/objects/", label: "Все объекты", icon: "📋" },
  { href: "/dashboard/admin/objects/new/", label: "Создать объект", icon: "➕" },
  { href: "/dashboard/admin/regions/", label: "Регионы и города", icon: "🗺️" },
  { href: "/dashboard/admin/types/", label: "Типы объектов", icon: "🏷️" },
  { href: "/dashboard/admin/catalog/", label: "Теги и удобства", icon: "🧩" },
  { href: "/dashboard/admin/seo/", label: "SEO", icon: "🔍" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/";
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "Admin";
  const links = isAdmin ? [...ownerLinks, ...adminLinks] : ownerLinks;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Mobile nav toggle */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Меню
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "block" : "hidden"} md:block w-full md:w-56 flex-shrink-0`}>
          <nav className="space-y-1">
            {isAdmin && (
              <div className="text-xs font-semibold text-gray-400 uppercase px-3 pt-2 pb-1">Владелец</div>
            )}
            {ownerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  pathname === link.href || pathname.startsWith(link.href.replace(/\/$/, "") + "/")
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </a>
            ))}
            {isAdmin && (
              <>
                <div className="text-xs font-semibold text-gray-400 uppercase px-3 pt-4 pb-1">Администратор</div>
                {adminLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                      pathname === link.href || pathname.startsWith(link.href.replace(/\/$/, ""))
                        ? "bg-primary-50 text-primary-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span>{link.icon}</span>
                    {link.label}
                  </a>
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
