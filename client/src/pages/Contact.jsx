import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useMeta } from '../lib/hooks.js';
import { ErrorNote, Field, PageHero, Section } from '../components/ui.jsx';

export default function Contact() {
  useMeta('Contact', 'Get in touch with the Popcorn Events team.');
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: 'General inquiry', message: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/messages', f); setDone(true); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to a real person." intro="Questions about a booking, a venue or a crazy idea — send it over." />
      <Section>
        {done ? (
          <div className="card mx-auto max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-amber-400" size={44} /><h2 className="mt-4 text-3xl font-semibold">Message sent.</h2><p className="mt-2 text-neutral-400">We reply within one business day.</p></div>
        ) : (
          <form onSubmit={submit} className="card mx-auto grid max-w-2xl gap-4 p-6 sm:grid-cols-2 sm:p-10">
            <Field label="Name"><input required className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Email"><input required type="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Topic"><select className="input" value={f.subject} onChange={(e) => set('subject', e.target.value)}>{['General inquiry', 'Existing booking', 'Rentals', 'Entertainment', 'Production', 'Careers'].map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Message" className="sm:col-span-2"><textarea required rows={5} className="input" value={f.message} onChange={(e) => set('message', e.target.value)} /></Field>
            <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
            <button className="btn-primary sm:col-span-2">Send message</button>
          </form>
        )}
      </Section>
    </>
  );
}
