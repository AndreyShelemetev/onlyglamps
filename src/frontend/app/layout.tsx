import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { HeaderAuth } from "@/components/HeaderAuth";
import { HeaderNav, MobileMenu } from "@/components/HeaderNav";
import { ScrollToTop } from "@/components/ScrollToTop";

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
      <head>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108462812','ym');ym(108462812,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`,
          }}
        />
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/108462812"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
        <header className="bg-white/95 backdrop-blur-md border-b border-navy-200 sticky top-0 z-50">
          <nav className="max-w-[1440px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <a href="/" className="flex items-center gap-2 shrink-0">
                <img src="/logo.png" alt="OnlyGlamps" className="h-20 w-auto" />
              </a>
              <HeaderNav />
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/owners/"
                className="hidden sm:inline-flex bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
              >
                Сдать объект
              </a>
              <HeaderAuth />
              <MobileMenu />
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
                  <li>
                    <a href="/owners/" className="hover:text-white transition">Сдать объект</a>
                  </li>
                  <li>
                    <a href="/blog/" className="hover:text-white transition">Путеводитель</a>
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
                <h4 className="font-semibold text-white mb-3">Правовая информация</h4>
                <ul className="space-y-1.5">
                  <li>
                    <a href="/privacy/" className="hover:text-white transition">Политика конфиденциальности</a>
                  </li>
                  <li>
                    <a href="/terms/" className="hover:text-white transition">Пользовательское соглашение</a>
                  </li>
                  <li>
                    <a href="/rules/" className="hover:text-white transition">Правила размещения</a>
                  </li>
                  <li>
                    <a href="/cookies/" className="hover:text-white transition">Политика cookies</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Контакты</h4>
                <ul className="space-y-1.5">
                  <li>
                    <a href="tel:+79933880764" className="hover:text-white transition">8 (993) 388-07-64</a>
                  </li>
                  <li>
                    <a href="mailto:info@onlyglamps.ru" className="hover:text-white transition">info@onlyglamps.ru</a>
                  </li>
                  <li className="text-navy-500">
                    г. Йошкар-Ола,<br />Прибрежный проезд, 14
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-navy-800 flex flex-col sm:flex-row justify-between gap-2 text-xs text-navy-500">
              <span>&copy; {new Date().getFullYear()} OnlyGlamps. Все права защищены.</span>
              <span>ИП Шелеметьев А.О. | info@onlyglamps.ru</span>
            </div>
          </div>
        </footer>
        <ScrollToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
