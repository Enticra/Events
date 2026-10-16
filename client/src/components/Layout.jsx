import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, X, Sparkles } from 'lucide-react';
import { useCart } from '../lib/cart.jsx';

const NAV = [
  ['/rentals', 'Rentals'],
  ['/book', 'DJ & Entertainment'],
  ['/event-production', 'Production'],
  ['/packages', 'Packages'],
  ['/gallery', 'Gallery'],
  ['/blog', 'Resources'],
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-neutral-950">P</span>
      Popcorn<span className="text-amber-400">Events</span>
    </Link>
  );
}

function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `text-sm font-medium transition hover:text-amber-400 relative ${isActive ? 'text-amber-400' : 'text-neutral-300'}`}>
              {label}
              {({ isActive }) => (
                <span className={`absolute bottom-0 left-0 h-0.5 bg-amber-400 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/build-my-event" className="btn-primary hidden sm:inline-flex"><Sparkles size={16} /> Build My Event</Link>
          <Link to="/cart" className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 hover:border-amber-400" aria-label="Cart">
            <ShoppingBag size={18} />
            {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-neutral-950">{count}</span>}
          </Link>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-white/15 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="container-x flex flex-col gap-1 border-t border-white/10 py-4 lg:hidden">
          {[...NAV, ['/build-my-event', 'Build My Event'], ['/calculators', 'Planning calculators'], ['/contact', 'Contact']].map(([to, label]) => (
            <NavLink key={to} to={to} className="rounded-xl px-3 py-2.5 text-neutral-200 hover:bg-white/5">{label}</NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const cols = [
    ['Book', [['/rentals', 'Rental storefront'], ['/book', 'DJ & entertainment'], ['/packages', 'Packages'], ['/build-my-event', 'Build my event'], ['/request-quote', 'Request a quote']]],
    ['Services', [['/dj-rental', 'DJ equipment rental'], ['/corporate-av', 'Corporate AV'], ['/event-production', 'Event production'], ['/service-areas', 'Service areas']]],
    ['Plan', [['/calculators', 'Planning calculators'], ['/blog', 'Event resources'], ['/gallery', 'Gallery'], ['/dj-portal', 'DJ client portal']]],
    ['Company', [['/about', 'About'], ['/contact', 'Contact'], ['/admin', 'Team login']]],
  ];
  return (
    <footer className="mt-24 border-t border-white/10 bg-neutral-950">
      <div className="container-x grid gap-10 py-14 md:grid-cols-6">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-neutral-400">Rentals, DJs, entertainment and full production for weddings, parties and big stages across the Phoenix metro.</p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <h4 className="mb-3 text-sm font-semibold">{title}</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              {links.map(([to, label]) => <li key={to}><Link to={to} className="hover:text-amber-400">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-x border-t border-white/10 py-6 text-xs text-neutral-500">© {new Date().getFullYear()} Popcorn Events. All rights reserved.</div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    try { window.scrollTo(0, 0); } catch {}
    return () => {};
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
