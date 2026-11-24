import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2, FileUp, ShieldCheck, Printer, ArrowRight } from 'lucide-react';
import { useSchool } from '../context/SchoolContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { apiRequest } from '../services/api.js';
import { PageHeader } from '../components/ui/Common.jsx';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function ApplyPage() {
  useDocumentTitle('Online Admission Application', 'Apply online to NAVS Senior High School and receive your unique reference number.');
  const { data } = useSchool();
  const { showToast } = useToast();

  const openYears = data?.academicYears.filter((y) => y.admissions_open) || [];
  const openProgrammes = data?.programmes.filter((p) => p.is_accepting_applications) || [];
  const docRequirements = data?.requirements.filter((r) => r.document_key) || [];

  const [files, setFiles] = useState({
    passport_photo: null,
    academic_record: null,
    birth_certificate: null,
    supporting_document: null,
  });
  const [fileError, setFileError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      nationality: 'Ghanaian',
      admissionCategory: 'Direct School Admission',
      boardingPreference: 'Day',
      academicYearId: openYears[0] ? String(openYears[0].id) : '',
      programmeId: openProgrammes[0] ? String(openProgrammes[0].id) : '',
    },
  });

  useEffect(() => {
    if (openYears[0]) setValue('academicYearId', String(openYears[0].id));
    if (openProgrammes[0]) setValue('programmeId', String(openProgrammes[0].id));
  }, [data, setValue]);

  const handleFileChange = (key, file) => {
    setFileError(null);
    if (!file) {
      setFiles((prev) => ({ ...prev, [key]: null }));
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError(`"${file.name}" must be a PDF, JPG, or PNG file.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`"${file.name}" exceeds the 5 MB limit.`);
      return;
    }
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const onSubmit = async (values) => {
    setServerError(null);
    setFileError(null);

    for (const req of docRequirements) {
      if (req.is_mandatory_document && req.document_key && !files[req.document_key]) {
        const msg = `Please upload the required document: ${req.title}.`;
        setFileError(msg);
        showToast(msg, 'error');
        return;
      }
    }

    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      formData.append(k, String(v ?? ''));
    });

    Object.entries(files).forEach(([k, file]) => {
      if (file) formData.append(k, file);
    });

    try {
      const result = await apiRequest('/api/admissions/apply', {
        method: 'POST',
        body: formData,
      });
      setReceipt(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Application submitted! Reference: ${result.referenceNumber}`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to submit application.';
      setServerError(msg);
      showToast(msg, 'error');
    }
  };

  if (receipt) {
    return (
      <div>
        <PageHeader
          kicker="Application Submitted"
          title="Admission Application Confirmation"
          subtitle="Please keep your Application Reference Number and Verification Code safe for status tracking."
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Admissions', to: '/admissions' }, { label: 'Confirmation' }]}
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 space-y-6">
            <div className="flex items-start gap-3 text-emerald-800">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold text-[#0C1E3C]">Application Received Successfully</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Submitted on <span className="tabular-nums">{receipt.submittedAt}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F6] border border-slate-200 rounded-lg p-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Application Reference Number</p>
                <p className="mt-1 text-xl font-mono font-bold text-[#0C1E3C] tabular-nums" data-testid="application-reference">
                  {receipt.referenceNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Tracking Verification Code</p>
                <p className="mt-1 text-xl font-mono font-bold text-[#8D6419] tabular-nums" data-testid="verification-code">
                  {receipt.verificationCode}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Applicant Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{receipt.applicantName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Programme &amp; Intake</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {receipt.programmeName} · {receipt.academicYearLabel}
                </p>
              </div>
            </div>

            {receipt.notificationStatus === 'pending_configuration' && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                Note: Automated email delivery is awaiting SMTP configuration by the school administrator; your application is safely stored in our registry. Save your reference number and verification code above.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2 no-print">
              <Link
                to={`/admissions/track?ref=${encodeURIComponent(receipt.referenceNumber)}&code=${encodeURIComponent(receipt.verificationCode)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C1E3C] hover:bg-[#162B4D] text-white text-sm font-semibold rounded-md"
              >
                <span>Track Application Status</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:border-[#0C1E3C]"
              >
                <Printer className="w-4 h-4" />
                <span>Print Confirmation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Direct School Admission Form"
        title="Online Admission Application"
        subtitle="Complete all required sections carefully. Applications for minors require parent or guardian details and consent."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admissions', to: '/admissions' },
          { label: 'Apply Online' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {serverError && (
          <div role="alert" className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
          <fieldset className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5">
            <legend className="text-lg font-serif font-semibold text-[#0C1E3C] px-1">
              1. Applicant Personal Information
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Applicant Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  {...register('fullName', { required: 'Applicant full name is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Date of Birth *
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth', { required: 'Date of birth is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth.message}</p>}
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Gender
                </label>
                <select
                  id="gender"
                  {...register('gender')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                >
                  <option value="">Prefer not to specify / Select</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nationality *
                </label>
                <input
                  id="nationality"
                  type="text"
                  {...register('nationality', { required: 'Nationality is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.nationality && <p className="mt-1 text-xs text-red-600">{errors.nationality.message}</p>}
              </div>

              <div>
                <label htmlFor="residentialLocation" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Residential Location (City / Suburb) *
                </label>
                <input
                  id="residentialLocation"
                  type="text"
                  {...register('residentialLocation', { required: 'Residential location is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.residentialLocation && (
                  <p className="mt-1 text-xs text-red-600">{errors.residentialLocation.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="applicantEmail" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Applicant Email (Optional)
                </label>
                <input
                  id="applicantEmail"
                  type="email"
                  {...register('applicantEmail')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
              </div>

              <div>
                <label htmlFor="applicantPhone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Applicant Phone (Optional)
                </label>
                <input
                  id="applicantPhone"
                  type="tel"
                  {...register('applicantPhone')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5">
            <legend className="text-lg font-serif font-semibold text-[#0C1E3C] px-1">
              2. Parent or Legal Guardian Information
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="guardianFullName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Parent / Guardian Full Name *
                </label>
                <input
                  id="guardianFullName"
                  type="text"
                  {...register('guardianFullName', { required: 'Guardian full name is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.guardianFullName && (
                  <p className="mt-1 text-xs text-red-600">{errors.guardianFullName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="guardianRelationship" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Relationship to Applicant *
                </label>
                <select
                  id="guardianRelationship"
                  {...register('guardianRelationship', { required: 'Relationship is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Sponsor">Sponsor / Relative</option>
                </select>
              </div>

              <div>
                <label htmlFor="guardianTelephone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Guardian Telephone Number *
                </label>
                <input
                  id="guardianTelephone"
                  type="tel"
                  {...register('guardianTelephone', { required: 'Guardian telephone is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.guardianTelephone && (
                  <p className="mt-1 text-xs text-red-600">{errors.guardianTelephone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="guardianEmail" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Guardian Email Address *
                </label>
                <input
                  id="guardianEmail"
                  type="email"
                  {...register('guardianEmail', {
                    required: 'Guardian email is required for tracking and notifications.',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' },
                  })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.guardianEmail && <p className="mt-1 text-xs text-red-600">{errors.guardianEmail.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="guardianAddress" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Guardian Residential / Postal Address *
                </label>
                <input
                  id="guardianAddress"
                  type="text"
                  {...register('guardianAddress', { required: 'Guardian address is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.guardianAddress && (
                  <p className="mt-1 text-xs text-red-600">{errors.guardianAddress.message}</p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5">
            <legend className="text-lg font-serif font-semibold text-[#0C1E3C] px-1">
              3. Academic Background &amp; Programme Choice
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label htmlFor="previousSchool" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Previous School (JHS / Transfer School) *
                </label>
                <input
                  id="previousSchool"
                  type="text"
                  {...register('previousSchool', { required: 'Previous school name is required.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
                {errors.previousSchool && <p className="mt-1 text-xs text-red-600">{errors.previousSchool.message}</p>}
              </div>

              <div>
                <label htmlFor="beceIndexNumber" className="block text-sm font-medium text-slate-700 mb-1.5">
                  BECE Index Number (If Applicable)
                </label>
                <input
                  id="beceIndexNumber"
                  type="text"
                  {...register('beceIndexNumber')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
              </div>

              <div>
                <label htmlFor="examYear" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Examination Year (If Applicable)
                </label>
                <input
                  id="examYear"
                  type="text"
                  placeholder="e.g. 2026"
                  {...register('examYear')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="previousExamDetails" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Previous Examination Summary / Aggregate (Optional)
                </label>
                <input
                  id="previousExamDetails"
                  type="text"
                  placeholder="e.g. BECE Aggregate or JHS Terminal Average"
                  {...register('previousExamDetails')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
              </div>

              <div>
                <label htmlFor="academicYearId" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Academic Year *
                </label>
                <select
                  id="academicYearId"
                  {...register('academicYearId', { required: 'Please select an academic year.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                >
                  {openYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="admissionCategory" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Admission Category *
                </label>
                <select
                  id="admissionCategory"
                  {...register('admissionCategory')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                >
                  <option value="Direct School Admission">Direct School Admission (SHS 1)</option>
                  <option value="Transfer Student">Transfer Student (SHS 2)</option>
                  <option value="International Applicant">International Applicant</option>
                </select>
              </div>

              <div>
                <label htmlFor="programmeId" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Preferred Programme (1st Choice) *
                </label>
                <select
                  id="programmeId"
                  {...register('programmeId', { required: 'Please select a programme.' })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                >
                  {openProgrammes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="secondChoiceProgrammeId" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Alternative Programme (Optional)
                </label>
                <select
                  id="secondChoiceProgrammeId"
                  {...register('secondChoiceProgrammeId')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                >
                  <option value="">None</option>
                  {openProgrammes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="boardingPreference" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Residency Preference *
                </label>
                <select
                  id="boardingPreference"
                  {...register('boardingPreference')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                >
                  <option value="Day">Day Student</option>
                  <option value="Boarding">Boarding Student</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="additionalNotes" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Additional Information (Medical/Learning Support or Comments)
                </label>
                <textarea
                  id="additionalNotes"
                  rows={3}
                  {...register('additionalNotes')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5">
            <legend className="text-lg font-serif font-semibold text-[#0C1E3C] px-1">
              4. Supporting Document Uploads
            </legend>
            <p className="text-xs text-slate-600">
              Accepted formats: PDF, JPG, or PNG (maximum 5 MB per file). Uploaded records are stored in restricted non-public storage.
            </p>
            {fileError && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                {fileError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {docRequirements.map((req) => {
                const key = req.document_key;
                const selectedFile = files[key];
                return (
                  <div key={req.id} className="border border-slate-200 rounded-md p-4 bg-[#FAF9F6]">
                    <label htmlFor={`doc-${key}`} className="block text-sm font-semibold text-[#0C1E3C]">
                      {req.title} {req.is_mandatory_document ? '*' : '(Optional)'}
                    </label>
                    <p className="mt-1 text-xs text-slate-600 mb-3">{req.description}</p>
                    <label
                      htmlFor={`doc-${key}`}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-md cursor-pointer hover:border-[#0C1E3C]"
                    >
                      <FileUp className="w-3.5 h-3.5 text-[#8D6419]" />
                      <span>{selectedFile ? selectedFile.name : 'Choose File'}</span>
                    </label>
                    <input
                      id={`doc-${key}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#8D6419] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-[#0C1E3C] text-sm">
                  Parent / Guardian Consent &amp; Data Protection (Act 843)
                </p>
                <p className="mt-1">
                  By submitting this form, the parent or legal guardian confirms that the information provided is accurate and consents to NAVS Senior High School processing the applicant’s personal and academic records solely for admission assessment.{' '}
                  <Link to="/privacy" className="underline text-[#0C1E3C] font-medium">
                    Read Privacy Notice
                  </Link>
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('consentAccepted', {
                  required: 'Parent or guardian consent is required before submission.',
                })}
                className="mt-1 w-4 h-4 accent-[#0C1E3C]"
              />
              <span className="text-sm text-slate-800">
                I confirm that I am the parent, legal guardian, or authorized applicant with guardian permission, and I consent to the processing of this admission application. *
              </span>
            </label>
            {errors.consentAccepted && (
              <p className="text-xs text-red-600">{errors.consentAccepted.message}</p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-3 bg-[#0C1E3C] hover:bg-[#162B4D] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors"
              >
                {isSubmitting ? 'Submitting Application...' : 'Submit Admission Application'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
