import { Link } from 'react-router-dom';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { PageHero, Section, Spinner, Empty } from '../components/ui.jsx';

export default function Blog() {
  useMeta('Event Resources', 'Straight answers to common event planning questions.');
  const posts = useAsync(() => entity('BlogPost').list(), []);
  return (
    <>
      <PageHero eyebrow="Event resources" title="Plan smarter. Book better." intro="Plain-language answers to the questions we hear every week." />
      <Section>
        {posts.loading ? <Spinner /> : !posts.data?.length ? <Empty>Articles are on the way.</Empty> : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.data.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="card group overflow-hidden transition hover:border-amber-400/60">
                <img src={p.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                <div className="p-6">
                  <p className="eyebrow">{p.category}</p>
                  <h3 className="mt-2 text-xl font-semibold group-hover:text-amber-400">{p.title}</h3>
                  <p className="mt-2 text-sm text-neutral-400">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
