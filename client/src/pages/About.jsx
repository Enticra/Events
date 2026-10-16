import { Link } from 'react-router-dom';
import { useMeta } from '../lib/hooks.js';
import { PageHero, Section } from '../components/ui.jsx';

const VALUES = [
  ['One team', 'Rentals, entertainment and production under one roof means one point of contact and no finger-pointing on the day.'],
  ['Transparent pricing', 'Prices are listed up front and the cart shows exactly what you pay. No surprise line items.'],
  ['Every culture', 'American, South Asian and fusion weddings — we know the timelines, the traditions and the music.'],
];

export default function About() {
  useMeta('About Us', 'The team behind Popcorn Events.');
  return (
    <>
      <PageHero eyebrow="About" title="We started with one speaker and a lot of weekends." intro="Today we run rentals, entertainment and full production across the Phoenix metro — but the job is still the same: make sure the night goes right." />
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          {VALUES.map(([t, d]) => <div key={t} className="card p-7"><h3 className="text-xl font-semibold">{t}</h3><p className="mt-3 text-neutral-400">{d}</p></div>)}
        </div>
        <div className="mt-10 flex flex-wrap gap-3"><Link to="/gallery" className="btn-primary">See our work</Link><Link to="/contact" className="btn-ghost">Get in touch</Link></div>
      </Section>
    </>
  );
}
