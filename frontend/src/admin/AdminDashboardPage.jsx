import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { LoadingSkeleton, StatusLabel } from '../components/ui/Common.jsx';

export default function AdminDashboardPage() {
  useDocumentTitle('Admin Dashboard', 'Admissions metrics and recent administrative activity.');
  const { hasPermission } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/admissions/stats')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={6} />;

  const s = data?.stats;

  const kpis = [
    { label: 'Total Applications', value: s?.total ?? 0 },
    { label: 'New (Submitted)', value: s?.submitted ?? 0 },
    { label: 'Under Review', value: (s?.underReview ?? 0) + (s?.shortlisted ?? 0) },
    { label: 'Accepted', value: s?.accepted ?? 0 },
    { label: 'Waitlisted', value: s?.waitlisted ?? 0 },
    { label: 'Rejected', value: s?.rejected ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0C1E3C]">Administrative Overview</h1>
          <p className="text-sm text-slate-600 mt-1">
            Live admissions metrics, pending enquiries, and recent administrative activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('admissions:read') && (
            <Link
              to="/admin/admissions"
              className="px-4 py-2 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md hover:bg-[#162B4D] whitespace-nowrap"
            >
              Review Applications
            </Link>
          )}
        </div>
      </div>

      {!data?.smtpConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-sm text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Email Notification Provider Not Configured</p>
            <p className="text-xs mt-0.5 leading-relaxed">
              Admissions workflows continue operating normally and email messages are recorded in the Notifications log. Configure <code className="font-mono">SMTP_HOST</code>, <code className="font-mono">SMTP_USER</code>, and <code className="font-mono">SMTP_PASS</code> in your server environment variables to enable live email delivery.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#0C1E3C] tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0C1E3C]">Recent Applications</h2>
            {hasPermission('admissions:read') && (
              <Link to="/admin/admissions" className="text-xs font-semibold text-[#0C1E3C] hover:underline">
                View All &rarr;
              </Link>
            )}
          </div>
          {!hasPermission('admissions:read') ? (
            <p className="p-6 text-sm text-slate-500">
              Your current role does not include applicant record access. Use Website Content in the sidebar.
            </p>
          ) : data?.recentApplications.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No applications have been submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Reference</th>
                    <th className="px-4 py-2.5 font-medium">Applicant</th>
                    <th className="px-4 py-2.5 font-medium">Programme</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data?.recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{app.reference_number}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{app.applicant_name}</td>
                      <td className="px-4 py-3 text-slate-600">{app.programme_name}</td>
                      <td className="px-4 py-3">
                        <StatusLabel status={app.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-[#0C1E3C]">Recent Activity Log</h2>
          </div>
          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {data?.recentActivity.map((log) => (
              <div key={log.id} className="px-5 py-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#0C1E3C]">{log.action}</span>
                  <span className="text-slate-400 tabular-nums">{log.created_at}</span>
                </div>
                <p className="text-slate-600 mt-0.5">
                  {log.actor_email || 'Public Applicant'} {log.entity_id ? `· ${log.entity_id}` : ''}
                </p>
                {log.details && <p className="text-slate-500 mt-0.5">{log.details}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
