import { rmSync } from 'node:fs';
import { createApp } from './server.js';
import { config } from './config.js';
if (config.databasePath === '.data/order-intake.db') rmSync(config.databasePath, { force: true });
const app = createApp();
const samples = [
  { sourceId: 'demo-known-001', sourceType: 'text', text: 'Customer: Northwind Cafe\nPO: NW-1001\nCOF-001 House Blend Coffee 1kg x 4\nTEA-002 Earl Grey Tea 100ct x 2' },
  { sourceId: 'demo-review-001', sourceType: 'email', text: 'Customer: Contoso Foods\nPO: CT-2002\nTwo cases of barista oat milk please' }
];
for (const sample of samples) { const r = await app.inject({ method: 'POST', url: '/api/orders', payload: sample }); console.log('INGEST', r.statusCode, r.json()); }
const list = (await app.inject({ method: 'GET', url: '/api/orders' })).json() as { orders: Array<any> }; const review = list.orders.find(o => o.sourceId === 'demo-review-001'); if (review) { const fixed = await app.inject({ method: 'POST', url: `/api/orders/${review.id}/review`, payload: { approve: true, lines: review.lines.map((l:any) => ({ lineId: l.id, sku: 'MIL-004', note: 'Confirmed from demo document' })) } }); console.log('REVIEW', fixed.statusCode, fixed.json()); const exported = await app.inject({ method: 'POST', url: `/api/orders/${review.id}/export` }); console.log('EXPORT', exported.statusCode, exported.json()); }
console.log('METRICS', (await app.inject({ method: 'GET', url: '/api/metrics' })).json()); await app.close();
