import React from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../../context/SchoolContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PageHeader, SafeImage } from '../../components/ui/Common.jsx';

export default function AboutPage() {
  useDocumentTitle('About Us', 'School history, vision, mission, core values, leadership, and campus infrastructure.');
  const { data } = useSchool();
  const info = data?.schoolInfo || {};

  return (
    <div>
      <PageHeader
        kicker="Institutional Identity"
        title={`About ${info.school_name || 'NAVS Senior High School'}`}
        subtitle="Building disciplined scholarship, ethical leadership, and community responsibility in Ghana."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'About Us' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#0C1E3C]">School Motto</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{info.school_motto}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#0C1E3C]">Vision</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{info.vision}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#0C1E3C]">Mission</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{info.mission}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#0C1E3C]">Core Values</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{info.core_values}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#0C1E3C]">School History &amp; Background</h2>
              <p className="mt-3 text-slate-700 leading-relaxed">{info.about_history}</p>
              <p className="mt-4 text-slate-700 leading-relaxed">{info.about_background}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0C1E3C]">Educational Philosophy</h3>
              <p className="mt-2.5 text-slate-700 leading-relaxed">{info.educational_philosophy}</p>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200">
              <SafeImage
                src="/src/assets/images/campus_assembly_hall_1795530808668.jpg"
                alt="NAVS Senior High School assembly auditorium"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 italic">
              NAVS Great Assembly &amp; Cultural Hall
            </p>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-semibold text-[#0C1E3C]">School Management &amp; Governance</h2>
              <p className="mt-1 text-sm text-slate-600">
                Leadership structure guiding academic instruction, pastoral care, and school administration.
              </p>
            </div>
            <Link
              to="/staff"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0C1E3C] hover:bg-[#162B4D] rounded-md whitespace-nowrap shrink-0"
            >
              View Full Staff Directory
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-[#FAF9F6] border border-slate-200 rounded-md">
              <p className="text-xs font-semibold text-[#8D6419] uppercase">01. Executive Leadership</p>
              <h3 className="mt-1.5 text-base font-semibold text-[#0C1E3C]">{info.headmaster_title}</h3>
              <p className="mt-1 text-sm text-slate-600">{info.headmaster_name}</p>
            </div>
            <div className="p-5 bg-[#FAF9F6] border border-slate-200 rounded-md">
              <p className="text-xs font-semibold text-[#8D6419] uppercase">02. Academic Affairs</p>
              <h3 className="mt-1.5 text-base font-semibold text-[#0C1E3C]">Departments &amp; Heads</h3>
              <p className="mt-1 text-sm text-slate-600">
                {data?.departments.length || 4} Academic Departments coordinating instruction and assessment.
              </p>
            </div>
            <div className="p-5 bg-[#FAF9F6] border border-slate-200 rounded-md">
              <p className="text-xs font-semibold text-[#8D6419] uppercase">03. Registry &amp; Pastoral Care</p>
              <h3 className="mt-1.5 text-base font-semibold text-[#0C1E3C]">Admissions &amp; Student Welfare</h3>
              <p className="mt-1 text-sm text-slate-600">
                Dedicated admissions officers, housemasters, and guidance coordinators.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
