"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownItem {
  label: string;
  href: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
}

function NavDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-primary-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-navy-700 hover:text-primary-600 transition"
        aria-label="Меню"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {/* Типы размещения */}
            <div>
              <button
                onClick={() => toggleSection("types")}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg"
              >
                Типы размещения
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === "types" ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === "types" && (
                <div className="pl-4 space-y-0.5">
                  {accommodationTypes.map((item) => (
                    <a key={item.href} href={item.href} className="block px-3 py-2 text-sm text-gray-600 hover:text-primary-600" onClick={() => setOpen(false)}>
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {/* Направления */}
            <div>
              <button
                onClick={() => toggleSection("regions")}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg"
              >
                Направления
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === "regions" ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === "regions" && (
                <div className="pl-4 space-y-0.5">
                  {destinations.map((item) => (
                    <a key={item.href} href={item.href} className="block px-3 py-2 text-sm text-gray-600 hover:text-primary-600" onClick={() => setOpen(false)}>
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {/* Контакты */}
            <a href="/map/" className="block px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg flex items-center gap-2" onClick={() => setOpen(false)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Карта
            </a>
            <a href="/blog/" className="block px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg flex items-center gap-2" onClick={() => setOpen(false)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Путеводитель
            </a>
            <a href="/contacts/" className="block px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg" onClick={() => setOpen(false)}>
              Контакты
            </a>
            {/* Сдать объект */}
            <a
              href="/owners/"
              className="block mx-3 mt-3 text-center bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              onClick={() => setOpen(false)}
            >
              Сдать объект
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const accommodationTypes: DropdownItem[] = [
  { label: "Глэмпинги", href: "/mari-el/glempingi/" },
  { label: "Гостевые дома", href: "/mari-el/gostevye-doma/" },
  { label: "Бани и сауны", href: "/mari-el/bani/" },
  { label: "Коттеджи", href: "/mari-el/kottedzhi/" },
  { label: "Базы отдыха", href: "/mari-el/bazy-otdykha/" },
  { label: "Парк-отели", href: "/mari-el/park-oteli/" },
];

const destinations: DropdownItem[] = [
  { label: "Марий Эл", href: "/mari-el/" },
  { label: "Татарстан", href: "/tatarstan/" },
  { label: "Нижегородская область", href: "/nizhegorodskaya-oblast/" },
  { label: "Чувашия", href: "/chuvashskaya-respublika/" },
  { label: "Мордовия", href: "/respublika-mordoviya/" },
  { label: "Карелия", href: "/kareliya/" },
  { label: "Алтайский край", href: "/altayskiy-kray/" },
  { label: "Дагестан", href: "/dagestan/" },
];

export function HeaderNav() {
  return (
    <>
      {/* Desktop navigation */}
      <div className="hidden lg:flex items-center gap-1">
        <NavDropdown label="Типы размещения" items={accommodationTypes} />
        <NavDropdown label="Направления" items={destinations} />
        <a
          href="/map/"
          className="text-sm font-medium text-navy-700 hover:text-primary-600 transition px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Карта
        </a>
        <a
          href="/blog/"
          className="text-sm font-medium text-navy-700 hover:text-primary-600 transition px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Путеводитель
        </a>
        <a
          href="/contacts/"
          className="text-sm font-medium text-navy-700 hover:text-primary-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          Контакты
        </a>
      </div>

      {/* Mobile hamburger */}
      <MobileMenu />
    </>
  );
}
