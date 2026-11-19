import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Search, X, ArrowRight } from 'lucide-react';
import type { AnatomySearchResult } from '@/data/anatomySearch';
import '../../styles/anatomy-search.css';

const PAGE = 12;
const EXAMPLES = ['vagus nerve', 'psoas', 'thalamus', 'femoral artery', 'scapula'];

type Status = 'idle' | 'loading' | 'done' | 'error';

type Props = { variant?: 'section' | 'dialog'; onNavigate?: () => void; inputRef?: React.RefObject<HTMLInputElement | null>; titleId?: string };

export function AnatomySearch({ variant = 'section', onNavigate, inputRef: extRef, titleId = 'as-title' }: Props = {}) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<AnatomySearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [retry, setRetry] = useState(0);
  const reqId = useRef(0);
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = extRef ?? ownRef;

  const q = query.trim();

  useEffect(() => {
    const id = ++reqId.current;
    if (q.length < 2) { setStatus('idle'); setResults([]); setTotal(0); return; }
    setStatus('loading');
    const t = window.setTimeout(async () => {
      try {
        const mod = await import('@/data/anatomySearch');
        const res = await mod.searchAnatomy(q, limit);
        if (id !== reqId.current) return;
        setResults(res.results); setTotal(res.total); setStatus('done');
      } catch {
        if (id !== reqId.current) return;
        setStatus('error');
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [q, limit, retry]);

  const onChange = (v: string) => { setQuery(v); setLimit(PAGE); };
  const clear = () => { onChange(''); inputRef.current?.focus(); };

  const live =
    status === 'idle' ? (q.length === 1 ? 'Type at least 2 characters' : '')
    : status === 'loading' ? 'Searching'
    : status === 'error' ? 'Search could not be loaded'
    : total === 0 ? `No structures found for ${q}`
    : `Showing ${results.length} of ${total} structure${total === 1 ? '' : 's'}`;

  return (
    <section className={`as${variant === 'dialog' ? ' as-dialog' : ''}`} aria-labelledby={titleId} id={variant === 'section' ? 'search' : undefined} data-testid="section-anatomy-search">
      <div className="as-inner">
        <div className="as-head">
          <p className="hm-kicker">Index of structures</p>
          <h2 id={titleId} className="as-h">Find a structure</h2>
        </div>
        <form role="search" className="as-form" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor={inputId} className="as-label">Search anatomical structures across every atlas</label>
          <div className="as-field">
            <Search size={18} aria-hidden className="as-icon" />
            <input ref={inputRef} id={inputId} type="search" value={query} autoComplete="off" spellCheck={false}
              placeholder="e.g. vagus nerve" onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape' && query) { e.preventDefault(); clear(); } }}
              aria-describedby={`${inputId}-status`} data-testid="input-anatomy-search" />
            {query && (
              <button type="button" className="as-clear" onClick={clear} aria-label="Clear search" data-testid="button-clear-search">
                <X size={16} />
              </button>
            )}
          </div>
          <p id={`${inputId}-status`} className="as-status" role="status" aria-live="polite" data-testid="status-search">{live}</p>
        </form>

        {status === 'idle' && (
          <div className="as-empty">
            <span className="as-mono">Try</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="as-chip" onClick={() => onChange(ex)} data-testid={`button-example-${ex.replace(/\s+/g, '-')}`}>{ex}</button>
            ))}
          </div>
        )}

        {status === 'loading' && results.length === 0 && (
          <ul className="as-list" aria-hidden>
            {[0, 1, 2].map((i) => <li key={i} className="as-skel" />)}
          </ul>
        )}

        {status === 'error' && (
          <div className="as-msg">
            <p>The structure index could not be loaded. Check your connection and try again.</p>
            <button type="button" className="hm-link" onClick={() => setRetry((r) => r + 1)} data-testid="button-retry-search">Retry</button>
          </div>
        )}

        {status === 'done' && total === 0 && (
          <div className="as-msg">
            <p>No catalogued structure matches <b>&ldquo;{q}&rdquo;</b>. Try a shorter term or the Latin or English name.</p>
            <Link href="/atlas" className="hm-link" onClick={onNavigate}>Browse the full atlas <ArrowRight size={14} /></Link>
          </div>
        )}

        {results.length > 0 && status !== 'error' && (
          <>
            <ul className={`as-list${status === 'loading' ? ' is-busy' : ''}`} data-testid="list-search-results">
              {results.map((r) => (
                <li key={r.id} className="as-item" data-testid={`card-structure-${r.id}`}>
                  <h3 className="as-name">{r.name}</h3>
                  <p className="as-mono as-count">{r.destinations.length} location{r.destinations.length === 1 ? '' : 's'}</p>
                  <ul className="as-dests">
                    {r.destinations.map((d, i) => (
                      <li key={`${d.href}-${i}`}>
                        <Link href={d.href} className="as-dest" onClick={onNavigate} data-testid={`link-destination-${r.id}-${i}`}>
                          <span className="as-menu">{d.menuLabel}</span>
                          <span className="as-crumbs">
                            {[d.atlasLabel, ...d.collections].map((c, j) => (
                              <span key={j}>{j > 0 && <span aria-hidden> / </span>}{c}</span>
                            ))}
                          </span>
                          <ArrowRight size={14} aria-hidden className="as-arrow" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="as-foot">
              <p className="as-mono">{results.length} of {total}</p>
              {results.length < total && (
                <button type="button" className="hm-link" onClick={() => setLimit((l) => l + PAGE)} disabled={status === 'loading'} data-testid="button-show-more">
                  Show more structures
                </button>
              )}
            </div>
          </>
        )}
        <p className="as-note">Results reflect catalogued atlas memberships, not live verification of each 3D model.</p>
      </div>
    </section>
  );
}
