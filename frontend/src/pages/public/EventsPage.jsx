import React, { useEffect, useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { EmptyState, LoadingSkeleton, PageHeader, SafeImage } from '../../components/ui/Common.jsx';

export default function EventsPage() {
  useDocumentTitle('Events', 'Upcoming and past academic, cultural, and sports events at NAVS Senior High School.');
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest('/api/public/events')
      .then((res) => {
        if (active) setEvents(res.events);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const nowIso = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date.slice(0, 10) >= nowIso);
  const past = events.filter((e) => e.event_date.slice(0, 10) < nowIso).reverse();
  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <div>
      <PageHeader
        kicker="School Calendar"
        title="School Events"
        subtitle="Academic assemblies, open campus days, parent forums, and inter-house athletics schedules."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Events' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'upcoming' ? 'bg-[#0C1E3C] text-white' : 'text-slate-600 hover:text-[#0C1E3C]'
            }`}
          >
            Upcoming Events ({upcoming.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('past')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'past' ? 'bg-[#0C1E3C] text-white' : 'text-slate-600 hover:text-[#0C1E3C]'
            }`}
          >
            Past Events ({past.length})
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={`No ${tab} events listed`}
            description="School administrators can add and publish upcoming calendar events from the dashboard."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visible.map((ev) => (
              <article key={ev.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col sm:flex-row">
                {ev.image_url && (
                  <div className="sm:w-48 h-48 sm:h-auto shrink-0">
                    <SafeImage src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#8D6419]">{ev.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {ev.event_date.slice(0, 10)}
                    </span>
                    {ev.end_time && <span>({ev.end_time})</span>}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-[#0C1E3C]">{ev.title}</h2>
                  <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{ev.location}</span>
                  </p>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{ev.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
