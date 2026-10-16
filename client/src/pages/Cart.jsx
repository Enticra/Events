import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../lib/cart.jsx';
import { useMeta } from '../lib/hooks.js';
import { money } from '../lib/format.js';
import { PageHero, Section, Empty } from '../components/ui.jsx';

export default function Cart() {
  useMeta('Your Event Cart');
  const cart = useCart();

  if (!cart.items.length) {
    return (
      <Section>
        <Empty>
          <p className="text-lg">Your event cart is empty.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/rentals" className="btn-primary">Shop rentals</Link>
            <Link to="/book" className="btn-ghost">Book entertainment</Link>
          </div>
        </Empty>
      </Section>
    );
  }

  return (
    <>
      <PageHero eyebrow="Complete your event" title="Rentals and services, one cart." intro="Delivery and setup are chosen at checkout based on your venue." />
      <Section>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cart.items.map((i) => (
              <div key={i.key} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {i.image_url && <img src={i.image_url} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />}
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">{i.kind}</p>
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-sm text-neutral-400">{money(i.unit_price)} / {i.pricing_model === 'hourly' ? 'hour' : i.unit_label || 'unit'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Stepper label="Qty" value={i.quantity} min={1} onChange={(v) => cart.update(i.key, { quantity: v })} />
                  {i.pricing_model === 'hourly' && <Stepper label="Hours" value={i.hours} min={i.min_hours || 1} onChange={(v) => cart.update(i.key, { hours: v })} />}
                  <span className="w-24 text-right font-semibold">{money(cart.lineTotal(i))}</span>
                  <button className="text-neutral-500 hover:text-red-400" onClick={() => cart.remove(i.key)} aria-label="Remove"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
          <aside className="card h-fit space-y-4 p-6">
            <h3 className="text-lg font-semibold">Summary</h3>
            <div className="flex justify-between text-neutral-300"><span>Item subtotal</span><span>{money(cart.subtotal)}</span></div>
            <p className="text-xs text-neutral-500">Fulfillment fees are added at checkout. Weekend rates may apply to some rentals.</p>
            <Link to="/checkout" className="btn-primary w-full">Continue to Checkout</Link>
            <button className="w-full text-sm text-neutral-500 hover:text-red-400" onClick={cart.clear}>Clear cart</button>
          </aside>
        </div>
      </Section>
    </>
  );
}

function Stepper({ label, value, min, onChange }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="flex items-center gap-1">
        <button className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:border-amber-400" onClick={() => onChange(Math.max(min, value - 1))}><Minus size={12} /></button>
        <input type="number" min={min} className="w-14 bg-transparent text-center text-sm" value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))} />
        <button className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:border-amber-400" onClick={() => onChange(value + 1)}><Plus size={12} /></button>
      </div>
    </div>
  );
}
