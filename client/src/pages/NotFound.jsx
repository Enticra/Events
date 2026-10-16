import { Link } from 'react-router-dom';
import { useMeta } from '../lib/hooks.js';
import { Section } from '../components/ui.jsx';

export default function NotFound() {
  useMeta('Page Not Found');
  return (
    <Section>
      <div className="py-16 text-center">
        <p className="font-display text-7xl font-bold text-amber-400">404</p>
        <h1 className="mt-4 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-neutral-400">That page doesn’t exist — or it moved.</p>
        <Link to="/" className="btn-primary mt-8">Back to home</Link>
      </div>
    </Section>
  );
}
