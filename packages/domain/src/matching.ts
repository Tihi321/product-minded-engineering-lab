import type { MatchCandidate, Product } from './types.js';
import type { ProductCatalog } from './ports.js';

export function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }
export function matchLine(catalog: ProductCatalog, input: { sku?: string; ean?: string; description: string }): { match?: MatchCandidate; alternatives: MatchCandidate[] } {
  if (input.sku) { const p = catalog.findBySku(input.sku); if (p) return { match: { product: p, confidence: 1, method: 'sku', reason: 'Exact SKU match' }, alternatives: [] }; }
  if (input.ean) { const p = catalog.findByEan(input.ean); if (p) return { match: { product: p, confidence: 1, method: 'ean', reason: 'Exact EAN match' }, alternatives: [] }; }
  const candidates = catalog.search(input.description);
  return candidates.length === 1 && candidates[0].confidence >= 0.93 ? { match: candidates[0], alternatives: [] } : { match: candidates[0], alternatives: candidates.slice(1), };
}
export function bestProduct(products: Product[], description: string): Product | undefined {
  const n = normalize(description); return products.find(p => normalize(p.name) === n || p.aliases.some(a => normalize(a) === n));
}
