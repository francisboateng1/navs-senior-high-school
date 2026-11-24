import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, FileCheck2, ShieldCheck } from 'lucide-react';
import { useSchool } from '../../context/SchoolContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PageHeader } from '../../components/ui/Common.jsx';
import { apiUrl } from '../../services/api.js';

export default function AdmissionsPage() {
  useDocumentTitle('Admissions Centre', 'Admission requirements, direct application process, prospectus download, and status tracking.');
  const { data } = useSchool();
  const info = data?.schoolInfo || {};
  const admissionsFaqs = data?.faqs.filter((f) => f.category === 'Admissions' || f.category === 'Privacy') || [];

  return (
    <div>
      <PageHeader
        kicker="Direct Private SHS Admissions"
        title="Admissions Centre"
        subtitle={info.admission_overview}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Admissions' }]}
        actions={
          <>
            <Link
              to="/admissions/apply"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C1E3C] hover:bg-[#162B4D] text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
            >
              <span>Apply Online Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admissions/track"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-[#0C1E3C] text-[#0C1E3C] text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Track Application</span>
            </Link>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        <section>
          <h2 className="text-2xl font-semibold text-[#0C1E3C] mb-6">Direct School Admission Workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { step: '01. Prepare Documents', desc: 'Gather a recent passport photograph and BECE result slip or latest JHS academic report.' },
              { step: '02. Submit Online Form', desc: 'Complete applicant, parent/guardian, and programme preference details with guardian consent.' },
              { step: '03. Save Reference Number', desc: 'Receive an immediate unique reference number (NAVS-YYYY-XXXXXX) and verification code.' },
              { step: '04. Review & Decision', desc: 'Track review updates online and download your Provisional Admission Letter once accepted.' },
            ].map((item) => (
              <div key={item.step} className="bg-white border border-slate-200 rounded-lg p-6">
                <p className="text-sm font-semibold text-[#8D6419]">{item.step}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-7">
              <h2 className="text-xl font-semibold text-[#0C1E3C]">Eligibility &amp; Guidelines</h2>
              <p className="mt-3 text-sm text-slate-700 leading-relaxed">{info.admission_eligibility}</p>
              <div className="mt-5 pt-5 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-[#0C1E3C]">Important Admission Dates</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{info.admission_dates_summary}</p>
              </div>
              <div className="mt-5 pt-5 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-[#0C1E3C] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#8D6419]" />
                  <span>Privacy &amp; Minor Protection</span>
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{info.admission_guidelines}</p>
                <Link to="/privacy" className="mt-2 inline-block text-xs font-semibold text-[#0C1E3C] underline">
                  Read Data Protection Notice (Act 843)
                </Link>
              </div>
            </div>

            <div className="bg-[#0C1E3C] text-white rounded-lg p-7">
              <h3 className="text-lg font-semibold">Download Admissions Prospectus</h3>
              <p className="mt-2 text-sm text-slate-200 leading-relaxed">
                Access the printable prospectus summarizing available tracks, document checklists, and registry instructions.
              </p>
              <a
                href={apiUrl('/api/public/resources/prospectus')}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-[#B48327] hover:bg-[#9B6E1D] text-white text-sm font-semibold rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Open Printable Prospectus</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-7">
            <h2 className="text-xl font-semibold text-[#0C1E3C] mb-4">Configurable Requirements &amp; Documents</h2>
            <div className="divide-y divide-slate-200">
              {data?.requirements.map((req) => (
                <div key={req.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-base font-semibold text-[#0C1E3C]">{req.title}</h3>
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                      {req.is_mandatory_document ? 'Required Upload' : req.category}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{req.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#0C1E3C] mb-6">Admissions Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {admissionsFaqs.map((faq) => (
              <div key={faq.id} className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-[#0C1E3C]">{faq.question}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
