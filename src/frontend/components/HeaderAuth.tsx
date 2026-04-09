"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { LoginModal } from "./LoginModal";

const roleLabels: Record<string, string> = {
  User: "Арендатор",
  Owner: "Арендодатель",
  Admin: "Админ",
  Author: "Автор",
};

interface MenuItem {
  href: string;
  icon: string;
  label: string;
}

const ownerMenuItems: MenuItem[] = [
  { href: "/dashboard/objects/", icon: "🏠", label: "Мои объекты" },
  { href: "/dashboard/objects/new/", icon: "➕", label: "Создать объект" },
  { href: "/dashboard/profile/", icon: "👤", label: "Профиль" },
];

const authorMenuItems: MenuItem[] = [
  { href: "/dashboard/admin/blog/", icon: "📝", label: "Мои статьи" },
  { href: "/dashboard/admin/blog/new/", icon: "➕", label: "Создать статью" },
  { href: "/dashboard/author-profile/", icon: "👤", label: "Профиль" },
];

const adminMenuItems: MenuItem[] = [
  { href: "/dashboard/admin/objects/", icon: "📋", label: "Все объекты" },
  { href: "/dashboard/admin/regions/", icon: "🗺️", label: "Регионы и города" },
  { href: "/dashboard/admin/types/", icon: "🏷️", label: "Типы объектов" },
  { href: "/dashboard/admin/catalog/", icon: "🧩", label: "Теги и удобства" },
  { href: "/dashboard/admin/seo/", icon: "🔍", label: "SEO" },
  { href: "/dashboard/admin/blog/", icon: "📝", label: "Путеводитель" },
];

function getMenuSections(role: string): { items: MenuItem[]; title?: string }[] {
  switch (role) {
    case "Admin":
      return [
        { items: ownerMenuItems },
        { title: "Админка", items: adminMenuItems },
      ];
    case "Author":
      return [{ items: authorMenuItems }];
    case "Owner":
      return [{ items: ownerMenuItems }];
    default:
      return [];
  }
}

function MenuLink({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <a
      href={item.href}
      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
      onClick={onClick}
    >
      <span>{item.icon}</span> {item.label}
    </a>
  );
}

export function HeaderAuth() {
  const { user, loading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading) {
    return <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />;
  }

  const closeMenu = () => setMenuOpen(false);
  const sections = user ? getMenuSections(user.role) : [];

  return (
    <>
      {user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-navy-700 hover:text-primary-600 transition"
          >
            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary-700">{user.firstName[0]}</span>
              )}
            </div>
            <span className="hidden sm:inline">
              {user.firstName}
              <span className="text-xs text-gray-400 ml-1">({roleLabels[user.role] || user.role})</span>
            </span>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1">
              {sections.map((section, si) => (
                <div key={si}>
                  {si > 0 && <div className="border-t border-gray-100 my-1" />}
                  {section.title && (
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {section.title}
                    </div>
                  )}
                  {section.items.map((item) => (
                    <MenuLink key={item.href + item.label} item={item} onClick={closeMenu} />
                  ))}
                </div>
              ))}
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { logout(); closeMenu(); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <span>🚪</span> Выйти
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowLogin(true)}
          className="text-sm text-navy-600 hover:text-primary-600 flex items-center gap-1.5 transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          Войти
        </button>
      )}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
