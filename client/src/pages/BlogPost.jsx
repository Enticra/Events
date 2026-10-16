import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import { ArrowLeft } from 'lucide-react';
import { entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { Section, Spinner, Empty } from '../components/ui.jsx';

export default function BlogPost() {
  const { slug } = useParams();
  const post = useAsync(() => entity('BlogPost').get(slug), [slug]);
  const p = post.data;
  useMeta(p?.title, p?.meta_description);

  if (post.loading) return <Section><Spinner /></Section>;
  if (!p) return <Section><Empty>Article not found.</Empty></Section>;

  return (
    <article className="container-x max-w-3xl py-14">
      <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-amber-400"><ArrowLeft size={14} /> Event Resources</Link>
      <p className="eyebrow mt-8">{p.category}</p>
      <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{p.title}</h1>
      <p className="mt-4 text-lg text-neutral-400">{p.excerpt}</p>
      <img src={p.image_url} alt="" className="mt-8 aspect-[16/9] w-full rounded-3xl object-cover" />
      {/* Post bodies are written by admins in the dashboard, so the markdown is trusted. */}
      <div className="prose-dark mt-6" dangerouslySetInnerHTML={{ __html: marked.parse(p.body || '') }} />
      <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="font-semibold">Ready to price it out?</p>
        <div className="flex gap-3"><Link to="/calculators" className="btn-ghost">Calculators</Link><Link to="/build-my-event" className="btn-primary">Build My Event</Link></div>
      </div>
    </article>
  );
}
