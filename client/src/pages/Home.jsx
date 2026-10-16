import { Link } from 'react-router-dom';
import { ArrowRight, Armchair, Music2, Speaker, Star } from 'lucide-react';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { useCart, toCartItem } from '../lib/cart.jsx';
import { Section, ProductCard, ServiceCard, Toast } from '../components/ui.jsx';
import Concierge from '../components/Concierge.jsx';
import { useToast } from '../components/useToast.js';

const HERO = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=2000&q=80';

const DIVISIONS = [
  { icon: Armchair, title: 'Rentals', text: 'Tables, chairs, staging, dance floors, audio, lighting and video — reserve by the day.', to: '/rentals', cta: 'Shop rentals' },
  { icon: Music2, title: 'DJ & Entertainment', text: 'DJs, dhol players, Baraat sound carts, cold sparks and low fog.', to: '/book', cta: 'Book entertainment' },
  { icon: Speaker, title: 'Event Production', text: 'Line arrays, LED walls, rigging and crew for concerts, conferences and big weddings.', to: '/event-production', cta: 'Explore production' },
];

const STEPS = [
  ['01', 'Pick what you need', 'Rentals, entertainment or a ready-made package — or let POP plan it for you.'],
  ['02', 'Build one cart', 'Gear and performers live in the same cart with transparent pricing.'],
  ['03', 'Check your date', 'Inventory is validated against every other booking on your event date.'],
  ['04', 'Sign and pay', 'Accept the agreement, pay a 25% deposit or in full, and your date is locked.'],
];

export default function Home() {
  useMeta('Event Rentals, DJs & Production', 'Book rentals, DJs, entertainment and full event production in one place.');
  const cart = useCart();
  const [toast, showToast] = useToast();
  const products = useAsync(() => entity('Product').list({ featured: true }, 'name', 8), []);
  const services = useAsync(() => entity('ServiceOffering').list({ featured: true }, 'name', 3), []);
  const gallery = useAsync(() => entity('GalleryItem').list({}, '-created_date', 6), []);
  const reviews = useAsync(() => entity('Review').list({}, '-created_date', 3), []);

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/30 via-neutral-950/70 to-neutral-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent opacity-50" />
        <div className="container-x relative py-24 sm:py-36">
          <p className="eyebrow mb-5 animate-fade-in-up opacity-0 animate-float" style={{ animationDelay: '0.1s', animationDuration: '4s' }}>Rentals • Production • DJs • Entertainment</p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] sm:text-7xl animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s' }}>
            Your whole event, <span className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-gradient bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">booked in one place.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-neutral-300 animate-fade-in-up opacity-0" style={{ animationDelay: '0.5s' }}>From a stack of chairs to a festival stage — reserve gear, book performers and lock your date in a single checkout.</p>
          <div className="mt-10 flex flex-wrap gap-3 animate-fade-in-up opacity-0" style={{ animationDelay: '0.7s' }}>
            <Link to="/build-my-event" className="btn-primary px-7 py-3.5 text-base animate-shimmer group">Build My Event <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></Link>
            <Link to="/rentals" className="btn-ghost px-7 py-3.5 text-base animate-pulse-glow">Shop Rentals</Link>
          </div>
          <div className="absolute top-20 right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl animate-float hidden lg:block" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-10 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl animate-float hidden lg:block" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      {/* Divisions */}
      <Section eyebrow="What we do" title="One company for every part of the night." intro="Rent a single speaker, book a DJ and a dhol player, or hand us a 1,000-guest production — same team, same checkout.">
        <div className="grid gap-5 md:grid-cols-3">
          {DIVISIONS.map(({ icon: Icon, title, text, to, cta }, idx) => (
            <Link key={title} to={to} className="card group p-8 transition hover:border-amber-400/60 animate-fade-in-up opacity-0" style={{ animationDelay: `${0.2 + idx * 0.15}s` }}>
              <div className="relative">
                <Icon className="text-amber-400 relative z-10" size={28} />
                <div className="absolute inset-0 bg-amber-400/20 blur-xl group-hover:bg-amber-400/30 transition-all duration-300" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold group-hover:text-amber-400 transition-colors">{title}</h3>
              <p className="mt-3 text-neutral-400">{text}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-amber-400">{cta} <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Popular rentals */}
      <Section eyebrow="Popular rentals" title="Reserve the essentials." action={<Link to="/rentals" className="btn-ghost">Browse full inventory</Link>}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(products.data || []).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </Section>

      {/* Entertainment */}
      <Section eyebrow="DJ & Entertainment" title="Performers who keep people dancing." action={<Link to="/book" className="btn-ghost">All entertainment</Link>}>
        <div className="grid gap-5 md:grid-cols-3">
          {(services.data || []).map((s) => (
            <ServiceCard key={s.id} service={s} onAdd={() => { cart.add(toCartItem('service', s)); showToast(`${s.name} added to your event`); }} />
          ))}
        </div>
      </Section>

      {/* Production */}
      <section className="border-y border-white/10 bg-neutral-900/40">
        <div className="container-x grid items-center gap-10 py-20 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Event Production</p>
            <h2 className="text-4xl font-semibold">From a single speaker to a full stage show.</h2>
            <p className="mt-4 text-neutral-400">Weddings, concerts, conferences and festivals — designed, programmed and run by our own technical crew.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/request-quote" className="btn-primary">Request Production Quote</Link>
              <Link to="/corporate-av" className="btn-ghost">Corporate AV</Link>
            </div>
          </div>
          <img src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1400&q=80" alt="Stage production" className="aspect-[4/3] w-full rounded-3xl object-cover" />
        </div>
      </section>

      {/* Concierge */}
      <Section><Concierge /></Section>

      {/* Weddings */}
      <Section eyebrow="Wedding experiences" title="Every tradition, every timeline." intro="Multicultural weddings are our specialty — ceremony sound, Baraat, Sangeet, reception and everything in between.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['Ceremony audio', 'Baraat procession', 'Sangeet night', 'Reception & first dance'].map((t, i) => (
            <div key={t} className="card p-6">
              <span className="font-display text-3xl font-bold text-amber-400/40">0{i + 1}</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
            </div>
          ))}
        </div>
      </Section>

      {/* Gallery preview */}
      {!!gallery.data?.length && (
        <Section eyebrow="Recent events" title="Nights we powered." action={<Link to="/gallery" className="btn-ghost">View gallery</Link>}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {gallery.data.map((g, idx) => (
              <div key={g.id} className="group relative aspect-square overflow-hidden rounded-3xl animate-fade-in-up opacity-0" style={{ animationDelay: `${0.1 + idx * 0.1}s` }}>
                <img src={g.image_url} alt={g.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:rotate-1" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent" />
                <div className="absolute inset-0 bg-amber-400/0 group-hover:bg-amber-400/10 transition-all duration-300" />
                <p className="absolute bottom-4 left-4 right-4 text-sm font-semibold transform group-hover:translate-y-0 translate-y-2 opacity-80 group-hover:opacity-100 transition-all duration-300">{g.title}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Reviews (shown once the team publishes some from the admin dashboard) */}
      {!!reviews.data?.length && (
        <Section eyebrow="Reviews" title="What our clients say.">
          <div className="grid gap-5 md:grid-cols-3">
            {reviews.data.map((r) => (
              <figure key={r.id} className="card p-7">
                <div className="flex gap-0.5 text-amber-400">{Array.from({ length: r.rating || 5 }, (_, i) => <Star key={i} size={16} fill="currentColor" />)}</div>
                <blockquote className="mt-4 text-neutral-300">“{r.body}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold">{r.author_name}<span className="font-normal text-neutral-500"> · {r.event_type}</span></figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* How it works */}
      <Section eyebrow="How booking works" title="Four steps, no phone tag." intro="Most clients book from their phone in a few minutes.">
        <div className="grid gap-5 md:grid-cols-4">
          {STEPS.map(([n, t, d], idx) => (
            <div key={n} className="card p-7 group animate-fade-in-up opacity-0" style={{ animationDelay: `${0.1 + idx * 0.12}s` }}>
              <span className="font-display text-sm font-bold text-amber-400 group-hover:scale-110 inline-block transition-transform">{n}</span>
              <h3 className="mt-3 text-lg font-semibold group-hover:text-amber-400 transition-colors">{t}</h3>
              <p className="mt-2 text-sm text-neutral-400">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="rounded-3xl bg-amber-400 p-10 text-neutral-950 sm:p-14">
          <h2 className="text-4xl font-semibold">Rent it. Book it. Celebrate it.</h2>
          <p className="mt-3 max-w-xl text-neutral-800">Tell us about your event and we’ll put the whole thing together.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/build-my-event" className="btn bg-neutral-950 text-white hover:bg-neutral-800">Build My Event</Link>
            <Link to="/gallery" className="btn border border-neutral-950/30 hover:bg-neutral-950/10">See our work</Link>
          </div>
        </div>
      </Section>
      <Toast message={toast} />
    </>
  );
}
