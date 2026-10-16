import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../lib/hooks.js';
import { PageHero, Section } from '../components/ui.jsx';

/** Planning rules of thumb. Kept in sync with the server concierge. */
function plan(guests, seated) {
  const dancers = Math.round(guests / 3);
  const floorSide = Math.max(12, Math.ceil(Math.sqrt(dancers * 4.5) / 3) * 3);
  return [
    ['Chairs', Math.ceil(guests * 1.05), 'One per guest + 5% spare'],
    ['60" round tables', seated ? Math.ceil(guests / 8) : 0, '8 guests per table'],
    ['Highboy cocktail tables', Math.max(2, Math.ceil(guests / 40)), 'One per ~40 guests'],
    ['Dance floor', `${floorSide}' × ${floorSide}'`, `${(floorSide / 3) ** 2} panels for ~${dancers} dancers`],
    ['12" speakers', Math.max(2, Math.ceil(guests / 75)), 'One per ~75 guests'],
    ['18" subwoofers', Math.max(1, Math.ceil(guests / 100)), 'One per ~100 guests'],
    ['Uplights', Math.min(24, Math.max(8, Math.ceil(guests / 15))), 'For a fully lit room'],
    ['Wireless mics', guests > 200 ? 3 : 2, 'Toasts, MC and backup'],
  ];
}

export default function Calculators() {
  useMeta('Event Planning Calculators', 'Enter a guest count and get chairs, tables, dance floor size and speaker counts.');
  const [guests, setGuests] = useState(150);
  const [seated, setSeated] = useState(true);
  const rows = plan(Math.max(1, Number(guests) || 1), seated);

  return (
    <>
      <PageHero eyebrow="Free planning tools" title="Type a guest count. Get real numbers." intro="These are starting points — every quantity stays editable when you book." />
      <Section>
        <div className="card mx-auto max-w-4xl p-6 sm:p-10">
          <div className="flex flex-wrap items-end gap-6">
            <label><span className="label">Guest count</span><input type="number" min="1" className="input w-40 text-2xl font-semibold" value={guests} onChange={(e) => setGuests(e.target.value)} /></label>
            <input type="range" min="10" max="1000" step="10" value={guests} onChange={(e) => setGuests(e.target.value)} className="flex-1 accent-amber-400" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-400" checked={seated} onChange={(e) => setSeated(e.target.checked)} /> Seated dinner</label>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {rows.map(([label, value, hint]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-sm text-neutral-400">{label}</p>
                <p className="mt-1 font-display text-3xl font-semibold text-amber-400">{value}</p>
                <p className="mt-1 text-xs text-neutral-500">{hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/build-my-event" className="btn-primary">Turn this into a priced setup</Link>
            <Link to="/rentals" className="btn-ghost">Shop rentals</Link>
          </div>
        </div>
      </Section>
    </>
  );
}
