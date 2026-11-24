import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, MapPin, Phone, Clock, CheckCircle2 } from 'lucide-react';
import { useSchool } from '../../context/SchoolContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { apiRequest } from '../../services/api.js';
import { PageHeader } from '../../components/ui/Common.jsx';

export default function ContactPage() {
  useDocumentTitle('Contact Us', 'Official contact details, admissions office hours, and enquiry form for NAVS Senior High School.');
  const { data } = useSchool();
  const { showToast } = useToast();
  const info = data?.schoolInfo || {};
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      await apiRequest('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSubmitted(true);
      reset();
      showToast('Your enquiry has been submitted to the school office.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send enquiry.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Admissions & General Registry"
        title="Contact NAVS Senior High School"
        subtitle="Reach our admissions desk or school administration for enquiries, campus visits, and prospectus requests."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-7 space-y-5">
            <h2 className="text-xl font-semibold text-[#0C1E3C]">Official School Channels</h2>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#8D6419] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Campus Address</p>
                <p className="text-sm text-slate-800 mt-0.5">{info.contact_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#8D6419] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Telephone &amp; WhatsApp</p>
                <p className="text-sm text-slate-800 mt-0.5">{info.contact_phone_primary}</p>
                {info.contact_phone_secondary && (
                  <p className="text-sm text-slate-600">{info.contact_phone_secondary}</p>
                )}
                {info.contact_whatsapp && (
                  <p className="text-xs text-slate-600 mt-1">WhatsApp: {info.contact_whatsapp}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#8D6419] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Official Email</p>
                <p className="text-sm text-slate-800 mt-0.5">{info.contact_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#8D6419] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Office Hours</p>
                <p className="text-sm text-slate-800 mt-0.5">{info.office_hours}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-base font-semibold text-[#0C1E3C]">Location Map</h3>
            <p className="mt-1 text-xs text-slate-500">
              Configured Location Query: {info.maps_embed_query || 'Accra, Ghana'}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.maps_embed_query || 'Accra, Ghana')}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-[#0C1E3C] underline hover:text-[#8D6419]"
            >
              Open Campus Location in Google Maps &rarr;
            </a>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-7 sm:p-9">
          <h2 className="text-2xl font-semibold text-[#0C1E3C]">Send an Enquiry</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Messages sent through this form are recorded directly for the School Office and Admissions Desk.
          </p>

          {submitted && (
            <div className="mt-5 p-4 rounded-md bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Enquiry Received</p>
                <p className="mt-0.5">Thank you for contacting NAVS Senior High School. Our office will review your message shortly.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="senderName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="senderName"
                  type="text"
                  {...register('senderName', { required: 'Please enter your full name.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.senderName && <p className="mt-1 text-xs text-red-600">{errors.senderName.message}</p>}
              </div>

              <div>
                <label htmlFor="senderEmail" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address *
                </label>
                <input
                  id="senderEmail"
                  type="email"
                  {...register('senderEmail', {
                    required: 'Please enter your email address.',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' },
                  })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.senderEmail && <p className="mt-1 text-xs text-red-600">{errors.senderEmail.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="senderPhone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telephone Number
                </label>
                <input
                  id="senderPhone"
                  type="tel"
                  {...register('senderPhone')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Subject *
                </label>
                <input
                  id="subject"
                  type="text"
                  {...register('subject', { required: 'Please enter a subject.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1.5">
                Message *
              </label>
              <textarea
                id="message"
                rows={5}
                {...register('message', {
                  required: 'Please enter your message.',
                  minLength: { value: 10, message: 'Message must be at least 10 characters.' },
                })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
              />
              {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#0C1E3C] hover:bg-[#162B4D] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
