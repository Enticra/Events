// Shared template for the DJ rental, corporate AV and event production pages.
import { Link } from 'react-router-dom';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { Checklist, PageHero, ProductCard, Section } from '../components/ui.jsx';

const PAGES = {
  'dj-rental': {
    title: 'DJ Equipment Rental', eyebrow: 'DJ rental',
    headline: 'Spin your own set on pro gear.',
    intro: 'Controllers, powered speakers, subs and lighting — delivered, or ready for pickup.',
    image: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=2000&q=80',
    categories: ['DJ Equipment', 'Audio', 'Lighting'],
    points: ['Tested and cleaned after every rental', 'Cables and stands included', 'Pickup or delivery with setup', 'Add a tech for the night'],
  },
  'corporate-av': {
    title: 'Corporate AV', eyebrow: 'Corporate AV',
    headline: 'Keynotes, galas and conferences that run on time.',
    intro: 'Projection, LED walls, wireless mics, staging and an operator who knows when to cue the walk-up music.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80',
    categories: ['Video', 'Staging', 'Audio'],
    points: ['Dedicated A1/V1 technicians', 'Confidence monitors & playback', 'Certificates of insurance on request', 'Invoicing for procurement teams'],
  },
  'event-production': {
    title: 'Event Production', eyebrow: 'Event production',
    headline: 'From a rented speaker to a full stage build.',
    intro: 'Concerts, festivals, conferences and 1,000-guest weddings — designed, programmed and operated by our in-house crew.',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=2000&q=80',
    categories: ['Staging', 'Video', 'Lighting', 'Power & Cables'],
    points: ['Production design & site visits', 'Line arrays, moving lights & LED video', 'Staging, rigging & power distribution', 'Show calling and technical crew'],
  },
};

export default function Landing({ page }) {
  const cfg = PAGES[page];
  useMeta(cfg.title, cfg.intro);
  const products = useAsync(() => entity('Product').list({}, 'name'), [page]);
  const shown = (products.data || []).filter((p) => cfg.categories.includes(p.category)).slice(0, 8);

  return (
    <>
      <PageHero eyebrow={cfg.eyebrow} title={cfg.headline} intro={cfg.intro} image={cfg.image}>
        <Link to="/request-quote" className="btn-primary">Request a quote</Link>
        <Link to="/rentals" className="btn-ghost">Browse inventory</Link>
      </PageHero>
      <Section eyebrow="Why us" title="Built for the details.">
        <div className="card max-w-2xl p-8"><Checklist items={cfg.points} /></div>
      </Section>
      {!!shown.length && (
        <Section eyebrow="Featured equipment" title="Reserve online.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{shown.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </Section>
      )}
    </>
  );
}
