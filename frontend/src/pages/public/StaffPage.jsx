import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { EmptyState, LoadingSkeleton, PageHeader, SafeImage } from '../../components/ui/Common.jsx';

export default function StaffPage() {
  useDocumentTitle('Staff & Management', 'School leadership, faculty heads, and administrative directory.');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest('/api/public/staff')
      .then((res) => {
        if (active) setStaff(res.staff);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        kicker="Leadership & Faculty"
        title="Staff & Management Directory"
        subtitle="Approved public profiles of NAVS Senior High School leadership, heads of department, and administrative officers."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Staff & Management' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : staff.length === 0 ? (
          <EmptyState
            title="No public staff profiles published"
            description="School administrators can publish approved staff profiles from the Content Management section."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member) => (
              <article key={member.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <SafeImage
                    src={member.photo_url}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                    fallbackTitle={member.position}
                  />
                </div>
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#8D6419]">{member.department}</span>
                    <span aria-hidden="true">·</span>
                    <span>{member.category}</span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold text-[#0C1E3C]">{member.full_name}</h2>
                  <p className="text-sm font-medium text-slate-700">{member.position}</p>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{member.biography}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
