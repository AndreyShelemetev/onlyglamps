import { Metadata } from "next";
import Link from "next/link";
import { fetchArticles, ArticleListItem } from "@/lib/api";
import { SafeImage } from "@/components/SafeImage";

export const metadata: Metadata = {
  title: "Путеводитель по глэмпингам и местам отдыха — OnlyGlamps",
  description:
    "Статьи, обзоры и путеводители по лучшим местам для загородного отдыха в России. Глэмпинги, гостевые дома, бани и достопримечательности.",
  alternates: {
    canonical: "https://onlyglamps.ru/blog/",
  },
};

function ArticleCard({ article }: { article: ArticleListItem }) {
  const date = new Date(article.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Link
      href={`/blog/${article.slug}/`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {article.coverImageUrl ? (
          <SafeImage
            src={article.coverImageUrl}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-5">
        <h2 className="text-lg font-bold text-navy-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
          {article.title}
        </h2>
        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
          {article.description}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {article.readTimeMinutes} мин
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {article.views}
          </span>
          <span>{date}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const { data: articles } = await fetchArticles(1, 50);

  return (
    <main className="max-w-[1440px] mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600 transition">
          Главная
        </Link>
        <span>/</span>
        <span className="text-navy-900 font-medium">Путеводитель</span>
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold text-navy-900 mb-2">
        Путеводитель
      </h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Статьи и обзоры о лучших местах для загородного отдыха в России
      </p>

      {articles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="text-lg">Статьи пока не опубликованы</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
