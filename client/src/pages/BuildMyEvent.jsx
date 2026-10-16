import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCart } from '../lib/cart.jsx';
import { useMeta } from '../lib/hooks.js';
import { EVENT_TYPES, today } from '../lib/format.js';
import { ErrorNote, Field, Section } from '../components/ui.jsx';
import { RecommendationList, SERVICE_OPTIONS, conciergeToCart } from '../components/Concierge.jsx';

const BUDGETS = ['Under $1,500', '$1,500 – $3,000', '$3,000 – $7,500', '$7,500 – $15,000', '$15,000+'];

export default function BuildMyEvent() {
  useMeta('Build My Event', 'Answer seven quick questions and get a complete, priced event setup.');
  const cart = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ event_type: 'Wedding', event_date: '', guest_count: 150, hours: 5, indoor_outdoor: 'indoor', services: ['DJ', 'Lighting'], budget: '', notes: '', customer_name: '', customer_email: '', customer_phone: '', venue: '' });
  const [result, setResult] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggle = (s) => set('services', f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s]);

  const QUESTIONS = [
    ['What are you planning?', <div className="flex flex-wrap gap-2">{EVENT_TYPES.map((t) => <button key={t} onClick={() => set('event_type', t)} className={f.event_type === t ? 'chip-on' : 'chip-off'}>{t}</button>)}</div>],
    ['When is it?', <input type="date" min={today()} className="input max-w-xs" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} />],
    ['How many guests?', <input type="number" min="1" className="input max-w-xs" value={f.guest_count} onChange={(e) => set('guest_count', e.target.value)} />],
    ['How long is the party?', <div className="flex items-center gap-3"><input type="number" min="1" className="input max-w-[8rem]" value={f.hours} onChange={(e) => set('hours', e.target.value)} /><span className="text-neutral-400">hours</span></div>],
    ['Indoors or outdoors?', <div className="flex gap-2">{['indoor', 'outdoor'].map((o) => <button key={o} onClick={() => set('indoor_outdoor', o)} className={f.indoor_outdoor === o ? 'chip-on capitalize' : 'chip-off capitalize'}>{o}</button>)}</div>],
    ['What do you need?', <div className="flex flex-wrap gap-2">{SERVICE_OPTIONS.map((s) => <button key={s} onClick={() => toggle(s)} className={f.services.includes(s) ? 'chip-on' : 'chip-off'}>{s}</button>)}</div>],
    ['Budget range & anything else?', (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{BUDGETS.map((b) => <button key={b} onClick={() => set('budget', b)} className={f.budget === b ? 'chip-on' : 'chip-off'}>{b}</button>)}</div>
        <textarea rows={3} className="input" placeholder="Venue rules, cultural traditions, timing, must-haves…" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    )],
  ];

  const finish = async () => {
    setError('');
    try { setResult(await api.post('/concierge', f)); setStep(QUESTIONS.length); } catch (e) { setError(e.message); }
  };
  const addToCart = async () => {
    cart.addMany(await conciergeToCart(result.items));
    cart.setEventDetails({ event_type: f.event_type, event_date: f.event_date, guest_count: f.guest_count });
    navigate('/cart');
  };
  const sendToTeam = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/leads', { ...f, source: 'build-my-event' }); setSent(true); } catch (err) { setError(err.message); }
  };

  if (sent) {
    return (
      <Section>
        <div className="mx-auto max-w-xl text-center">
          <CheckCircle2 className="mx-auto text-amber-400" size={48} />
          <h1 className="mt-4 text-4xl font-semibold">We’re on it.</h1>
          <p className="mt-3 text-neutral-400">Our team is reviewing your event and will follow up with a tailored quote.</p>
        </div>
      </Section>
    );
  }

  return (
    <Section eyebrow="Build my event" title="Seven questions. One complete setup." intro="Answer what you know — everything stays editable before you book.">
      {step < QUESTIONS.length ? (
        <div className="card mx-auto max-w-3xl p-6 sm:p-10">
          <div className="mb-8 flex gap-1.5">{QUESTIONS.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-amber-400' : 'bg-white/10'}`} />)}</div>
          <p className="eyebrow">Question {step + 1} of {QUESTIONS.length}</p>
          <h2 className="mb-6 mt-2 text-3xl font-semibold">{QUESTIONS[step][0]}</h2>
          {QUESTIONS[step][1]}
          <ErrorNote>{error}</ErrorNote>
          <div className="mt-10 flex justify-between">
            <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
            {step < QUESTIONS.length - 1
              ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button>
              : <button className="btn-primary" onClick={finish}>Show Recommended Services</button>}
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="mb-4 text-xl font-semibold">Your recommended setup</h3>
            <RecommendationList result={result} />
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={addToCart} disabled={!result.items.length}>Add to cart & book</button>
              <button className="btn-ghost" onClick={() => setStep(0)}>Edit answers</button>
            </div>
          </div>
          <form onSubmit={sendToTeam} className="card space-y-4 p-6">
            <h3 className="text-xl font-semibold">Prefer a human to plan it?</h3>
            <p className="text-sm text-neutral-400">Send your answers to our team and we’ll come back with a custom quote.</p>
            <Field label="Name"><input required className="input" value={f.customer_name} onChange={(e) => set('customer_name', e.target.value)} /></Field>
            <Field label="Email"><input required type="email" className="input" value={f.customer_email} onChange={(e) => set('customer_email', e.target.value)} /></Field>
            <Field label="Phone"><input className="input" value={f.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} /></Field>
            <Field label="Venue"><input className="input" value={f.venue} onChange={(e) => set('venue', e.target.value)} /></Field>
            <ErrorNote>{error}</ErrorNote>
            <button className="btn-ghost w-full">Send to the team</button>
          </form>
        </div>
      )}
    </Section>
  );
}
