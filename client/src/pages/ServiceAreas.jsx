import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { money } from '../lib/format.js';
import { PageHero, Section, Spinner, Empty } from '../components/ui.jsx';

export default function ServiceAreas() {
  useMeta('Service Areas', 'Delivery, setup and production across the Phoenix metro.');
  const areas = useAsync(() => entity('ServiceArea').list({}, 'city'), []);
  return (
    <>
      <PageHero eyebrow="Service areas" title="Where we show up." intro="Delivery, setup and full production across the Phoenix metro." />
      <Section>
        {areas.loading ? <Spinner /> : !areas.data?.length ? <Empty>No service areas configured yet.</Empty> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {areas.data.map((a) => (
              <Link key={a.id} to={`/service-areas/${a.slug}`} className="card p-6 transition hover:border-amber-400/60">
                <MapPin className="text-amber-400" size={20} />
                <h3 className="mt-3 text-xl font-semibold">{a.city}, {a.state}</h3>
                <p className="mt-1 text-sm text-neutral-400">{a.delivery_fee ? `Delivery from ${money(a.delivery_fee)}` : 'Home base — no travel fee'}</p>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
