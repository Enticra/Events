import { Link, useParams } from 'react-router-dom';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { money } from '../lib/format.js';
import { Checklist, PageHero, Section, Spinner, Empty } from '../components/ui.jsx';

export default function ServiceAreaDetail() {
  const { slug } = useParams();
  const area = useAsync(() => entity('ServiceArea').get(slug), [slug]);
  const a = area.data;
  useMeta(a && `${a.city}, ${a.state}`, a?.headline);

  if (area.loading) return <Section><Spinner /></Section>;
  if (!a) return <Section><Empty>Service area not found.</Empty></Section>;

  return (
    <>
      <PageHero eyebrow={`${a.city}, ${a.state}`} title={a.headline} intro={a.body}>
        <Link to="/build-my-event" className="btn-primary">Build My Event</Link>
        <Link to="/request-quote" className="btn-ghost">Request a quote</Link>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-7">
            <h3 className="mb-4 text-lg font-semibold">Popular venues we work</h3>
            <Checklist items={a.popular_venues || []} />
          </div>
          <div className="card p-7">
            <h3 className="text-lg font-semibold">Delivery</h3>
            <p className="mt-3 text-3xl font-semibold text-amber-400">{a.delivery_fee ? money(a.delivery_fee) : 'No travel fee'}</p>
            <p className="mt-2 text-sm text-neutral-400">Travel fee for {a.city}, on top of the delivery option chosen at checkout.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
