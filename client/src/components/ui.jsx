import { Link } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { money, priceLabel } from '../lib/format.js';

export function Section({ eyebrow, title, intro, action, children, className = '' }) {
  return (
    <section className={`container-x py-14 sm:py-20 ${className}`}>
      {(eyebrow || title) && (
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            {title && <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>}
            {intro && <p className="mt-4 text-neutral-400">{intro}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHero({ eyebrow, title, intro, image, children }) {
  return (
    <div className="relative overflow-hidden border-b border-white/10">
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-neutral-950/80 to-neutral-950" />
      <div className="container-x relative py-16 sm:py-24">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl font-semibold sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg text-neutral-300">{intro}</p>}
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </div>
    </div>
  );
}

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center gap-2 py-16 text-neutral-400"><Loader2 className="animate-spin" size={18} /> {label}</div>
);

export const Empty = ({ children }) => (
  <div className="card p-10 text-center text-neutral-400">{children}</div>
);

export const ErrorNote = ({ children }) =>
  children ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{String(children)}</p> : null;

export const Checklist = ({ items = [] }) => (
  <ul className="space-y-2">
    {items.map((i) => (
      <li key={i} className="flex gap-2 text-sm text-neutral-300"><Check size={16} className="mt-0.5 shrink-0 text-amber-400" />{i}</li>
    ))}
  </ul>
);

export function ProductCard({ product, available }) {
  return (
    <Link to={`/rentals/${product.slug || product.id}`} className="card group overflow-hidden transition hover:border-amber-400/60">
      <div className="aspect-[4/3] overflow-hidden bg-neutral-800 relative">
        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-wider text-neutral-500">{product.category}</p>
        <h3 className="mt-1 font-semibold leading-snug group-hover:text-amber-400 transition-colors">{product.name}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-semibold text-amber-400">{money(product.daily_price)} <span className="text-xs font-normal text-neutral-500">/ day</span></span>
          {available != null && <span className={`text-xs px-2 py-1 rounded-full ${available > 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>{available > 0 ? `${available} available` : 'Booked out'}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ServiceCard({ service, onAdd }) {
  const quote = service.pricing_model === 'quote' || service.quote_only;
  return (
    <div className="card group flex flex-col overflow-hidden">
      <div className="aspect-[16/10] overflow-hidden bg-neutral-800 relative">
        <img src={service.image_url} alt={service.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="eyebrow">{service.category || service.best_for}</p>
        <h3 className="mt-2 text-xl font-semibold group-hover:text-amber-400 transition-colors">{service.name}</h3>
        <p className="mt-2 text-sm text-neutral-400">{service.tagline || service.description}</p>
        <div className="mt-4 flex-1"><Checklist items={(service.included || []).slice(0, 5)} /></div>
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          <div>
            <p className="font-semibold text-amber-400">{priceLabel(service)}</p>
            {service.min_hours > 1 && <p className="text-xs text-neutral-500">{service.min_hours}-hour minimum</p>}
          </div>
          {quote
            ? <Link to="/request-quote" className="btn-ghost">Request quote</Link>
            : <button className="btn-primary" onClick={onAdd}>Add to Event</button>}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return <label className={`block ${className}`}><span className="label">{label}</span>{children}</label>;
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-xl animate-fade-in-up animate-pulse-glow">
      {message}
    </div>
  );
}
