import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PageHeader } from '../../components/ui/Common.jsx';

export default function PrivacyNoticePage() {
  useDocumentTitle('Privacy & Data Protection Notice', 'Applicant privacy, minor protection, and Ghana Data Protection Act 2012 (Act 843) safeguards.');

  return (
    <div>
      <PageHeader
        kicker="Data Protection & Safeguarding"
        title="Privacy & Applicant Data Protection Notice"
        subtitle="Designed with privacy-by-design safeguards aligned with Ghana’s Data Protection Act, 2012 (Act 843)."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Privacy Notice' }]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8 text-slate-700 leading-relaxed">
        <section className="bg-white border border-slate-200 rounded-lg p-7">
          <h2 className="text-xl font-semibold text-[#0C1E3C]">1. Purpose &amp; Data Minimization</h2>
          <p className="mt-2.5 text-sm">
            NAVS Senior High School collects only the personal, guardian, and academic information necessary to evaluate direct admission applications, communicate admission decisions, and register enrolled students.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-7">
          <h2 className="text-xl font-semibold text-[#0C1E3C]">2. Minor Applicants &amp; Parental / Guardian Consent</h2>
          <p className="mt-2.5 text-sm">
            Because applicants to senior high school are frequently under 18 years of age, applications require verifiable parent or legal guardian contact details and explicit guardian consent prior to submission.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-7">
          <h2 className="text-xl font-semibold text-[#0C1E3C]">3. Restricted Storage &amp; Access Controls</h2>
          <p className="mt-2.5 text-sm">
            Uploaded identity and academic documents (such as passport photographs, BECE result slips, and birth certificates) are stored outside public web directories and are accessible exclusively to authenticated, role-authorized school officials. Every document access and status decision is recorded in an administrative audit log.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-7">
          <h2 className="text-xl font-semibold text-[#0C1E3C]">4. Retention &amp; Governance Note</h2>
          <p className="mt-2.5 text-sm">
            Application records for unsuccessful or withdrawn candidates should be reviewed and purged according to the school’s approved retention schedule. Formal legal compliance with Act 843 remains subject to the school’s adopted institutional policies and registration with the Data Protection Commission of Ghana.
          </p>
        </section>
      </div>
    </div>
  );
}
