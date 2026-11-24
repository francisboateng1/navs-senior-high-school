import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { Breadcrumbs, EmptyState, LoadingSkeleton, SafeImage } from '../../components/ui/Common.jsx';

export default function NewsDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(article?.title || 'News Notice', article?.summary);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiRequest(`/api/public/news/${slug}`);
        if (active) setArticle(res.article);
      } catch {
        if (active) setArticle(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (slug) void load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          title="Announcement Not Found"
          description="This news notice may have been unpublished or moved."
          action={
            <Link to="/news" className="px-4 py-2 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md">
              Back to All News
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'News', to: '/news' }, { label: article.title }]} />

      <div className="flex items-center gap-2 text-xs text-slate-500 mt-4">
        <span className="font-semibold text-[#8D6419] uppercase tracking-wider">{article.category}</span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">Published {article.published_at.slice(0, 10)}</span>
      </div>

      <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-[#0C1E3C] leading-tight">
        {article.title}
      </h1>
      <p className="mt-4 text-lg text-slate-600 leading-relaxed">{article.summary}</p>

      {article.image_url && (
        <div className="mt-8 aspect-[16/9] rounded-lg overflow-hidden border border-slate-200">
          <SafeImage src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mt-8 bg-white border border-slate-200 rounded-lg p-7 sm:p-10 prose max-w-none text-slate-800 leading-relaxed whitespace-pre-line">
        {article.content}
      </div>

      <div className="mt-8">
        <Link to="/news" className="text-sm font-semibold text-[#0C1E3C] hover:text-[#8D6419]">
          &larr; Return to News &amp; Announcements
        </Link>
      </div>
    </article>
  );
}
