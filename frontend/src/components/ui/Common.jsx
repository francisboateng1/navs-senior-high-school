import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, GraduationCap, AlertTriangle, CheckCircle2, Clock, FileWarning, Info, XCircle } from 'lucide-react';
import { apiUrl } from '../../services/api.js';

export function SafeImage({ src, alt, className = '', fallbackTitle }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0C1E3C] to-[#1A3561] text-white p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <GraduationCap className="w-8 h-8 text-[#D4A84B] mb-2 opacity-90" />
        <span className="text-xs font-medium tracking-wide text-slate-200 max-w-[18ch]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  const resolvedSrc = src.startsWith('/media/') ? apiUrl(src) : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 flex-wrap">
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-[#0C1E3C] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({ kicker, title, subtitle, breadcrumbs, actions }) {
  return (
    <section className="bg-white border-b border-slate-200 py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl">
            {kicker && (
              <p className="text-xs font-semibold tracking-wider text-[#8D6419] mb-2">
                {kicker}
              </p>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold text-[#0C1E3C] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

export function StatusLabel({ status }) {
  const styles = {
    Submitted: { text: 'text-slate-700', icon: <Clock className="w-3.5 h-3.5 text-slate-500" /> },
    'Under Review': { text: 'text-blue-800', icon: <Info className="w-3.5 h-3.5 text-blue-600" /> },
    'Additional Information Required': {
      text: 'text-amber-800',
      icon: <FileWarning className="w-3.5 h-3.5 text-amber-600" />,
    },
    Shortlisted: { text: 'text-indigo-800', icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> },
    Accepted: { text: 'text-emerald-800', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
    Waitlisted: { text: 'text-amber-800', icon: <Clock className="w-3.5 h-3.5 text-amber-600" /> },
    Rejected: { text: 'text-red-800', icon: <XCircle className="w-3.5 h-3.5 text-red-600" /> },
    Withdrawn: { text: 'text-slate-500', icon: <XCircle className="w-3.5 h-3.5 text-slate-400" /> },
  };
  const cfg = styles[status] || { text: 'text-slate-700', icon: <Info className="w-3.5 h-3.5 text-slate-500" /> };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${cfg.text}`}>
      {cfg.icon}
      <span>{status}</span>
    </span>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="border border-slate-200 bg-white rounded-lg p-10 text-center max-w-xl mx-auto my-6">
      <h3 className="text-lg font-semibold text-[#0C1E3C]">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-200/70 rounded-md w-full" />
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-3">
          {destructive && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          <div>
            <h3 className="text-lg font-semibold text-[#0C1E3C]">{title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md whitespace-nowrap shrink-0 ${
              destructive ? 'bg-red-700 hover:bg-red-800' : 'bg-[#0C1E3C] hover:bg-[#162B4D]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
