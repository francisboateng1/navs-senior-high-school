import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { EmptyState, LoadingSkeleton, PageHeader, SafeImage } from '../../components/ui/Common.jsx';

const CATEGORIES = ['All', 'Admissions', 'Academics', 'PTA Information', 'Examinations', 'Ceremonies', 'Achievements'];

export default function NewsPage() {
  useDocumentTitle('News & Announcements', 'School announcements, admission notices, examination updates, and PTA circulars.');
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (category !== 'All') params.set('category', category);
        if (search.trim()) params.set('search', search.trim());
        const res = await apiRequest(`/api/public/news?${params.toString()}`);
        if (active) setArticles(res.articles);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [category, search]);

  return (
    <div>
      <PageHeader
        kicker="Official School Bulletins"
        title="News & Announcements"
        subtitle="Stay informed with admission notices, academic updates, PTA circulars, and school achievements."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'News' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-lg">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-[#0C1E3C] text-white'
                    : 'text-slate-600 hover:text-[#0C1E3C] hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search news articles"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : articles.length === 0 ? (
          <EmptyState
            title="No announcements match your filter"
            description="Try selecting another category or clearing your search query."
            action={
              <button
                type="button"
                onClick={() => {
                  setCategory('All');
                  setSearch('');
                }}
                className="px-4 py-2 text-sm font-semibold bg-[#0C1E3C] text-white rounded-md"
              >
                Reset Filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <article
                key={article.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] overflow-hidden">
                    <SafeImage
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      fallbackTitle={article.category}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#8D6419]">{article.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{article.published_at.slice(0, 10)}</span>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-[#0C1E3C] leading-snug">
                      <Link to={`/news/${article.slug}`} className="hover:underline">
                        {article.title}
                      </Link>
                    </h2>
                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {article.summary}
                    </p>
                  </div>
                </div>
                <div className="px-6 pb-5 pt-2">
                  <Link
                    to={`/news/${article.slug}`}
                    className="text-sm font-semibold text-[#0C1E3C] hover:text-[#8D6419]"
                  >
                    Read Full Notice &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
