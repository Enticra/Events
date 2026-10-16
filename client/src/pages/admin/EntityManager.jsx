import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { entity } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { ErrorNote, Spinner } from '../../components/ui.jsx';
import { SCHEMAS, emptyDoc } from './schemas.js';

const pretty = (k) => k.replace(/_/g, ' ');

function FieldInput({ field, value, onChange }) {
  const [key, type, options] = field;
  if (type === 'bool') return <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-400" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {pretty(key)}</label>;
  const input = {
    textarea: <textarea rows={key === 'body' ? 10 : 3} className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} />,
    list: <textarea rows={3} className="input" placeholder="One per line" value={(value || []).join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))} />,
    number: <input type="number" step="any" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />,
    select: <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{options?.map((o) => <option key={o}>{o}</option>)}</select>,
  }[type] || <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  return <label className="block"><span className="label">{pretty(key)}</span>{input}</label>;
}

/** Table + form CRUD for any entity in SCHEMAS. */
export default function EntityManager({ name }) {
  const schema = SCHEMAS[name];
  const rows = useAsync(() => entity(name).list({}, schema.title), [name]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const save = async () => {
    setError('');
    const data = { ...editing };
    for (const [k, t] of schema.fields) if (t === 'list') data[k] = (data[k] || []).map((s) => s.trim()).filter(Boolean);
    try {
      if (data.id) await entity(name).update(data.id, data); else await entity(name).create(data);
      setEditing(null); rows.reload();
    } catch (e) { setError(e.message); }
  };
  const remove = async (id) => { await entity(name).remove(id); setConfirmId(null); rows.reload(); };

  if (editing) {
    return (
      <div className="card space-y-4 p-6">
        <h3 className="text-lg font-semibold">{editing.id ? `Edit ${editing[schema.title] || ''}` : `New ${schema.label.toLowerCase()} item`}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {schema.fields.map((f) => (
            <div key={f[0]} className={['textarea', 'list'].includes(f[1]) ? 'sm:col-span-2' : ''}>
              <FieldInput field={f} value={editing[f[0]]} onChange={(v) => setEditing({ ...editing, [f[0]]: v })} />
            </div>
          ))}
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-3"><button className="btn-primary" onClick={save}>Save</button><button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
      </div>
    );
  }

  const cols = schema.fields.filter(([k, t]) => k !== schema.title && ['number', 'select', 'bool'].includes(t)).slice(0, 4);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h3 className="font-semibold">{schema.label} <span className="text-neutral-500">({rows.data?.length ?? 0})</span></h3>
        <button className="btn-primary py-2" onClick={() => setEditing(emptyDoc(name))}><Plus size={14} /> Add</button>
      </div>
      {rows.loading ? <div className="px-4"><Spinner /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr><th className="p-3">{pretty(schema.title)}</th>{cols.map(([k]) => <th key={k} className="p-3">{pretty(k)}</th>)}<th /></tr>
            </thead>
            <tbody>
              {(rows.data || []).map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3 font-medium">{r[schema.title]}</td>
                  {cols.map(([k, t]) => <td key={k} className="p-3 text-neutral-400">{t === 'bool' ? (r[k] ? 'Yes' : 'No') : r[k] ?? '—'}</td>)}
                  <td className="whitespace-nowrap p-3 text-right">
                    {confirmId === r.id ? (
                      <span className="space-x-2 text-xs"><span className="text-neutral-400">Delete?</span><button className="text-red-400" onClick={() => remove(r.id)}>Yes</button><button onClick={() => setConfirmId(null)}>No</button></span>
                    ) : (
                      <span className="space-x-3">
                        <button className="text-neutral-400 hover:text-amber-400" onClick={() => setEditing(r)} aria-label="Edit"><Pencil size={15} /></button>
                        <button className="text-neutral-400 hover:text-red-400" onClick={() => setConfirmId(r.id)} aria-label="Delete"><Trash2 size={15} /></button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
