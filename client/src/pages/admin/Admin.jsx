import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { api, adminToken, entity } from '../../lib/api.js';
import { useAsync, useMeta } from '../../lib/hooks.js';
import { dateLabel, money } from '../../lib/format.js';
import { ErrorNote, Field, Section, Spinner, Empty } from '../../components/ui.jsx';
import EntityManager from './EntityManager.jsx';
import QuoteBuilder from './QuoteBuilder.jsx';
import { SCHEMAS } from './schemas.js';

const TABS = ['Overview', 'Bookings', 'Quotes', 'Messages', 'Content', 'Team'];
const CONTENT = ['ServiceOffering', 'Product', 'Package', 'ServiceArea', 'BlogPost', 'GalleryItem', 'Review'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { const { token } = await api.post('/auth/login', { password }); adminToken.set(token); onLogin(); }
    catch (err) { setError(err.message); }
  };
  return (
    <Section>
      <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Team login</h1>
        <Field label="Admin password"><input type="password" autoFocus className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full">Sign in</button>
      </form>
    </Section>
  );
}

function Overview() {
  const stats = useAsync(() => api.get('/admin/stats'), []);
  const s = stats.data;
  if (!s) return <Spinner />;
  const tiles = [['Bookings', s.bookings], ['Upcoming events', s.upcoming], ['Revenue booked', money(s.revenue_booked)], ['Collected', money(s.collected)], ['Open quotes', s.open_quotes], ['New messages', s.new_messages]];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([l, v]) => <div key={l} className="card p-5"><p className="text-xs text-neutral-400">{l}</p><p className="mt-1 font-display text-2xl font-semibold">{v}</p></div>)}
      </div>
      <div className="card p-6">
        <h3 className="mb-4 font-semibold">Most booked items</h3>
        {!s.top_items.length ? <p className="text-sm text-neutral-500">No bookings yet.</p> : (
          <div className="space-y-2">
            {s.top_items.map((t) => (
              <div key={t.name} className="flex items-center gap-3 text-sm">
                <span className="w-64 truncate">{t.name}</span>
                <div className="h-2 flex-1 rounded-full bg-white/5"><div className="h-2 rounded-full bg-amber-400" style={{ width: `${(t.qty / s.top_items[0].qty) * 100}%` }} /></div>
                <span className="w-12 text-right text-neutral-400">{t.qty}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Bookings() {
  const rows = useAsync(() => entity('Booking').list({}, '-event_date'), []);
  const [open, setOpen] = useState(null);
  const setStatus = async (b, status) => { await entity('Booking').update(b.id, { status }); rows.reload(); };
  if (rows.loading) return <Spinner />;
  if (!rows.data.length) return <Empty>No bookings yet.</Empty>;
  return (
    <div className="space-y-3">
      {rows.data.map((b) => (
        <div key={b.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button className="text-left" onClick={() => setOpen(open === b.id ? null : b.id)}>
              <p className="font-semibold">{b.customer_name} · {b.event_type}</p>
              <p className="text-sm text-neutral-400">{dateLabel(b.event_date)} · {b.venue_name || 'Venue TBD'} · {b.customer_email}</p>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm">{money(b.total)} <span className="text-neutral-500">({b.payment_status?.replace('_', ' ')})</span></span>
              <select className="input w-36 py-1.5" value={b.status} onChange={(e) => setStatus(b, e.target.value)}>{BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          {open === b.id && (
            <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 text-sm md:grid-cols-2">
              <div className="space-y-1">
                {b.items.map((l) => <p key={l.ref_id} className="flex justify-between"><span>{l.name} × {l.quantity}{l.hours ? ` · ${l.hours}h` : ''}</span><span>{money(l.line_total)}</span></p>)}
                <p className="flex justify-between text-neutral-400"><span>Fulfillment ({b.fulfillment})</span><span>{money(b.delivery_fee)}</span></p>
                <p className="flex justify-between text-neutral-400"><span>Paid / balance</span><span>{money(b.amount_paid)} / {money(b.balance_due)}</span></p>
                {(b.payments || []).map((p) => (
                  <p key={p.session_id} className="flex justify-between text-xs text-emerald-400">
                    <span>Stripe {p.payment_intent} · {new Date(p.paid_at).toLocaleString()}</span><span>{money(p.amount)}</span>
                  </p>
                ))}
              </div>
              <div className="space-y-1 text-neutral-400">
                <p>Phone: {b.customer_phone} · Guests: {b.guest_count || '—'} · {b.start_time || '?'}–{b.end_time || '?'}</p>
                <p>Address: {b.venue_address || '—'} {b.city}</p>
                {b.venue_contact && <p>Venue contact: {b.venue_contact} · Setup: {b.setup_time || '—'}</p>}
                {b.fx_venue_approved && <p>FX venue approval: {b.fx_venue_approved}</p>}
                {b.special_instructions && <p>Notes: {b.special_instructions}</p>}
                <p>Signed by: {b.agreement_signature}</p>
                {Object.entries(b.dj_details || {}).filter(([, v]) => v).map(([k, v]) => <p key={k} className="whitespace-pre-line"><strong className="text-white">{k.replace(/_/g, ' ')}:</strong> {v}</p>)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Quotes() {
  const rows = useAsync(() => entity('Quote').list(), []);
  const [editing, setEditing] = useState(null);
  if (editing) return <QuoteBuilder quote={editing === 'new' ? undefined : editing} onDone={() => { setEditing(null); rows.reload(); }} />;
  return (
    <div className="space-y-3">
      <button className="btn-primary" onClick={() => setEditing('new')}>New quote</button>
      {rows.loading ? <Spinner /> : !rows.data.length ? <Empty>No quotes or leads yet.</Empty> : rows.data.map((q) => (
        <button key={q.id} onClick={() => setEditing(q)} className="card flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left hover:border-amber-400/60">
          <div>
            <p className="font-semibold">{q.customer_name || 'Unnamed'} · {q.event_type || 'Event'} {q.quote_number && <span className="text-neutral-500">· {q.quote_number}</span>}</p>
            <p className="text-sm text-neutral-400">{q.event_date ? dateLabel(q.event_date) : 'Date TBD'} · {q.customer_email} · via {q.source || 'admin'}</p>
          </div>
          <div className="flex items-center gap-3 text-sm"><span>{money(q.total)}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{q.stage} / {q.contract_status}</span></div>
        </button>
      ))}
    </div>
  );
}

function Messages() {
  const rows = useAsync(() => entity('Message').list(), []);
  const mark = async (m) => { await entity('Message').update(m.id, { status: m.status === 'new' ? 'handled' : 'new' }); rows.reload(); };
  if (rows.loading) return <Spinner />;
  if (!rows.data.length) return <Empty>No messages yet.</Empty>;
  return (
    <div className="space-y-3">
      {rows.data.map((m) => (
        <div key={m.id} className={`card p-5 ${m.status === 'new' ? 'border-amber-400/40' : ''}`}>
          <div className="flex flex-wrap justify-between gap-3">
            <p className="font-semibold">{m.name} <span className="font-normal text-neutral-400">· {m.email} {m.phone && `· ${m.phone}`}</span></p>
            <button className="text-xs text-amber-400" onClick={() => mark(m)}>{m.status === 'new' ? 'Mark handled' : 'Mark new'}</button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">{m.subject} · {new Date(m.created_date).toLocaleString()}</p>
          <p className="mt-3 whitespace-pre-line text-sm text-neutral-300">{m.message}</p>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  useMeta('Admin dashboard');
  const auth = useAsync(() => api.get('/auth/me'), []);
  const [tab, setTab] = useState('Overview');
  const [content, setContent] = useState('ServiceOffering');

  if (auth.loading) return <Section><Spinner /></Section>;
  if (!auth.data?.admin) return <Login onLogin={auth.reload} />;

  const logout = () => { adminToken.set(null); auth.reload(); };

  return (
    <Section>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Admin dashboard</h1>
        <button className="btn-ghost" onClick={logout}><LogOut size={14} /> Sign out</button>
      </div>
      <div className="mb-8 flex flex-wrap gap-2">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'chip-on' : 'chip-off'}>{t}</button>)}</div>
      {tab === 'Overview' && <Overview />}
      {tab === 'Bookings' && <Bookings />}
      {tab === 'Quotes' && <Quotes />}
      {tab === 'Messages' && <Messages />}
      {tab === 'Team' && <EntityManager name="Performer" />}
      {tab === 'Content' && (
        <>
          <p className="mb-4 text-sm text-neutral-400">All customer-facing catalog and pricing lives here — edits apply instantly across the site, packages and the concierge.</p>
          <div className="mb-6 flex flex-wrap gap-2">{CONTENT.map((c) => <button key={c} onClick={() => setContent(c)} className={content === c ? 'chip-on' : 'chip-off'}>{SCHEMAS[c].label}</button>)}</div>
          <EntityManager key={content} name={content} />
        </>
      )}
    </Section>
  );
}
