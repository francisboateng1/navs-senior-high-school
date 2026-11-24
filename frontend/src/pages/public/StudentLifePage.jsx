import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PageHeader, SafeImage } from '../../components/ui/Common.jsx';
import schoolathletics from '../../assets/images/sports_athletics_field_1795530808515.jpg';
import scienceLab from '../../assets/images/science_lab_ghana_1795530806869.jpg';

export default function StudentLifePage() {
  useDocumentTitle('Student Life', 'Clubs, societies, athletics, cultural programmes, and student leadership at NAVS.');

  const pillars = [
    {
      title: 'Clubs & Academic Societies',
      desc: 'Debate & Writers’ Guild, Science & Robotics Innovation Club, Business & Entrepreneurship Society, and French Language Circle.',
    },
    {
      title: 'Sports & Athletics',
      desc: 'Inter-house track and field meets, football, basketball, volleyball, and physical wellness programmes on campus.',
    },
    {
      title: 'Student Leadership & Prefectship',
      desc: 'Structured Student Representative Council (SRC) and prefectship roles fostering responsibility, peer mentorship, and civic service.',
    },
    {
      title: 'Cultural Heritage & Arts',
      desc: 'Choir, traditional drumming and dance ensemble, drama productions, and annual cultural celebration assemblies.',
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Co-Curricular Formation"
        title="Student Life at NAVS"
        subtitle="Balancing academic rigour with character development, athletics, leadership, and community fellowship."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Student Life' }]}
        actions={
          <div className="flex items-center gap-3">
            <Link to="/events" className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-md hover:border-[#0C1E3C]">
              School Events
            </Link>
            <Link to="/gallery" className="px-4 py-2 text-sm font-semibold bg-[#0C1E3C] text-white rounded-md hover:bg-[#162B4D]">
              Campus Gallery
            </Link>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200">
            <SafeImage
              src={schoolathletics}
              alt="NAVS athletics track and sports complex"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200">
            <SafeImage
              src={scienceLab}
              alt="Students collaborating in the science laboratory"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((p, idx) => (
            <div key={p.title} className="bg-white border border-slate-200 rounded-lg p-7">
              <p className="text-xs font-semibold text-[#8D6419]">0{idx + 1}. Campus Pillar</p>
              <h2 className="mt-1.5 text-xl font-semibold text-[#0C1E3C]">{p.title}</h2>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
