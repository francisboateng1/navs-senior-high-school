import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import { apiRequest, apiUrl } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PageHeader, StatusLabel } from '../components/ui/Common.jsx';

export default function TrackApplicationPage() {
  useDocumentTitle('Track Application', 'Check your NAVS Senior High School admission application status securely.');
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [referenceNumber, setReferenceNumber] = useState(searchParams.get('ref') || '');
  const [verificationDetail, setVerificationDetail] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [letterHtml, setLetterHtml] = useState(null);

  const performLookup = async (ref, detail) => {
    setError(null);
    setLetterHtml(null);
    setLoading(true);
    try {
      const res = await apiRequest('/api/admissions/track', {
        method: 'POST',
        body: JSON.stringify({ referenceNumber: ref.trim(), verificationDetail: detail.trim() }),
      });
      setResult(res.application);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Unable to locate application.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refParam = searchParams.get('ref');
    const codeParam = searchParams.get('code');
    if (refParam && codeParam) {
      void performLookup(refParam, codeParam);
    }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!referenceNumber.trim() || !verificationDetail.trim()) {
      setError('Please enter both your Application Reference Number and verification detail.');
      return;
    }
    void performLookup(referenceNumber, verificationDetail);
  };

  const handleFetchLetter = async () => {
    try {
      const res = await fetch(apiUrl('/api/admissions/letter'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          referenceNumber: referenceNumber.trim(),
          verificationDetail: verificationDetail.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Unable to load admission letter.');
      }
      const html = await res.text();
      setLetterHtml(html);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load letter.', 'error');
    }
  };

  const handleDownloadLetterFile = () => {
    if (!letterHtml || !result) return;
    const blob = new Blob([letterHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NAVS-Admission-Letter-${result.referenceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        kicker="Applicant Verification Portal"
        title="Track Admission Application"
        subtitle="Enter your Application Reference Number together with your registered guardian email or verification code."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admissions', to: '/admissions' },
          { label: 'Track Status' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        >
          <div className="md:col-span-5">
            <label htmlFor="track-ref" className="block text-sm font-medium text-slate-700 mb-1.5">
              Application Reference Number *
            </label>
            <input
              id="track-ref"
              type="text"
              placeholder="NAVS-2026-XXXXXX"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
            />
          </div>

          <div className="md:col-span-5">
            <label htmlFor="track-verify" className="block text-sm font-medium text-slate-700 mb-1.5">
              Guardian Email or Verification Code *
            </label>
            <input
              id="track-verify"
              type="text"
              placeholder="parent@example.com or 8-char code"
              value={verificationDetail}
              onChange={(e) => setVerificationDetail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0C1E3C] hover:bg-[#162B4D] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Checking...' : 'Check'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <p className="text-xs font-mono text-slate-500">{result.referenceNumber}</p>
                <h2 className="text-2xl font-semibold text-[#0C1E3C] mt-0.5">{result.applicantName}</h2>
              </div>
              <div className="px-3.5 py-2 bg-[#FAF9F6] border border-slate-200 rounded-md" data-testid="tracked-status">
                <StatusLabel status={result.status} />
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Programme</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{result.programmeName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Academic Year</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{result.academicYearLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Residency</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{result.boardingPreference}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Submitted On</dt>
                <dd className="font-semibold text-slate-900 mt-0.5 tabular-nums">{result.submittedAt.slice(0, 10)}</dd>
              </div>
            </dl>

            {result.publicNote && (
              <div className="p-4 bg-[#FAF9F6] border border-slate-200 rounded-md text-sm text-slate-700">
                <p className="text-xs font-semibold text-[#8D6419] uppercase mb-1">Admissions Office Update</p>
                <p>{result.publicNote}</p>
              </div>
            )}

            {result.canDownloadLetter && (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-950">Provisional Admission Letter Ready</p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your application has been accepted. You may preview or download your official admission letter below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFetchLetter}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-md whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>View Admission Letter</span>
                </button>
              </div>
            )}

            {letterHtml && (
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">Official Provisional Admission Letter Preview</span>
                  <button
                    type="button"
                    onClick={handleDownloadLetterFile}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#0C1E3C] text-white rounded hover:bg-[#162B4D]"
                  >
                    Download Letter File
                  </button>
                </div>
                <iframe
                  title="Provisional Admission Letter"
                  srcDoc={letterHtml}
                  className="w-full h-[460px] bg-white"
                />
              </div>
            )}

            <div>
              <h3 className="text-base font-semibold text-[#0C1E3C] mb-3">Application Progress Timeline</h3>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {result.history.map((item, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                    <div>
                      <StatusLabel status={item.new_status} />
                      {item.public_note && <p className="mt-1 text-xs text-slate-600">{item.public_note}</p>}
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums shrink-0">{item.changed_at}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center">
          Have not applied yet?{' '}
          <Link to="/admissions/apply" className="text-[#0C1E3C] font-semibold underline">
            Start a New Online Application
          </Link>
        </p>
      </div>
    </div>
  );
}
