import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calendar, FileCheck2, MapPin, Microscope, ShieldCheck } from 'lucide-react';
import { useSchool } from '../../context/SchoolContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { LoadingSkeleton, SafeImage } from '../../components/ui/Common.jsx';

export default function HomePage() {
  useDocumentTitle(
    'Home',
    'Official website and online admissions portal for NAVS Senior High School, Ghana.'
  );
  const { data, loading } = useSchool();
  const info = data?.schoolInfo || {};

 if (loading && !data) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <LoadingSkeleton rows={6} />
    </div>
  );
}

// Safely handle missing academic year data
const academicYears = Array.isArray(data?.academicYears)
  ? data.academicYears
  : [];

const currentYear =
  academicYears.find((y) => y.is_current) ??
  academicYears[0] ??
  null;

  return (
    <div>
      <section className="bg-[#0C1E3C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-widest uppercase text-[#D4A84B] mb-4">
                {info.school_name || 'NAVS Senior High School'} · Ghana
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.15]">
                {info.hero_headline || 'Disciplined Scholarship and Character for Ghana’s Future Leaders'}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
                {info.hero_subheadline ||
                  'A private senior high school in Ghana committed to academic rigour, moral integrity, and holistic student formation.'}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/admissions/apply"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#B48327] hover:bg-[#9B6E1D] text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Apply for Admission</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-5 py-3 border border-slate-400/50 hover:border-white text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  Learn More
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-72 sm:h-96 lg:h-full min-h-[340px] rounded-lg overflow-hidden border border-white/15">
                <SafeImage
                  src="/src/assets/images/hero_navs_campus_1795530807594.png"
                  alt="NAVS Senior High School main academic courtyard and campus buildings"
                  className="w-full h-full object-cover"
                  fallbackTitle="NAVS Senior High School Campus"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#08152B]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400 block text-xs">Active Intake</span>
              <span className="font-medium text-white">
                {currentYear ? currentYear.label : '2026/2027 Academic Year'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Admission Mode</span>
              <span className="font-medium text-white">Direct Private SHS Application</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Academic Tracks</span>
              <span className="font-medium text-white tabular-nums">
              {data?.programmes?.length ?? 0} SHS Programmes
              </span>
            </div>
            <div className="flex items-center sm:justify-end">
              <Link
                to="/admissions/track"
                className="inline-flex items-center gap-1.5 text-[#D4A84B] hover:text-white font-semibold transition-colors"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Track Application Status</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold tracking-wider text-[#8D6419] uppercase mb-2">
                Message from School Leadership
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#0C1E3C]">
                Welcome to {info.school_name || 'NAVS Senior High School'}
              </h2>
              <p className="mt-5 text-slate-700 leading-relaxed text-base whitespace-pre-line">
                {info.headmaster_message}
              </p>
              <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0C1E3C]">{info.headmaster_name}</p>
                  <p className="text-xs text-slate-500">{info.headmaster_title}</p>
                </div>
                <Link
                  to="/about"
                  className="text-sm font-semibold text-[#0C1E3C] hover:text-[#8D6419] inline-flex items-center gap-1.5"
                >
                  <span>Read Our Mission &amp; History</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#FAF9F6] border border-slate-200 rounded-lg p-7 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#0C1E3C]">Our Vision</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{info.vision}</p>
              </div>
              <div className="pt-5 border-t border-slate-200">
                <h3 className="text-base font-semibold text-[#0C1E3C]">Our Mission</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{info.mission}</p>
              </div>
              <div className="pt-5 border-t border-slate-200">
                <h3 className="text-base font-semibold text-[#0C1E3C]">Core Values</h3>
                <p className="mt-2 text-sm text-slate-700 font-medium">{info.core_values}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[#FAF9F6] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8D6419] uppercase mb-2">
                Academic Curriculum
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#0C1E3C]">
                Senior High School Programmes
              </h2>
            </div>
            <Link
              to="/academics"
              className="text-sm font-semibold text-[#0C1E3C] hover:text-[#8D6419] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Explore Full Curriculum</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {(Array.isArray(data?.programmes) ? data.programmes : []).map((prog) => (
    <div
      key={prog.id}
      className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between hover:border-[#0C1E3C]/40 transition-colors"
    >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                    <span>{prog.department_name}</span>
                    <span className="font-mono font-semibold text-[#8D6419]">{prog.code}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-[#0C1E3C]">{prog.name}</h3>
                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{prog.description}</p>
                  <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">Electives:</strong> {prog.elective_subjects}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-700">
                    {prog.is_accepting_applications ? 'Open for Intake' : 'Closed'}
                  </span>
                  <Link to="/admissions/apply" className="text-[#0C1E3C] hover:text-[#8D6419]">
                    Apply for Track &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold tracking-wider text-[#8D6419] uppercase mb-2">
              Campus Environment &amp; Student Life
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0C1E3C]">
              Facilities Designed for Focused Learning
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="border border-slate-200 rounded-lg overflow-hidden bg-[#FAF9F6]">
              <div className="aspect-[4/3] overflow-hidden">
                <SafeImage
                  src="/src/assets/images/science_lab_ghana_1795530806869.jpg"
                  alt="Students conducting practical experiments in the NAVS science laboratory"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8D6419] mb-1.5">
                  <Microscope className="w-4 h-4" />
                  <span>Science &amp; Practical Labs</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0C1E3C]">Equipped Science Laboratories</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Dedicated laboratory spaces supporting practical sessions in Chemistry, Biology, and Physics.
                </p>
              </div>
            </article>

            <article className="border border-slate-200 rounded-lg overflow-hidden bg-[#FAF9F6]">
              <div className="aspect-[4/3] overflow-hidden">
                <SafeImage
                  src="/src/assets/images/school_library_study_1795530807696.jpg"
                  alt="NAVS Senior High School library and quiet study hall"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8D6419] mb-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Academic Support</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0C1E3C]">Library &amp; Quiet Study Hall</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Quiet reading rooms stocked with senior high textbooks, reference collections, and exam preparation guides.
                </p>
              </div>
            </article>

            <article className="border border-slate-200 rounded-lg overflow-hidden bg-[#FAF9F6]">
              <div className="aspect-[4/3] overflow-hidden">
                <SafeImage
                  src="/src/assets/images/sports_athletics_field_1795530808515.jpg"
                  alt="NAVS athletics track and outdoor sports pitch"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8D6419] mb-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Co-Curricular Formation</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0C1E3C]">Athletics, Clubs &amp; Leadership</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Inter-house sports, debate societies, STEM clubs, and prefectship leadership opportunities.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[#FAF9F6] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold text-[#0C1E3C]">News &amp; Announcements</h2>
              <Link to="/news" className="text-sm font-semibold text-[#0C1E3C] hover:text-[#8D6419]">
                All News &rarr;
              </Link>
            </div>
           <div className="space-y-4">
  {(Array.isArray(data?.latestNews) ? data.latestNews : []).map((item) => (
    <article
      key={item.id}
      className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row gap-5"
    >
                  {item.image_url && (
                    <div className="sm:w-36 h-28 shrink-0 rounded-md overflow-hidden">
                      <SafeImage
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#8D6419]">{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{item.published_at.slice(0, 10)}</span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-semibold text-[#0C1E3C]">
                      <Link to={`/news/${item.slug}`} className="hover:underline">
                        {item.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{item.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold text-[#0C1E3C]">Upcoming Events</h2>
              <Link to="/events" className="text-sm font-semibold text-[#0C1E3C] hover:text-[#8D6419]">
                Full Calendar &rarr;
              </Link>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
              {(Array.isArray(data?.events) ? data.events : []).slice(0, 4).map((ev) => (
                <div key={ev.id} className="p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-[#8D6419]" />
                    <span>{ev.event_date.slice(0, 10)}</span>
                    {ev.end_time && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{ev.end_time}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold text-[#0C1E3C]">{ev.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{ev.location}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8D6419] uppercase mb-1">
                Campus Photo Archive
              </p>
              <h2 className="text-2xl font-semibold text-[#0C1E3C]">Life Across NAVS Campus</h2>
            </div>
            <Link to="/gallery" className="text-sm font-semibold text-[#0C1E3C] hover:text-[#8D6419]">
              View Gallery &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {(Array.isArray(data?.featuredGallery) ? data.featuredGallery : []).slice(0, 5).map((img) => (
              <Link
                key={img.id}
                to="/gallery"
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200"
              >
                <SafeImage
                  src={img.image_url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3">
                  <p className="text-xs font-medium text-white truncate">{img.title}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-14 bg-[#0C1E3C] rounded-lg p-8 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                Begin Your Online Admission Application
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-slate-200 leading-relaxed">
                Complete the digital admissions form, upload your supporting documents securely, and track your review status online.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/admissions/apply"
                className="px-6 py-3 bg-[#B48327] hover:bg-[#9B6E1D] text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
              >
                Start Application
              </Link>
              <Link
                to="/admissions/track"
                className="px-5 py-3 border border-slate-400/60 hover:border-white text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
              >
                Track Status
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
