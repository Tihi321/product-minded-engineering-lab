import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Line = { id: string; description: string; quantity: number; confidence: number; match?: { product: { sku: string; name: string }; reason: string }; alternatives: Array<{ product: { sku: string; name: string } }> };
type Order = { id: string; sourceId: string; customerName?: string; purchaseOrder?: string; status: string; lines: Line[]; sourceText: string; exportReference?: string };
const api = async (url: string, options?: RequestInit) => (await fetch(url, { headers: { 'content-type': 'application/json' }, ...options })).json();

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<any>();
  const [selected, setSelected] = useState<Order>();
  const [sku, setSku] = useState<Record<string, string>>({});
  const refresh = async () => { setOrders((await api('/api/orders')).orders); setMetrics(await api('/api/metrics')); };
  useEffect(() => { refresh(); }, []);
  const approve = async () => {
    if (!selected) return;
    const lines = selected.lines.filter((line) => !line.match || line.confidence < .93).map((line) => ({ lineId: line.id, sku: sku[line.id] || line.match?.product.sku || '', note: 'Confirmed by reviewer' }));
    const updated = await api(`/api/orders/${selected.id}/review`, { method: 'POST', body: JSON.stringify({ approve: true, lines }) });
    setSelected(updated); await refresh();
  };
  const exportOrder = async () => { if (!selected) return; setSelected(await api(`/api/orders/${selected.id}/export`, { method: 'POST' })); await refresh(); };
  return <main>
    <header><div><p className="eyebrow">ORDER INTAKE LAB</p><h1>Review the work. Keep the judgement.</h1><p className="lede">A small, safe-to-approve workflow for unstructured B2B orders.</p></div><div className="metrics">{metrics && <><span><b>{metrics.received}</b> received</span><span><b>{metrics.needsReview}</b> review</span><span><b>{metrics.exported}</b> exported</span></>}</div></header>
    <section className="layout"><aside><h2>Queue</h2>{orders.map((order) => <button className={`order ${selected?.id === order.id ? 'active' : ''}`} onClick={() => setSelected(order)} key={order.id}><span>{order.customerName || 'Unknown customer'}</span><small>{order.purchaseOrder || order.sourceId}</small><em className={order.status}>{order.status.replace('_', ' ')}</em></button>)}</aside>
      <article>{selected ? <><div className="detail-head"><div><p className="eyebrow">{selected.sourceId}</p><h2>{selected.customerName || 'Unidentified customer'}</h2><p>{selected.purchaseOrder || 'No PO'} · {selected.status}</p></div><div><button disabled={selected.status === 'exported'} onClick={approve}>Approve</button><button disabled={selected.status !== 'approved'} onClick={exportOrder}>Export</button></div></div><div className="source"><h3>Original text</h3><pre>{selected.sourceText}</pre></div><h3>Lines</h3>{selected.lines.map((line) => <div className="line" key={line.id}><div><b>{line.description}</b><small>Qty {line.quantity} · {line.match?.product.name || 'No confident match'}</small></div>{(!line.match || line.confidence < .93) && <input value={sku[line.id] || ''} placeholder="SKU e.g. MIL-004" onChange={(event) => setSku({ ...sku, [line.id]: event.target.value })} />}<span className={line.confidence >= .93 ? 'good' : 'warn'}>{Math.round(line.confidence * 100)}%</span></div>)}</> : <div className="empty"><h2>Select an order</h2><p>The original document, proposed matches, and approval controls appear here.</p></div>}</article>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
