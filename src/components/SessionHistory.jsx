import { Copy, Eye, EyeOff, RotateCcw, Trash2, Clock3 } from 'lucide-react';
import { useState } from 'react';

export default function SessionHistory({ history, onCopy, onDelete, onClear, onReuse }) {
  const [visibleIds, setVisibleIds] = useState(() => new Set());

  const toggle = (id) => setVisibleIds((previous) => {
    const next = new Set(previous);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <section className="panel history-panel" id="history" aria-labelledby="history-title">
      <div className="history-header">
        <div className="section-heading">
          <div className="icon-box"><Clock3 size={19} /></div>
          <div><span className="eyebrow">Temporary storage</span><h2 id="history-title">Session History</h2></div>
        </div>
        <button className="ghost-button danger" onClick={onClear} disabled={!history.length}><Trash2 size={16} />Clear History</button>
      </div>
      <p className="muted">Latest {Math.min(history.length, 12)} generated credentials. This app stores them only in this tab/session&apos;s <code>sessionStorage</code>, with a maximum of 12 entries.</p>
      {!history.length ? (
        <div className="empty-state">No generated credentials in this session yet.</div>
      ) : (
        <div className="history-list">
          {history.map((item) => {
            const revealed = visibleIds.has(item.id);
            return (
              <article className="history-item" key={item.id}>
                <div className="history-main">
                  <code aria-label={revealed ? 'Revealed generated credential' : 'Hidden generated credential'}>{revealed ? item.value : '•'.repeat(Math.min(Array.from(item.value).length, 28))}</code>
                  <div className="history-meta"><span>{item.length} chars</span><span>{item.strength}</span><span>{item.time}</span></div>
                </div>
                <div className="history-actions" aria-label="History item actions">
                  <button aria-label={revealed ? 'Hide credential' : 'Reveal credential'} onClick={() => toggle(item.id)}>{revealed ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  <button aria-label="Copy credential" onClick={() => onCopy(item.value)}><Copy size={16} /></button>
                  {item.settings && <button aria-label="Reuse generation settings" onClick={() => onReuse(item.settings)}><RotateCcw size={16} /></button>}
                  <button aria-label="Delete history item" onClick={() => onDelete(item.id)}><Trash2 size={16} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <small className="history-lifecycle">Normal reloads keep the current tab&apos;s sessionStorage. Closing the tab ends the page session, although browser session-restore behavior can vary.</small>
    </section>
  );
}
