import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { useSchool } from '../context/SchoolContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { ConfirmDialog, LoadingSkeleton, SafeImage } from '../components/ui/Common.jsx';

export default function AdminContentPage() {
  useDocumentTitle('Website Content Management', 'Edit school information, programmes, news, events, gallery, and staff.');
  const { refresh: refreshPublicSchool } = useSchool();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState('school');
  const [loading, setLoading] = useState(true);

  const [schoolItems, setSchoolItems] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [years, setYears] = useState([]);
  const [articles, setArticles] = useState([]);
  const [events, setEvents] = useState([]);
  const [galleryCats, setGalleryCats] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [staff, setStaff] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const [newsForm, setNewsForm] = useState({ title: '', category: 'Admissions', summary: '', content: '', image_url: '', is_published: true });
  const [eventForm, setEventForm] = useState({ title: '', category: 'Academic', event_date: '', end_time: '', location: '', description: '', image_url: '' });
  const [galleryForm, setGalleryForm] = useState({ category_id: '', title: '', caption: '', image_url: '', is_featured: false });
  const [staffForm, setStaffForm] = useState({ full_name: '', position: '', department: '', category: 'Academic', biography: '', photo_url: '', is_public: true });
  const [progForm, setProgForm] = useState({ code: '', name: '', department_name: '', description: '', core_subjects: 'English Language, Core Mathematics, Integrated Science, Social Studies', elective_subjects: '', career_pathways: '' });
  const [yearForm, setYearForm] = useState({ label: '', application_deadline: '', is_current: false });
  const [faqForm, setFaqForm] = useState({ category: 'Admissions', question: '', answer: '' });

  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [infoRes, progRes, yearRes, newsRes, evRes, galRes, staffRes, faqRes, enqRes] = await Promise.all([
        apiRequest('/api/admin/content/school-info'),
        apiRequest('/api/admin/content/programmes'),
        apiRequest('/api/admin/content/academic-years'),
        apiRequest('/api/admin/content/news'),
        apiRequest('/api/admin/content/events'),
        apiRequest('/api/admin/content/gallery'),
        apiRequest('/api/admin/content/staff'),
        apiRequest('/api/admin/content/faqs'),
        apiRequest('/api/admin/content/enquiries'),
      ]);
      setSchoolItems(infoRes.items);
      setProgrammes(progRes.programmes);
      setYears(yearRes.years);
      setArticles(newsRes.articles);
      setEvents(evRes.events);
      setGalleryCats(galRes.categories);
      setGalleryImages(galRes.images);
      if (galRes.categories[0]) {
        setGalleryForm((prev) => ({ ...prev, category_id: prev.category_id || String(galRes.categories[0].id) }));
      }
      setStaff(staffRes.staff);
      setFaqs(faqRes.faqs);
      setEnquiries(enqRes.enquiries);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load content.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleUploadImage = async (file) => {
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiRequest('/api/admin/content/upload-media', {
        method: 'POST',
        body: fd,
      });
      showToast('Image uploaded.', 'success');
      return res.url;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
      return null;
    }
  };

  const handleSaveSchoolInfo = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/school-info', {
        method: 'PUT',
        body: JSON.stringify({
          updates: schoolItems.map((i) => ({ setting_key: i.setting_key, setting_value: i.setting_value })),
        }),
      });
      await refreshPublicSchool();
      showToast('School information updated across public website.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save school info.', 'error');
    }
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/news', {
        method: 'POST',
        body: JSON.stringify(newsForm),
      });
      setNewsForm({ title: '', category: 'Admissions', summary: '', content: '', image_url: '', is_published: true });
      showToast('News article published.', 'success');
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to publish news.', 'error');
    }
  };

  const handleToggleNewsPublish = async (article) => {
    try {
      await apiRequest(`/api/admin/content/news/${article.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...article, is_published: !article.is_published }),
      });
      showToast('News status updated.', 'success');
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update news.', 'error');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/events', {
        method: 'POST',
        body: JSON.stringify({ ...eventForm, is_published: true }),
      });
      setEventForm({ title: '', category: 'Academic', event_date: '', end_time: '', location: '', description: '', image_url: '' });
      showToast('Event added to calendar.', 'success');
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create event.', 'error');
    }
  };

  const handleAddGallery = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/gallery', {
        method: 'POST',
        body: JSON.stringify(galleryForm),
      });
      setGalleryForm((prev) => ({ ...prev, title: '', caption: '', image_url: '', is_featured: false }));
      showToast('Gallery photo added.', 'success');
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add gallery photo.', 'error');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setStaffForm({ full_name: '', position: '', department: '', category: 'Academic', biography: '', photo_url: '', is_public: true });
      showToast('Staff profile added.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add staff profile.', 'error');
    }
  };

  const handleCreateProgramme = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/programmes', {
        method: 'POST',
        body: JSON.stringify({ ...progForm, is_accepting_applications: true }),
      });
      setProgForm({ code: '', name: '', department_name: '', description: '', core_subjects: 'English Language, Core Mathematics, Integrated Science, Social Studies', elective_subjects: '', career_pathways: '' });
      showToast('Academic programme added.', 'success');
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add programme.', 'error');
    }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/academic-years', {
        method: 'POST',
        body: JSON.stringify({ ...yearForm, admissions_open: true }),
      });
      setYearForm({ label: '', application_deadline: '', is_current: false });
      showToast('Academic year added.', 'success');
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add academic year.', 'error');
    }
  };

  const handleAddFaq = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/content/faqs', {
        method: 'POST',
        body: JSON.stringify({ ...faqForm, is_published: true }),
      });
      setFaqForm({ category: 'Admissions', question: '', answer: '' });
      showToast('FAQ added.', 'success');
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add FAQ.', 'error');
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiRequest(confirmDelete.endpoint, { method: 'DELETE' });
      showToast(`${confirmDelete.label} deleted.`, 'success');
      setConfirmDelete(null);
      await Promise.all([loadAll(), refreshPublicSchool()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    }
  };

  const tabs = [
    { key: 'school', label: 'School Info & Contact' },
    { key: 'programmes', label: 'Programmes & Years' },
    { key: 'news', label: 'News' },
    { key: 'events', label: 'Events' },
    { key: 'gallery', label: 'Gallery' },
    { key: 'staff', label: 'Staff' },
    { key: 'enquiries', label: 'Enquiries & FAQs' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0C1E3C]">Website Content Management</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Update public website text, academic tracks, announcements, events, photography, and staff directory directly in the database.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 p-1.5 rounded-lg">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-[#0C1E3C] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          {tab === 'school' && (
            <form onSubmit={handleSaveSchoolInfo} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-[#0C1E3C]">School Information, Leadership &amp; Contact Settings</h2>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md hover:bg-[#162B4D]"
                >
                  Save All Changes
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {schoolItems.map((item) => (
                  <div key={item.id} className={item.setting_value.length > 90 ? 'md:col-span-2' : ''}>
                    <label htmlFor={`cfg-${item.setting_key}`} className="block text-xs font-semibold text-slate-700 mb-1">
                      {item.label} <span className="font-normal text-slate-400">({item.category})</span>
                    </label>
                    {item.setting_value.length > 90 ? (
                      <textarea
                        id={`cfg-${item.setting_key}`}
                        rows={3}
                        value={item.setting_value}
                        onChange={(e) =>
                          setSchoolItems((prev) =>
                            prev.map((row) =>
                              row.setting_key === item.setting_key ? { ...row, setting_value: e.target.value } : row
                            )
                          )
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                    ) : (
                      <input
                        id={`cfg-${item.setting_key}`}
                        type="text"
                        value={item.setting_value}
                        onChange={(e) =>
                          setSchoolItems((prev) =>
                            prev.map((row) =>
                              row.setting_key === item.setting_key ? { ...row, setting_value: e.target.value } : row
                            )
                          )
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                    )}
                  </div>
                ))}
              </div>
            </form>
          )}

          {tab === 'programmes' && (
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#0C1E3C]">Academic Programmes</h2>
                <div className="divide-y divide-slate-200">
                  {programmes.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-[#0C1E3C]">
                          {p.name} <span className="font-mono text-xs text-slate-500">({p.code})</span>
                        </p>
                        <p className="text-xs text-slate-600">{p.elective_subjects}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiRequest(`/api/admin/content/programmes/${p.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ ...p, is_accepting_applications: !p.is_accepting_applications }),
                          });
                          await Promise.all([loadAll(), refreshPublicSchool()]);
                          showToast('Programme intake status toggled.', 'success');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:border-[#0C1E3C]"
                      >
                        {p.is_accepting_applications ? 'Open (Click to Close)' : 'Closed (Click to Open)'}
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCreateProgramme} className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input required placeholder="Code (e.g. AGR)" value={progForm.code} onChange={(e) => setProgForm({ ...progForm, code: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <input required placeholder="Programme Name" value={progForm.name} onChange={(e) => setProgForm({ ...progForm, name: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <input required placeholder="Department Name" value={progForm.department_name} onChange={(e) => setProgForm({ ...progForm, department_name: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <input required placeholder="Elective Subjects" value={progForm.elective_subjects} onChange={(e) => setProgForm({ ...progForm, elective_subjects: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <textarea required placeholder="Programme Description" rows={2} value={progForm.description} onChange={(e) => setProgForm({ ...progForm, description: e.target.value })} className="sm:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <div>
                    <button type="submit" className="px-4 py-2 bg-[#0C1E3C] text-white text-xs font-semibold rounded-md">
                      Add Programme
                    </button>
                  </div>
                </form>
              </div>

              {hasPermission('settings:manage') && (
                <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-[#0C1E3C]">Academic Years</h2>
                  <div className="divide-y divide-slate-200">
                    {years.map((y) => (
                      <div key={y.id} className="py-3 flex items-center justify-between text-sm">
                        <span>
                          <strong>{y.label}</strong> {y.is_current ? '· Current' : ''} {y.application_deadline ? `· Deadline ${y.application_deadline}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiRequest(`/api/admin/content/academic-years/${y.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ ...y, admissions_open: !y.admissions_open }),
                            });
                            await Promise.all([loadAll(), refreshPublicSchool()]);
                          }}
                          className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded"
                        >
                          {y.admissions_open ? 'Admissions Open' : 'Closed'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleCreateYear} className="flex flex-wrap gap-3 pt-3 border-t border-slate-200">
                    <input required placeholder="e.g. 2028/2029 Academic Year" value={yearForm.label} onChange={(e) => setYearForm({ ...yearForm, label: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                    <input type="date" value={yearForm.application_deadline} onChange={(e) => setYearForm({ ...yearForm, application_deadline: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                    <button type="submit" className="px-4 py-2 bg-[#0C1E3C] text-white text-xs font-semibold rounded-md">Add Academic Year</button>
                  </form>
                </div>
              )}
            </div>
          )}

          {tab === 'news' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleCreateNews} className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4 h-fit">
                <h2 className="text-lg font-semibold text-[#0C1E3C]">Publish News Article</h2>
                <input required placeholder="Headline Title" value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <select value={newsForm.category} onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
                  <option value="Admissions">Admissions</option>
                  <option value="Academics">Academics</option>
                  <option value="PTA Information">PTA Information</option>
                  <option value="Examinations">Examinations</option>
                  <option value="Ceremonies">Ceremonies</option>
                  <option value="Achievements">Achievements</option>
                </select>
                <input required placeholder="Short Summary" value={newsForm.summary} onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <textarea required rows={5} placeholder="Full article content..." value={newsForm.content} onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-md cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{newsForm.image_url ? 'Image Uploaded' : 'Upload Cover Image'}</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const url = await handleUploadImage(f);
                        if (url) setNewsForm((p) => ({ ...p, image_url: url }));
                      }
                    }} />
                  </label>
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md hover:bg-[#162B4D]">
                  Publish Article
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                {articles.map((a) => (
                  <div key={a.id} className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#8D6419]">{a.category} · {a.published_at.slice(0, 10)}</p>
                      <h3 className="font-semibold text-[#0C1E3C] mt-0.5">{a.title}</h3>
                      <p className="text-xs text-slate-600 mt-1">{a.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => handleToggleNewsPublish(a)} className="px-2.5 py-1 text-xs border border-slate-300 rounded">
                        {a.is_published ? 'Published' : 'Draft'}
                      </button>
                      <button type="button" aria-label={`Delete ${a.title}`} onClick={() => setConfirmDelete({ label: a.title, endpoint: `/api/admin/content/news/${a.id}` })} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleCreateEvent} className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4 h-fit">
                <h2 className="text-lg font-semibold text-[#0C1E3C]">Add School Event</h2>
                <input required placeholder="Event Title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <div className="grid grid-cols-2 gap-3">
                  <input required type="date" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <input placeholder="Time (e.g. 09:00 GMT)" value={eventForm.end_time} onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} className="px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <input required placeholder="Location / Venue" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <textarea required rows={3} placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <button type="submit" className="w-full py-2.5 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md">
                  Save Event
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                {events.map((ev) => (
                  <div key={ev.id} className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#8D6419]">{ev.category} · {ev.event_date.slice(0, 10)}</p>
                      <h3 className="font-semibold text-[#0C1E3C]">{ev.title}</h3>
                      <p className="text-xs text-slate-500">{ev.location}</p>
                    </div>
                    <button type="button" aria-label={`Delete ${ev.title}`} onClick={() => setConfirmDelete({ label: ev.title, endpoint: `/api/admin/content/events/${ev.id}` })} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'gallery' && (
            <div className="space-y-6">
              <form onSubmit={handleAddGallery} className="bg-white border border-slate-200 rounded-lg p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select value={galleryForm.category_id} onChange={(e) => setGalleryForm({ ...galleryForm, category_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
                    {galleryCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                  <input required value={galleryForm.title} onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Image File *</label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-md cursor-pointer bg-[#FAF9F6]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{galleryForm.image_url ? 'Uploaded Ready' : 'Upload Photo'}</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const url = await handleUploadImage(f);
                        if (url) setGalleryForm((p) => ({ ...p, image_url: url }));
                      }
                    }} />
                  </label>
                </div>
                <div className="md:col-span-3">
                  <button type="submit" disabled={!galleryForm.image_url} className="w-full py-2 bg-[#0C1E3C] disabled:opacity-50 text-white text-sm font-semibold rounded-md">
                    Add to Gallery
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {galleryImages.map((img) => (
                  <div key={img.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="aspect-[4/3]">
                      <SafeImage src={img.image_url} alt={img.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-[#8D6419] font-semibold">{img.category_name}</p>
                        <p className="text-sm font-medium text-[#0C1E3C] truncate">{img.title}</p>
                      </div>
                      <button type="button" aria-label={`Delete ${img.title}`} onClick={() => setConfirmDelete({ label: img.title, endpoint: `/api/admin/content/gallery/${img.id}` })} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleAddStaff} className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4 h-fit">
                <h2 className="text-lg font-semibold text-[#0C1E3C]">Add Staff Profile</h2>
                <input required placeholder="Full Name" value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <input required placeholder="Position / Title" value={staffForm.position} onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <input required placeholder="Department" value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <textarea required rows={3} placeholder="Approved public biography..." value={staffForm.biography} onChange={(e) => setStaffForm({ ...staffForm, biography: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                <button type="submit" className="w-full py-2.5 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md">
                  Save Staff Member
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                {staff.map((m) => (
                  <div key={m.id} className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#8D6419]">{m.department}</p>
                      <h3 className="font-semibold text-[#0C1E3C]">{m.full_name}</h3>
                      <p className="text-xs text-slate-600">{m.position}</p>
                    </div>
                    <button type="button" aria-label={`Delete ${m.full_name}`} onClick={() => setConfirmDelete({ label: m.full_name, endpoint: `/api/admin/content/staff/${m.id}` })} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'enquiries' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#0C1E3C]">Public Contact Enquiries</h2>
                <div className="divide-y divide-slate-200">
                  {enquiries.length === 0 ? (
                    <p className="text-sm text-slate-500">No contact enquiries submitted yet.</p>
                  ) : (
                    enquiries.map((eq) => (
                      <div key={eq.id} className="py-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#0C1E3C]">{eq.subject}</span>
                          <span className="text-xs font-semibold text-[#8D6419]">{eq.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {eq.sender_name} · {eq.sender_email} · {eq.created_at}
                        </p>
                        <p className="mt-2 text-slate-700">{eq.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4 h-fit">
                <h2 className="text-lg font-semibold text-[#0C1E3C]">Manage FAQs</h2>
                <form onSubmit={handleAddFaq} className="space-y-3">
                  <input required placeholder="Question" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <textarea required rows={3} placeholder="Answer" value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <button type="submit" className="px-4 py-2 bg-[#0C1E3C] text-white text-xs font-semibold rounded-md">Add FAQ</button>
                </form>
                <div className="divide-y divide-slate-200 pt-2">
                  {faqs.map((f) => (
                    <div key={f.id} className="py-3 flex items-start justify-between gap-2 text-xs">
                      <div>
                        <p className="font-semibold text-[#0C1E3C]">{f.question}</p>
                        <p className="text-slate-600 mt-0.5">{f.answer}</p>
                      </div>
                      <button type="button" aria-label="Delete FAQ" onClick={() => setConfirmDelete({ label: 'FAQ', endpoint: `/api/admin/content/faqs/${f.id}` })} className="p-1 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently remove "${confirmDelete?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
