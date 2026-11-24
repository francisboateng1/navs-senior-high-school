import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, Search, X } from 'lucide-react';
import { apiRequest, apiUrl, fetchAuthorizedBlob } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSchool } from '../context/SchoolContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { EmptyState, LoadingSkeleton, StatusLabel } from '../components/ui/Common.jsx';

export default function AdminAdmissionsPage() {
  useDocumentTitle('Admissions Management', 'Review applications, verify uploaded documents, make admission decisions, and export CSV.');
  const { hasPermission } = useAuth();
  const { data: schoolData } = useSchool();
  const { showToast } = useToast();

  const [applications, setApplications] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [newStatus, setNewStatus] = useState('Under Review');
  const [publicNote, setPublicNote] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [internalNote, setInternalNote] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  const [docPreviewUrl, setDocPreviewUrl] = useState(null);
  const [letterPreviewHtml, setLetterPreviewHtml] = useState(null);
  const letterPreviewRef = useRef(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (yearFilter !== 'All') params.set('academicYearId', yearFilter);
      const res = await apiRequest(`/api/admin/admissions?${params.toString()}`);
      setApplications(res.applications);
      setStatuses(res.statuses);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load applications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, yearFilter, showToast]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const openDetail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setLetterPreviewHtml(null);
    try {
      const res = await apiRequest(`/api/admin/admissions/${id}`);
      setDetail(res);
      setNewStatus(res.application.status);
      setPublicNote(res.application.applicant_public_note || '');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load application detail.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSavingDecision(true);
    try {
      const res = await apiRequest(`/api/admin/admissions/${selectedId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, publicNote, sendEmail }),
      });
      showToast(res.message, 'success');
      await Promise.all([openDetail(selectedId), loadApplications()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status.', 'error');
    } finally {
      setSavingDecision(false);
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!selectedId || !internalNote.trim()) return;
    try {
      await apiRequest(`/api/admin/admissions/${selectedId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: internalNote.trim() }),
      });
      setInternalNote('');
      showToast('Internal note saved.', 'success');
      await openDetail(selectedId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save internal note.', 'error');
    }
  };

  const handleViewDocument = async (docId, originalName) => {
    try {
      const { blob, contentType } = await fetchAuthorizedBlob(`/api/admin/admissions/documents/${docId}`);
      const url = URL.createObjectURL(blob);
      setDocPreviewUrl({ url, mime: contentType, name: originalName });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load document.', 'error');
    }
  };

  const handleGenerateLetter = async () => {
    if (!selectedId) return;
    try {
      const html = await apiRequest(`/api/admin/admissions/${selectedId}/letter`);
      setLetterPreviewHtml(html);
      showToast('Provisional Admission Letter generated.', 'success');
      setTimeout(() => {
        letterPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to generate letter.', 'error');
    }
  };

  const handleDownloadAdminLetter = () => {
    if (!letterPreviewHtml || !detail) return;
    const blob = new Blob([letterPreviewHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NAVS-Admission-Letter-${detail.application.reference_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (yearFilter !== 'All') params.set('academicYearId', yearFilter);
      const { blob } = await fetchAuthorizedBlob(`/api/admin/admissions/export/csv?${params.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navs-admissions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export CSV.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0C1E3C]">Admissions Management</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Search applicants, inspect restricted documents, record committee decisions, and export records.
          </p>
        </div>
        {hasPermission('admissions:export') && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-[#0C1E3C] text-[#0C1E3C] text-sm font-semibold rounded-md whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search applications"
            placeholder="Search reference, name, guardian email, BECE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
          />
        </div>

        <div className="md:col-span-4">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            <option value="All">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="Filter by academic year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            <option value="All">All Academic Years</option>
            {schoolData?.academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No matching applications"
              description="Try adjusting your search or filter criteria, or await new online applicant submissions."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-4 py-3 font-medium">Programme</th>
                  <th className="px-4 py-3 font-medium">Guardian</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 whitespace-nowrap">
                      {app.reference_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{app.applicant_name}</p>
                      <p className="text-xs text-slate-500">{app.previous_school}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {app.programme_name} ({app.boarding_preference})
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{app.guardian_name}</p>
                      <p className="text-xs text-slate-500">{app.guardian_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {app.submitted_at.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusLabel status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(app.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0C1E3C] border border-slate-300 rounded hover:border-[#0C1E3C]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-950/60 flex justify-end">
          <div className="bg-white w-full max-w-3xl h-full overflow-y-auto shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-slate-500">
                  {detail?.application.reference_number || 'Loading...'}
                </p>
                <h2 className="text-lg font-semibold text-[#0C1E3C]">
                  {detail?.application.applicant_name || 'Application Review'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close review drawer"
                onClick={() => setSelectedId(null)}
                className="p-2 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="p-6">
                <LoadingSkeleton rows={6} />
              </div>
            ) : (
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm bg-[#FAF9F6] border border-slate-200 rounded-lg p-5">
                  <div>
                    <h3 className="text-xs font-semibold text-[#8D6419] uppercase mb-2">Applicant Profile</h3>
                    <p><strong>Full Name:</strong> {detail.application.applicant_name}</p>
                    <p><strong>DOB:</strong> <span className="tabular-nums">{detail.application.date_of_birth}</span></p>
                    <p><strong>Nationality:</strong> {detail.application.nationality}</p>
                    <p><strong>Location:</strong> {detail.application.residential_location}</p>
                    <p><strong>Previous School:</strong> {detail.application.previous_school}</p>
                    {detail.application.bece_index_number && (
                      <p><strong>BECE Index:</strong> <span className="font-mono">{detail.application.bece_index_number}</span></p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#8D6419] uppercase mb-2">Guardian &amp; Programme</h3>
                    <p><strong>Guardian:</strong> {detail.application.guardian_name} ({detail.application.guardian_relationship})</p>
                    <p><strong>Phone:</strong> {detail.application.guardian_telephone}</p>
                    <p><strong>Email:</strong> {detail.application.guardian_email}</p>
                    <p><strong>1st Choice:</strong> {detail.application.programme_name}</p>
                    <p><strong>Residency:</strong> {detail.application.boarding_preference}</p>
                    <p><strong>Academic Year:</strong> {detail.application.academic_year_label}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#0C1E3C] mb-3">
                    Uploaded Documents (Restricted Access)
                  </h3>
                  {detail.documents.length === 0 ? (
                    <p className="text-sm text-slate-500">No documents attached.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detail.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="border border-slate-200 rounded-md p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#8D6419] uppercase">{doc.document_type.replace(/_/g, ' ')}</p>
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.original_filename}</p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {(doc.file_size_bytes / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc.id, doc.original_filename)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#0C1E3C] text-white rounded hover:bg-[#162B4D] shrink-0"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {hasPermission('admissions:decide') && (
                  <form onSubmit={handleUpdateStatus} className="border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-base font-semibold text-[#0C1E3C]">Admission Decision &amp; Status</h3>
                      {detail.application.status === 'Accepted' && (
                        <button
                          type="button"
                          onClick={handleGenerateLetter}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 text-white text-xs font-semibold rounded hover:bg-emerald-900"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Generate Admission Letter</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="decision-status" className="block text-xs font-semibold text-slate-600 mb-1">
                          Application Status
                        </label>
                        <select
                          id="decision-status"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sendEmail}
                            onChange={(e) => setSendEmail(e.target.checked)}
                            className="w-4 h-4 accent-[#0C1E3C]"
                          />
                          <span>Trigger applicant email notification</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="decision-public-note" className="block text-xs font-semibold text-slate-600 mb-1">
                        Applicant-Visible Status Note (Shown on Tracking Portal)
                      </label>
                      <textarea
                        id="decision-public-note"
                        rows={2}
                        value={publicNote}
                        onChange={(e) => setPublicNote(e.target.value)}
                        placeholder="Optional message visible to the applicant/guardian..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingDecision}
                      className="px-5 py-2 bg-[#0C1E3C] hover:bg-[#162B4D] disabled:opacity-60 text-white text-sm font-semibold rounded-md"
                    >
                      {savingDecision ? 'Saving Decision...' : 'Save Status Update'}
                    </button>
                  </form>
                )}

                {letterPreviewHtml && (
                  <div ref={letterPreviewRef} className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 flex items-center justify-between gap-3 border-b border-slate-200">
                      <span className="text-xs font-semibold text-slate-700">Generated Admission Decision Letter</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleDownloadAdminLetter}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#0C1E3C] text-white rounded hover:bg-[#162B4D]"
                        >
                          Download Letter
                        </button>
                        <a
                          href={apiUrl(`/api/admin/admissions/${selectedId}/letter`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#0C1E3C] underline"
                        >
                          Open Printable View
                        </a>
                      </div>
                    </div>
                    <iframe title="Admin Letter Preview" srcDoc={letterPreviewHtml} className="w-full h-96 bg-white" />
                  </div>
                )}

                {hasPermission('admissions:decide') && (
                  <div className="border border-slate-200 rounded-lg p-5 space-y-4">
                    <h3 className="text-base font-semibold text-[#0C1E3C]">
                      Internal Committee Notes (Confidential — Never Shown to Applicants)
                    </h3>
                    <form onSubmit={handleAddInternalNote} className="flex gap-2">
                      <input
                        type="text"
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        placeholder="Add internal review note..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-md hover:bg-slate-900"
                      >
                        Add Note
                      </button>
                    </form>
                    <div className="space-y-2.5">
                      {detail.internalNotes.map((n) => (
                        <div key={n.id} className="bg-[#FAF9F6] border border-slate-200 rounded p-3 text-xs">
                          <div className="flex justify-between text-slate-500">
                            <span className="font-semibold text-slate-700">{n.admin_name}</span>
                            <span className="tabular-nums">{n.created_at}</span>
                          </div>
                          <p className="mt-1 text-slate-800">{n.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {docPreviewUrl && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0C1E3C]">{docPreviewUrl.name}</span>
              <button
                type="button"
                aria-label="Close document viewer"
                onClick={() => {
                  URL.revokeObjectURL(docPreviewUrl.url);
                  setDocPreviewUrl(null);
                }}
                className="p-1.5 rounded hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[75vh] bg-slate-100 flex items-center justify-center">
              {docPreviewUrl.mime === 'application/pdf' ? (
                <iframe title={docPreviewUrl.name} src={docPreviewUrl.url} className="w-full h-full" />
              ) : (
                <img src={docPreviewUrl.url} alt={docPreviewUrl.name} className="max-h-full max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
