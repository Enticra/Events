// Cart state, persisted to localStorage. Prices here are display estimates;
// the server re-prices everything at checkout.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'pe_cart_v1';

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || { items: [], eventDetails: {} }; }
  catch { return { items: [], eventDetails: {} }; }
};

export function lineTotal(item) {
  return (item.unit_price || 0) * (item.quantity || 1) * (item.pricing_model === 'hourly' ? item.hours || 1 : 1);
}

/** Build a cart line from a catalog doc. kind: product | service | package */
export function toCartItem(kind, doc, { quantity = 1, hours } = {}) {
  const unit = kind === 'product' ? doc.daily_price : kind === 'package' ? doc.starting_price : doc.price;
  const model = kind === 'product' ? 'per_unit' : doc.pricing_model;
  return {
    key: `${kind}:${doc.id}`, kind, ref_id: doc.id, name: doc.name, image_url: doc.image_url,
    unit_price: unit || 0, pricing_model: model, unit_label: doc.unit_label || (kind === 'product' ? 'day' : ''),
    min_hours: doc.min_hours || null, quantity,
    hours: model === 'hourly' ? Math.max(hours || doc.min_hours || 1, doc.min_hours || 1) : null,
  };
}

export function CartProvider({ children }) {
  const [state, setState] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  const value = useMemo(() => {
    const { items, eventDetails } = state;
    return {
      items,
      eventDetails,
      count: items.reduce((n, i) => n + (i.kind === 'product' ? 1 : i.quantity), 0),
      subtotal: items.reduce((s, i) => s + lineTotal(i), 0),
      lineTotal,
      add(item) {
        setState((s) => {
          const existing = s.items.find((i) => i.key === item.key);
          const items = existing
            ? s.items.map((i) => (i.key === item.key ? { ...i, quantity: i.quantity + item.quantity, hours: item.hours ?? i.hours } : i))
            : [...s.items, item];
          return { ...s, items };
        });
      },
      addMany(list) { list.forEach((i) => value.add(i)); },
      update(key, patch) {
        setState((s) => ({ ...s, items: s.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
      },
      remove(key) { setState((s) => ({ ...s, items: s.items.filter((i) => i.key !== key) })); },
      setEventDetails(patch) { setState((s) => ({ ...s, eventDetails: { ...s.eventDetails, ...patch } })); },
      clear() { setState({ items: [], eventDetails: {} }); },
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
