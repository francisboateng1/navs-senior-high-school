import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page Not Found');
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="text-xs font-semibold tracking-widest uppercase text-[#8D6419]">Error 404</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-[#0C1E3C]">Page Not Found</h1>
      <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
        The page you requested could not be found. It may have been moved or removed.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          to="/"
          className="px-5 py-2.5 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md hover:bg-[#162B4D]"
        >
          Return Home
        </Link>
        <Link
          to="/admissions"
          className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:border-[#0C1E3C]"
        >
          Admissions Centre
        </Link>
      </div>
    </div>
  );
}
