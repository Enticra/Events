import { useState } from 'react';
import { api } from '../lib/api.js';
import { useMeta } from '../lib/hooks.js';
import { dateLabel } from '../lib/format.js';
import { ErrorNote, Field, PageHero, Section } from '../components/ui.jsx';

const FIELDS = [
  ['timeline', 'Timeline', 'Grand entrance 7:00, dinner 7:15, toasts 8:00…'],
  ['entrances', 'Entrances (names & order)', 'Parents, wedding party pairs, couple…'],
  ['first_dance', 'First dance / special dances', 'Song title and artist for each dance'],
  ['must_play', 'Must-play songs', 'One per line'],
  ['do_not_play', 'Do-not-play songs', 'One per line'],
  ['announcements', 'Announcements', 'Pronunciations, toasts, last call…'],
  ['cultural', 'Cultural requirements', 'Baraat timing, Sangeet performances, ceremony rituals…'],
  ['notes', 'Anything else for your DJ', ''],
];

export default function DjPortal() {
  useMeta('DJ Client Portal', 'Send your timeline, entrances and song requests to your DJ.');
  const [lookup, setLookup] = useState({ email: '', event_date: '' });
  const [bookings, setBookings] = useState(null);
  const [active, setActive] = useState(null);
  const [details, setDetails] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const find = async (e) => {
    e.preventDefault(); setError(''); setActive(null);
    try {
      const list = await api.post('/portal/lookup', lookup);
      setBookings(list);
      if (list.length === 1) open(list[0]);
    } catch (err) { setError(err.message); }
  };
  const open = (b) => { setActive(b); setDetails(b.dj_details || {}); setStatus(''); };
  const save = async () => {
    setError(''); setStatus('');
    try { await api.put(`/portal/${active.id}`, { email: lookup.email, dj_details: details }); setStatus('Saved — your DJ has it.'); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHero eyebrow="DJ client portal" title="Your event, in your words." intro="Timeline, entrances, first dance, must-plays and do-not-plays, announcements and traditions — send it all to your DJ." />
      <Section>
        <form onSubmit={find} className="card mx-auto flex max-w-3xl flex-col gap-4 p-6 sm:flex-row sm:items-end">
          <Field label="Booking email" className="flex-1"><input required type="email" className="input" value={lookup.email} onChange={(e) => setLookup({ ...lookup, email: e.target.value })} /></Field>
          <Field label="Event date"><input required type="date" className="input" value={lookup.event_date} onChange={(e) => setLookup({ ...lookup, event_date: e.target.value })} /></Field>
          <button className="btn-primary">Find my event</button>
        </form>
        <div className="mx-auto mt-4 max-w-3xl"><ErrorNote>{error}</ErrorNote></div>

        {bookings && !bookings.length && <p className="mt-6 text-center text-neutral-400">No bookings found for that email and date.</p>}
        {bookings?.length > 1 && !active && (
          <div className="mx-auto mt-6 max-w-3xl space-y-3">
            {bookings.map((b) => <button key={b.id} onClick={() => open(b)} className="card block w-full p-5 text-left hover:border-amber-400">{b.event_type} · {dateLabel(b.event_date)} {b.venue_name && `· ${b.venue_name}`}</button>)}
          </div>
        )}

        {active && (
          <div className="card mx-auto mt-8 max-w-3xl space-y-5 p-6 sm:p-8">
            <div>
              <p className="eyebrow">Event details for your DJ</p>
              <h2 className="mt-2 text-2xl font-semibold">{active.event_type} · {dateLabel(active.event_date)}</h2>
            </div>
            {FIELDS.map(([k, label, ph]) => (
              <Field key={k} label={label}><textarea rows={k === 'timeline' ? 4 : 3} className="input" placeholder={ph} value={details[k] || ''} onChange={(e) => setDetails({ ...details, [k]: e.target.value })} /></Field>
            ))}
            {status && <p className="text-sm text-emerald-400">{status}</p>}
            <button className="btn-primary" onClick={save}>Save details</button>
          </div>
        )}
      </Section>
    </>
  );
}
