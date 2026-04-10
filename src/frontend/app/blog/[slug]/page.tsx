import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchArticleBySlug } from "@/lib/api";
import { SafeImage } from "@/components/SafeImage";
import ArticleSidebar from "@/components/ArticleSidebar";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await fetchArticleBySlug(params.slug);
  if (!article) return { title: "Статья не найдена — OnlyGlamps" };

  return {
    title: `${article.title} — OnlyGlamps`,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      images: article.coverImageUrl ? [article.coverImageUrl] : [],
    },
  };
}

function extractH2Headings(html: string): { id: string; text: string }[] {
  const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const headings: { id: string; text: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 60);
    headings.push({ id, text });
  }
  return headings;
}

function addIdsToH2(html: string, headings: { id: string; text: string }[]): string {
  let idx = 0;
  return html.replace(/<h2([^>]*)>/gi, (full, attrs) => {
    if (idx < headings.length) {
      const id = headings[idx].id;
      idx++;
      return `<h2${attrs} id="${id}">`;
    }
    return full;
  });
}

export default async function ArticlePage({ params }: Props) {
  const article = await fetchArticleBySlug(params.slug);
  if (!article) notFound();

  const headings = extractH2Headings(article.content);
  const contentWithIds = addIdsToH2(article.content, headings);

  const date = new Date(article.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="max-w-5xl mx-auto px-6 md:px-10 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/blog/" className="hover:text-primary-600 transition">
          Путеводитель
        </Link>
        <span>&gt;</span>
        <span className="text-navy-900 font-medium line-clamp-1">
          {article.title.length > 30 ? article.title.substring(0, 30) + "…" : article.title}
        </span>
      </nav>

      {/* Content + Sidebar */}
      <div className="flex gap-10">
        {/* Sidebar - desktop only */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <ArticleSidebar headings={headings} />
          </aside>
        )}

        {/* Article header + body */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4">
            {article.h1}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {article.readTimeMinutes} минут
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {article.views}
            </span>
            <span className="text-gray-300">•</span>
            <span>{date}</span>
          </div>

          {/* Cover image */}
          {article.coverImageUrl && (
            <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-8">
              <SafeImage
                src={article.coverImageUrl}
                alt={article.h1}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
            </div>
          )}

          {/* Article body */}
          <article
            className="prose prose-lg max-w-none
              prose-headings:text-navy-900 prose-headings:font-bold
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: contentWithIds }}
          />
        </div>
      </div>

      {/* Author card */}
      {article.author && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden flex-shrink-0">
              {article.author.avatarUrl ? (
                <img
                  src={article.author.avatarUrl}
                  alt={`${article.author.firstName} ${article.author.lastName || ""}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">👤</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-navy-900">
                {article.author.firstName} {article.author.lastName || ""}
              </p>
              {article.author.bio && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{article.author.bio}</p>
              )}
              <Link
                href="/blog/"
                className="inline-block text-sm text-primary-600 hover:text-primary-700 font-medium mt-1 transition"
              >
                Все статьи автора
              </Link>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {article.author.vkUrl && (
                <a
                  href={article.author.vkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#0077FF] text-white rounded-full flex items-center justify-center hover:opacity-80 transition"
                  aria-label="VK"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.189 1.367 1.259 2.182 1.815.616.42 1.084.328 1.084.328l2.175-.03s1.138-.07.598-.964c-.044-.073-.314-.661-1.618-1.869-1.366-1.265-1.183-1.06.462-3.248.987-1.312 1.38-2.113 1.258-2.456-.116-.327-.832-.241-.832-.241l-2.45.015s-.181-.025-.316.056c-.131.079-.215.263-.215.263s-.387 1.028-.902 1.902c-1.088 1.848-1.524 1.946-1.702 1.832-.414-.266-.31-1.07-.31-1.64 0-1.783.271-2.525-.527-2.716-.265-.064-.46-.106-1.138-.113-.868-.009-1.603.003-2.018.207-.276.136-.49.438-.36.455.16.021.523.098.715.36.248.338.24 1.096.24 1.096s.142 2.098-.332 2.357c-.326.178-.773-.185-1.732-1.842-.49-.849-.861-1.787-.861-1.787s-.072-.175-.2-.269c-.154-.113-.37-.149-.37-.149l-2.328.015s-.35.01-.478.162c-.114.135-.009.414-.009.414s1.815 4.246 3.87 6.386c1.883 1.962 4.023 1.833 4.023 1.833h.97z" />
                  </svg>
                </a>
              )}
              {article.author.telegramUrl && (
                <a
                  href={article.author.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#26A5E4] text-white rounded-full flex items-center justify-center hover:opacity-80 transition"
                  aria-label="Telegram"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <Link
          href="/blog/"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Все статьи
        </Link>
      </div>
    </main>
  );
}
