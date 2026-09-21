import type { MatchCandidate, Product, ProductCatalog } from '@rb2/domain';

const products: Product[] = [
  { sku: 'COF-001', ean: '871000000001', name: 'House Blend Coffee 1kg', unit: 'bag', aliases: ['coffee'] },
  { sku: 'MIL-004', ean: '871000000004', name: 'Oat Milk Barista 1L', unit: 'case', aliases: ['oat milk', 'barista oat'] }
];

export class MockCatalog implements ProductCatalog {
  findBySku(sku: string) { return products.find((product) => product.sku === sku); }
  findByEan(ean: string) { return products.find((product) => product.ean === ean); }
  search(description: string): MatchCandidate[] {
    return products.map((product) => ({ product, confidence: product.aliases.some((alias) => description.toLowerCase().includes(alias)) ? .6 : .1, method: 'description' as const, reason: 'test candidate' }));
  }
}
