import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy & Terms — COMMUNITREE & EZONE',
  description:
    'How COMMUNITREE & EZONE collect, use, store, and delete your personal data, your rights under India’s Digital Personal Data Protection Act, 2023, and how to reach our Grievance Officer.',
};

// Single source of truth for the grievance / data-protection contact.
const GRIEVANCE = {
  name: 'Shashank',
  role: 'Grievance Officer',
  email: 'support@communitree.co.in',
  address: '63, 2nd Main Rd, VGP Layout, Palavakkam, Chennai, Tamil Nadu 600041',
};

const LAST_UPDATED = '2 June 2026';
const RETENTION_MONTHS = 3;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-montserrat font-bold text-2xl text-ink mt-12 mb-4">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-[color:var(--muted)]">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <main className="flex-1 container-page py-16 max-w-3xl">
        <p className="font-ibm-mono text-xs uppercase tracking-widest text-leaf mb-3">Legal</p>
        <h1 className="font-montserrat font-black text-4xl text-ink mb-3">Privacy Policy &amp; Terms</h1>
        <p className="text-[color:var(--muted)]">
          Last updated: {LAST_UPDATED}. This policy explains, in plain language, what personal data we
          collect when you take a pledge, attempt a quiz, request a certificate, contact us, or subscribe
          to our newsletter — and the choices and rights you have over that data.
        </p>

        <Section id="who-we-are" title="1. Who we are">
          <p>
            This platform is jointly operated by <strong>COMMUNITREE</strong> and{' '}
            <strong>EZONE</strong> together (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the platform&rdquo;). For
            the purposes of India&rsquo;s Digital Personal Data Protection Act, 2023 (&ldquo;DPDP
            Act&rdquo;), we are the <strong>Data Fiduciary</strong> that decides how and why your personal
            data is processed. You can reach us at{' '}
            <a className="text-forest underline" href={`mailto:${GRIEVANCE.email}`}>
              {GRIEVANCE.email}
            </a>
            .
          </p>
        </Section>

        <Section id="what-we-collect" title="2. What data we collect">
          <p>We only collect what we need to run a pledge, quiz, or certificate. Specifically:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Your name</strong> — printed on your pledge or quiz certificate.
            </li>
            <li>
              <strong>Email address</strong> — to send your certificate and, where you opt in, news about
              future initiatives.
            </li>
            <li>
              <strong>WhatsApp / phone number</strong> — to share your certificate and event updates.
            </li>
            <li>
              <strong>Your photo</strong> (optional) — only if you choose to add one to personalise your
              certificate. It is processed in your browser to build the certificate image.
            </li>
            <li>
              <strong>Quiz answers and score</strong> — to generate your result and certificate.
            </li>
            <li>
              <strong>Organisation enquiry details</strong> — if you partner with us (organisation name,
              contact name, email, phone, and message).
            </li>
            <li>
              <strong>Newsletter email</strong> — if you subscribe through our footer.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> ask for, or knowingly collect, any sensitive identifiers such as
            government ID numbers, financial details, health, caste, or religious data.
          </p>
        </Section>

        <Section id="why-we-collect" title="3. Why we collect it and your consent">
          <p>
            We process your data only for the specific purpose you give it to us — generating your
            certificate, recording your pledge or quiz participation, responding to your enquiry, or (only
            where you separately opt in) sending you updates about similar initiatives.
          </p>
          <p>
            Before you submit a pledge or quiz, you are asked to tick a box confirming you have read and
            agree to this Privacy Policy. That tick is your <strong>consent</strong> under Section 6 of the
            DPDP Act. You are never pre-opted-in; you must actively tick the box yourself, and you may
            withdraw consent at any time (see <a className="text-forest underline" href="#your-rights">Your rights</a>).
            Marketing/newsletter consent is always a separate, optional choice — declining it never blocks
            you from getting your certificate.
          </p>
        </Section>

        <Section id="children" title="4. Children's data (under 18)">
          <p>
            Many of our pledges and quizzes run in schools, so we take children&rsquo;s data seriously.
            Under Section 9 of the DPDP Act, the personal data of a child (anyone under 18 years of age) may
            only be processed with the <strong>verifiable consent of a parent or lawful guardian</strong>.
          </p>
          <p>By submitting a pledge or quiz on behalf of, or as, a person under 18, you confirm that:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>you are the parent, legal guardian, or an authorised teacher/school representative, and</li>
            <li>
              you have the consent of the child&rsquo;s parent or guardian to provide that child&rsquo;s
              name, photo, and other details for the purpose of issuing a certificate.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> use a child&rsquo;s data for behavioural tracking, advertising, or
            any profiling. We do not knowingly send marketing messages to children. If you believe a
            child&rsquo;s data has been submitted without proper consent, contact our Grievance Officer below
            and we will delete it promptly.
          </p>
        </Section>

        <Section id="uploads" title="Photos and uploads">
          <p>
            You may only upload a photo or other content that you own or have permission to use. Do not
            upload anything infringing, unlawful, or showing another person without their consent. To
            report content, see our{' '}
            <a className="text-forest underline" href="/takedown">Report content / Takedown</a> page.
          </p>
        </Section>

        <Section id="retention" title="5. How long we keep it — automatic deletion every 3 months">
          <p>
            We practise data minimisation. <strong>We do not keep your personal data indefinitely.</strong>{' '}
            Personal data submitted through pledges, quizzes, certificate requests, and organisation
            enquiries is <strong>automatically and permanently deleted {RETENTION_MONTHS} months
            (90 days) after it is submitted.</strong> This runs on an automated schedule — no manual step is
            required, and once deleted the data cannot be recovered.
          </p>
          <p>
            The only exception is the <strong>newsletter</strong>: if you actively subscribe, we keep your
            email for as long as you remain subscribed, because that is an ongoing service you asked for. You
            can unsubscribe at any time, after which it is removed.
          </p>
          <p>
            Your photo is used to build your certificate and is not stored beyond what is needed to generate
            and deliver that certificate.
          </p>
        </Section>

        <Section id="sharing" title="6. Who we share it with">
          <p>
            We do not sell your personal data. We share it only with service providers who help us run the
            platform (for example, our hosting and database providers) under confidentiality obligations,
            and only as needed to deliver the service to you. Where you take a pledge or quiz hosted by a
            partner organisation (such as your school or company), your participation may be shared with that
            organisation so they can recognise your involvement.
          </p>
        </Section>

        <Section id="security" title="7. How we protect it">
          <p>
            We apply reasonable technical and organisational safeguards, including access controls on our
            admin tools and encrypted connections, to protect your data against unauthorised access, loss, or
            misuse. No system is perfectly secure, but the short {RETENTION_MONTHS}-month retention window
            limits how much data ever exists at any time.
          </p>
        </Section>

        <Section id="your-rights" title="8. Your rights — access, correction, deletion">
          <p>Under the DPDP Act you have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access</strong> a summary of the personal data we hold about you;</li>
            <li><strong>Correct or update</strong> inaccurate or incomplete data;</li>
            <li><strong>Erase</strong> your data before the automatic 3-month deletion;</li>
            <li><strong>Withdraw consent</strong> at any time, including unsubscribing from updates;</li>
            <li><strong>Grievance redressal</strong> — raise a complaint about how we handle your data.</li>
          </ul>
          <p>
            To <strong>update or delete your data</strong>, simply email us at{' '}
            <a className="text-forest underline" href={`mailto:${GRIEVANCE.email}`}>
              {GRIEVANCE.email}
            </a>{' '}
            with the request and the name/email you used. We will action verified requests within a
            reasonable period and confirm once done.
          </p>
        </Section>

        <Section id="grievance" title="9. Grievance Officer">
          <p>
            In line with Section 13 of the DPDP Act, we have appointed a Grievance Officer you can contact
            with any question, concern, or complaint about your personal data:
          </p>
          <div className="rounded-2xl border border-[color:var(--line)] bg-cream-soft p-6 not-italic">
            <p className="font-semibold text-ink">{GRIEVANCE.name}</p>
            <p className="text-sm">{GRIEVANCE.role}, COMMUNITREE</p>
            <p className="mt-2 text-sm">
              Email:{' '}
              <a className="text-forest underline" href={`mailto:${GRIEVANCE.email}`}>
                {GRIEVANCE.email}
              </a>
            </p>
            <p className="text-sm">Address: {GRIEVANCE.address}</p>
          </div>
          <p>
            If you are not satisfied with our response, you have the right to complain to the Data Protection
            Board of India.
          </p>
        </Section>

        <Section id="changes" title="10. Changes to this policy">
          <p>
            We may update this policy as our platform or the law evolves. The &ldquo;Last updated&rdquo; date
            at the top reflects the latest version. Material changes will be highlighted on this page.
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
