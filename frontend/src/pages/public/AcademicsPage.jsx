import React from 'react';
import { Link } from 'react-router-dom';
import { Download, BookOpen } from 'lucide-react';
import { useSchool } from '../../context/SchoolContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PageHeader } from '../../components/ui/Common.jsx';
import { apiUrl } from '../../services/api.js';

export default function AcademicsPage() {
  useDocumentTitle('Academics', 'Academic programmes, departments, subjects, calendar, and downloadable curriculum resources.');
  const { data } = useSchool();

  return (
    <div>
      <PageHeader
        kicker="Curriculum & Instruction"
        title="Academics at NAVS Senior High"
        subtitle="Structured senior secondary pathways preparing students for WASSCE mastery and tertiary education."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Academics' }]}
        actions={
          <Link
            to="/admissions/apply"
            className="px-5 py-2.5 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md hover:bg-[#162B4D]"
          >
            Apply for a Programme
          </Link>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
        <section>
          <h2 className="text-2xl font-semibold text-[#0C1E3C] mb-6">Academic Programmes &amp; Subject Tracks</h2>
          <div className="space-y-5">
            {data?.programmes.map((prog) => (
              <article key={prog.id} className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-[#8D6419]">{prog.department_name}</span>
                    <h3 className="text-xl font-semibold text-[#0C1E3C] mt-0.5">
                      {prog.name} <span className="font-mono text-sm text-slate-500">({prog.code})</span>
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">
                    {prog.is_accepting_applications ? 'Open for Admission' : 'Admissions Closed'}
                  </span>
                </div>
                <p className="mt-4 text-sm sm:text-base text-slate-700 leading-relaxed">{prog.description}</p>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Core Subjects</p>
                    <p className="mt-1 text-slate-800">{prog.core_subjects}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Elective Subjects</p>
                    <p className="mt-1 text-slate-800">{prog.elective_subjects}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Career Pathways</p>
                    <p className="mt-1 text-slate-800">{prog.career_pathways || 'Tertiary & Professional Studies'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#0C1E3C] mb-6">Academic Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.departments.map((dept) => (
              <div key={dept.id} className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#0C1E3C]">{dept.name}</h3>
                {dept.head_of_department && (
                  <p className="text-xs text-slate-500 mt-1">Department Lead: {dept.head_of_department}</p>
                )}
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{dept.overview}</p>
                <p className="mt-3 text-xs text-slate-600">
                  <strong>Subject Areas:</strong> {dept.subjects_summary}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 rounded-lg p-7">
            <h2 className="text-xl font-semibold text-[#0C1E3C]">Academic Calendar &amp; Intakes</h2>
            <div className="mt-4 divide-y divide-slate-200">
              {data?.academicYears.map((yr) => (
                <div key={yr.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-[#0C1E3C]">{yr.label}</p>
                    {yr.application_deadline && (
                      <p className="text-xs text-slate-500 tabular-nums">
                        Application Deadline: {yr.application_deadline}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${yr.admissions_open ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {yr.admissions_open ? 'Admissions Open' : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-7">
            <h2 className="text-xl font-semibold text-[#0C1E3C]">Examinations &amp; Resources</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Students complete continuous assessments, end-of-term internal examinations, and intensive preparation for the West African Senior School Certificate Examination (WASSCE).
            </p>
            <div className="mt-5 space-y-3">
              {data?.resources.map((res) => (
                <a
                  key={res.id}
                  href={apiUrl(res.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 p-3.5 rounded-md border border-slate-200 hover:border-[#0C1E3C] bg-[#FAF9F6] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-4 h-4 text-[#8D6419] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#0C1E3C]">{res.title}</p>
                      <p className="text-xs text-slate-600">{res.description}</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[#0C1E3C] shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
