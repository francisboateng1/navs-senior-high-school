import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useSchool } from '../context/SchoolContext.jsx';

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data } = useSchool();
  const info = data?.schoolInfo || {};
  const schoolName = info.school_name || 'NAVS Senior High School';

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
      isActive
        ? 'text-[#0C1E3C] border-[#B48327]'
        : 'text-slate-600 border-transparent hover:text-[#0C1E3C] hover:border-slate-300'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-900">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#0C1E3C] whitespace-nowrap shrink-0"
          >
            NAVS Senior High
          </Link>

          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7">
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
            <NavLink to="/academics" className={navLinkClass}>
              Academics
            </NavLink>
            <NavLink to="/admissions" className={navLinkClass}>
              Admissions
            </NavLink>
            <NavLink to="/student-life" className={navLinkClass}>
              Student Life
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/admissions/apply"
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0C1E3C] hover:bg-[#162B4D] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Apply Now
            </Link>
            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1"
          >
            {[
              { to: '/', label: 'Home' },
              { to: '/about', label: 'About Us' },
              { to: '/academics', label: 'Academics' },
              { to: '/admissions', label: 'Admissions Centre' },
              { to: '/admissions/track', label: 'Track Application' },
              { to: '/student-life', label: 'Student Life' },
              { to: '/news', label: 'News & Announcements' },
              { to: '/events', label: 'Events Calendar' },
              { to: '/gallery', label: 'Photo Gallery' },
              { to: '/staff', label: 'Staff & Management' },
              { to: '/contact', label: 'Contact Us' },
              { to: '/admin/login', label: 'Administrator Portal' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0C1E3C] rounded-md"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#0C1E3C] text-slate-200 border-t border-[#162B4D] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <h2 className="font-serif text-xl font-bold text-white">{schoolName}</h2>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                {info.hero_subheadline ||
                  'Private senior high school in Ghana committed to academic discipline, character formation, and holistic secondary education.'}
              </p>
              <p className="mt-4 text-xs text-[#D4A84B]">
                {info.school_motto || 'NAVS Senior High School'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">School &amp; Community</h3>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us &amp; Leadership</Link></li>
                <li><Link to="/academics" className="hover:text-white transition-colors">Academic Programmes</Link></li>
                <li><Link to="/student-life" className="hover:text-white transition-colors">Student Life &amp; Clubs</Link></li>
                <li><Link to="/staff" className="hover:text-white transition-colors">Staff Directory</Link></li>
                <li><Link to="/news" className="hover:text-white transition-colors">News &amp; Announcements</Link></li>
                <li><Link to="/events" className="hover:text-white transition-colors">School Events</Link></li>
                <li><Link to="/gallery" className="hover:text-white transition-colors">Campus Gallery</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Admissions &amp; Portals</h3>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li><Link to="/admissions" className="hover:text-white transition-colors">Admissions Overview</Link></li>
                <li><Link to="/admissions/apply" className="hover:text-white transition-colors">Online Application Form</Link></li>
                <li><Link to="/admissions/track" className="hover:text-white transition-colors">Track Application Status</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy &amp; Data Protection (Act 843)</Link></li>
                <li><Link to="/admin/login" className="hover:text-white transition-colors">Staff &amp; Admin Portal</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Official Contact</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <p>{info.contact_address || '[Configure address in Admin Dashboard]'}</p>
                <p>{info.contact_phone_primary || '[Configure telephone in Admin Dashboard]'}</p>
                <p>{info.contact_email || '[Configure email in Admin Dashboard]'}</p>
                <p className="text-xs text-slate-400 pt-1">{info.office_hours || 'Monday – Friday, 8:00 AM – 4:00 PM'}</p>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-300">
                {info.social_facebook && (
                  <a href={info.social_facebook} target="_blank" rel="noreferrer" className="hover:text-white underline">
                    Facebook
                  </a>
                )}
                {info.social_instagram && (
                  <a href={info.social_instagram} target="_blank" rel="noreferrer" className="hover:text-white underline">
                    Instagram
                  </a>
                )}
                {info.social_youtube && (
                  <a href={info.social_youtube} target="_blank" rel="noreferrer" className="hover:text-white underline">
                    YouTube
                  </a>
                )}
                <Link to="/contact" className="text-[#D4A84B] hover:text-white underline">
                  Send Enquiry
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-[#162B4D] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} {schoolName}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-white">Data Protection Notice</Link>
              <a href="/sitemap.xml" className="hover:text-white">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
