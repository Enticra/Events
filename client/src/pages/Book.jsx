import { useState } from 'react';
import { Link } from 'react-router-dom';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { useCart, toCartItem } from '../lib/cart.jsx';
import { PageHero, Section, ServiceCard, Spinner, Toast } from '../components/ui.jsx';
import { useToast } from '../components/useToast.js';

const FAQ = [
  ['How far ahead should I book?', 'Peak Saturdays from October to April fill months ahead. Lock your date with a 25% deposit as soon as you know it.'],
  ['Do cold sparks need venue approval?', 'Usually yes. We provide the insurance certificate and spec sheet your venue will ask for.'],
  ['Can I send my DJ a song list?', 'Yes — after booking, use the DJ client portal to share your timeline, must-plays and do-not-plays.'],
];

export default function Book() {
  useMeta('DJ & Entertainment', 'Book DJs, dhol players, Baraat sound, cold sparks and more.');
  const cart = useCart();
  const [category, setCategory] = useState('All');
  const [toast, showToast] = useToast();
  const services = useAsync(() => entity('ServiceOffering').list({}, 'name'), []);
  const categories = ['All', ...new Set((services.data || []).map((s) => s.category))];
  const shown = (services.data || []).filter((s) => category === 'All' || s.category === category);

  return (
    <>
      <PageHero eyebrow="DJ & Entertainment" title="Book the people who make the night." intro="DJs, live performers and special effects — priced up front, booked in the same cart as your rentals." image="https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=2000&q=80" />
      <Section>
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'chip-on' : 'chip-off'}>{c}</button>)}
        </div>
        {services.loading ? <Spinner /> : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((s) => (
              <ServiceCard key={s.id} service={s} onAdd={() => { cart.add(toCartItem('service', s)); showToast(`${s.name} added to your event`); }} />
            ))}
          </div>
        )}
      </Section>
      <Section eyebrow="Frequently asked" title="Good to know.">
        <div className="grid gap-4 md:grid-cols-3">
          {FAQ.map(([q, a]) => <div key={q} className="card p-6"><h3 className="font-semibold">{q}</h3><p className="mt-2 text-sm text-neutral-400">{a}</p></div>)}
        </div>
        <Link to="/cart" className="btn-primary mt-10">Review my event cart</Link>
      </Section>
      <Toast message={toast} />
    </>
  );
}
