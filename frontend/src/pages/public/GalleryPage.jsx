import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { EmptyState, LoadingSkeleton, PageHeader, SafeImage } from '../../components/ui/Common.jsx';

export default function GalleryPage() {
  useDocumentTitle('Campus Gallery', 'Photographs of NAVS Senior High School campus, laboratories, library, sports, and ceremonies.');
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const query = activeCategory !== 'all' ? `?category=${encodeURIComponent(activeCategory)}` : '';
        const res = await apiRequest(`/api/public/gallery${query}`);
        if (active) {
          setCategories(res.categories);
          setImages(res.images);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [activeCategory]);

  return (
    <div>
      <PageHeader
        kicker="Campus Photography"
        title="School Photo Gallery"
        subtitle="Explore classrooms, science laboratories, the library, athletics facilities, and school ceremonies."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Gallery' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeCategory === 'all' ? 'bg-[#0C1E3C] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Photos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeCategory === cat.slug ? 'bg-[#0C1E3C] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : images.length === 0 ? (
          <EmptyState
            title="No photos in this category yet"
            description="Administrators can upload and categorize campus photographs from the dashboard."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelected(img)}
                className="text-left bg-white border border-slate-200 rounded-lg overflow-hidden group hover:border-[#0C1E3C]/50 transition-colors"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <SafeImage
                    src={img.image_url}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-[#8D6419]">{img.category_name}</p>
                  <h2 className="mt-1 text-base font-semibold text-[#0C1E3C]">{img.title}</h2>
                  {img.caption && <p className="mt-1 text-xs text-slate-600 line-clamp-2">{img.caption}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div>
                <p className="text-xs font-semibold text-[#8D6419]">{selected.category_name}</p>
                <h3 className="text-base font-semibold text-[#0C1E3C]">{selected.title}</h3>
              </div>
              <button
                type="button"
                aria-label="Close image preview"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-950 max-h-[70vh] flex items-center justify-center">
              <SafeImage src={selected.image_url} alt={selected.title} className="max-h-[70vh] w-auto object-contain" />
            </div>
            {selected.caption && (
              <p className="px-5 py-3 text-sm text-slate-700 bg-white border-t border-slate-200">{selected.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
