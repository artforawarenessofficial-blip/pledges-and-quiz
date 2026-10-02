import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Report Content / Takedown — COMMUNITREE & EZONE',
  description:
    'How to report a photo, image or other user-submitted content that infringes your rights or is unlawful, and how fast we act.',
};

// Same grievance contact as the privacy page.
const GRIEVANCE_EMAIL = 'support@communitree.co.in';

export default function TakedownPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <main className="flex-1 container-page py-16 max-w-3xl">
        <p className="font-ibm-mono text-xs uppercase tracking-widest text-leaf mb-3">Legal</p>
        <h1 className="font-montserrat font-black text-4xl text-ink mb-3">Report Content / Takedown</h1>
        <div className="space-y-4 text-[15px] leading-relaxed text-[color:var(--muted)]">
          <p>
            People upload photos and names to create pledge posters and certificates on this platform. Users
            must only upload content they own or have permission to use, and must not upload anything
            infringing, unlawful, or showing another person without their consent. If you think something on
            this platform breaks that rule, tell us and we will act.
          </p>

          <h2 className="font-montserrat font-bold text-2xl text-ink pt-6">How to report</h2>
          <p>
            Email our Grievance Officer at{' '}
            <a className="text-forest underline" href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>{' '}
            with:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>the page link (URL) where the content appears;</li>
            <li>a description of the content and what right it infringes or why it is unlawful;</li>
            <li>if it is your copyright or your image: proof or a statement that you are the owner or authorised to act for them;</li>
            <li>your name and contact details; and</li>
            <li>a statement that the information is accurate and the complaint is made in good faith.</li>
          </ul>

          <h2 className="font-montserrat font-bold text-2xl text-ink pt-6">What we do</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>We acknowledge your complaint within 24 hours.</li>
            <li>We resolve it within 15 days, in line with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.</li>
            <li>Infringing or unlawful content is removed or disabled. Content showing a person without consent, or a child&rsquo;s data submitted without a parent&rsquo;s consent, is removed on request.</li>
            <li>Users who repeatedly upload infringing content are removed from the platform.</li>
          </ul>
          <p>
            For personal-data requests see our{' '}
            <a className="text-forest underline" href="/privacy">Privacy Policy &amp; Terms</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
