import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { HeaderAuth } from "@/components/HeaderAuth";

export const metadata: Metadata = {
  metadataBase: new URL("https://onlyglamps.ru"),
  title: {
    default: "OnlyGlamps — глэмпинги, гостевые дома и бани посуточно",
    template: "%s | OnlyGlamps",
  },
  description:
    "Каталог глэмпингов, гостевых домов и бань для аренды посуточно. Фото, цены, карта, свободные даты и отзывы.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    siteName: "OnlyGlamps",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
        <header className="bg-white/95 backdrop-blur-md border-b border-navy-200 sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="OnlyGlamps" className="h-20 w-auto" />
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/owners/"
                className="text-sm font-medium text-navy-600 hover:text-primary-600 transition"
              >
                Сдать объект
              </a>
              <HeaderAuth />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-navy-900 py-10 mt-auto">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-navy-400">
              <div>
                <h4 className="font-semibold text-white mb-3">
                  OnlyGlamps
                </h4>
                <ul className="space-y-1.5">
                  <li>
                    <a href="/about/" className="hover:text-white transition">О сервисе</a>
                  </li>
                  <li>
                    <a href="/contacts/" className="hover:text-white transition">Контакты</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Типы</h4>
                <ul className="space-y-1.5">
                  <li>
                    <a href="/mari-el/glempingi/" className="hover:text-white transition">Глэмпинги</a>
                  </li>
                  <li>
                    <a href="/mari-el/gostevye-doma/" className="hover:text-white transition">Гостевые дома</a>
                  </li>
                  <li>
                    <a href="/mari-el/bani/" className="hover:text-white transition">Бани</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Правовая</h4>
                <ul className="space-y-1.5">
                  <li>
                    <a href="/privacy/" className="hover:text-white transition">Конфиденциальность</a>
                  </li>
                  <li>
                    <a href="/terms/" className="hover:text-white transition">Условия</a>
                  </li>
                  <li>
                    <a href="/rules/" className="hover:text-white transition">Правила</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Регионы</h4>
                <ul className="space-y-1.5">
                  <li>
                    <a href="/mari-el/" className="hover:text-white transition">Марий Эл</a>
                  </li>
                  <li>
                    <a href="/tatarstan/" className="hover:text-white transition">Татарстан</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-navy-800 text-xs text-navy-500">
              &copy; {new Date().getFullYear()} OnlyGlamps. Все права защищены.
            </div>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
