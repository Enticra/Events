import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { PageHero, Section, Spinner, Empty } from '../components/ui.jsx';

export default function Gallery() {
  useMeta('Gallery', 'Real events we have powered — equipment, entertainment and production.');
  const items = useAsync(() => entity('GalleryItem').list(), []);
  const [cat, setCat] = useState('All');
  const cats = ['All', ...new Set((items.data || []).map((i) => i.category))];
  const shown = (items.data || []).filter((i) => cat === 'All' || i.category === cat);

  return (
    <>
      <PageHero eyebrow="Gallery" title="Real events. Real setups." intro="Every photo is a job our team powered." />
      <Section>
        <div className="mb-8 flex flex-wrap gap-2">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={cat === c ? 'chip-on' : 'chip-off'}>{c}</button>)}</div>
        {items.loading ? <Spinner /> : !shown.length ? <Empty>No gallery entries in this category yet.</Empty> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((g) => (
              <figure key={g.id} className="card overflow-hidden">
                <img src={g.image_url} alt={g.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <figcaption className="p-5">
                  <p className="eyebrow">{g.event_type}</p>
                  <h3 className="mt-1 font-semibold">{g.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-neutral-400"><MapPin size={14} /> {g.venue} · {g.location}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{(g.services_provided || []).map((s) => <span key={s} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-300">{s}</span>)}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
