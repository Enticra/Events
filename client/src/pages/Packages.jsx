import { useState } from 'react';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { useCart, toCartItem } from '../lib/cart.jsx';
import { PageHero, Section, ServiceCard, Spinner, Empty, Toast } from '../components/ui.jsx';
import { useToast } from '../components/useToast.js';

export default function Packages() {
  useMeta('Event Packages', 'Ready-made DJ, audio, effects and rental packages.');
  const cart = useCart();
  const [toast, showToast] = useToast();
  const [type, setType] = useState('All event types');
  const [io, setIo] = useState('Indoor / outdoor');
  const packages = useAsync(() => entity('Package').list({}, 'name'), []);
  const types = ['All event types', ...new Set((packages.data || []).flatMap((p) => p.event_types || []))];
  const shown = (packages.data || []).filter((p) =>
    (type === 'All event types' || p.event_types?.includes(type)) &&
    (io === 'Indoor / outdoor' || p.indoor_outdoor === 'both' || p.indoor_outdoor === io.toLowerCase()));

  const add = (p) => {
    // Per-unit packages (e.g. chairs) default to a sensible starting quantity.
    cart.add(toCartItem('package', p, { quantity: p.pricing_model === 'per_unit' ? 50 : 1 }));
    showToast(`${p.name} added to your event`);
  };

  return (
    <>
      <PageHero eyebrow="Package marketplace" title="Start with a package. Make it yours." intro="Each package is a starting point — adjust quantities, hours and add-ons in your cart before you book." />
      <Section>
        <div className="mb-8 flex flex-wrap gap-3">
          <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="input w-auto" value={io} onChange={(e) => setIo(e.target.value)}>{['Indoor / outdoor', 'Indoor', 'Outdoor'].map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        {packages.loading ? <Spinner /> : !shown.length ? <Empty>No packages match those filters.</Empty> : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => <ServiceCard key={p.id} service={p} onAdd={() => add(p)} />)}
          </div>
        )}
      </Section>
      <Toast message={toast} />
    </>
  );
}
