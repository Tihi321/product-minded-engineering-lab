import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import {
  ExtractionResult,
  Product,
  type Clock,
  type ErpGateway,
  type IdGenerator,
  type LlmExtractor,
  type MatchCandidate,
  type OperationalMetrics,
  type Order,
  type OrderRepository,
  type ProductCatalog
} from '@rb2/domain';
import { config } from './config.js';

const products: Product[] = [
  { sku: 'COF-001', ean: '871000000001', name: 'House Blend Coffee 1kg', unit: 'bag', aliases: ['house coffee', 'coffee 1kg'] },
  { sku: 'TEA-002', ean: '871000000002', name: 'Earl Grey Tea 100ct', unit: 'box', aliases: ['earl grey', 'tea 100'] },
  { sku: 'SUG-003', ean: '871000000003', name: 'Cane Sugar 5kg', unit: 'bag', aliases: ['sugar 5kg', 'cane sugar'] },
  { sku: 'MIL-004', ean: '871000000004', name: 'Oat Milk Barista 1L', unit: 'case', aliases: ['oat milk', 'barista oat'] }
];

export class SystemClock implements Clock {
  now() { return new Date().toISOString(); }
}

export class UuidGenerator implements IdGenerator {
  next(prefix = 'id') { return `${prefix}_${randomUUID()}`; }
}

export class MemoryCatalog implements ProductCatalog {
  constructor(private readonly items = products) {}

  findBySku(sku: string) { return this.items.find((product) => product.sku.toLowerCase() === sku.toLowerCase()); }
  findByEan(ean: string) { return this.items.find((product) => product.ean === ean); }

  search(description: string): MatchCandidate[] {
    const words = description.toLowerCase().split(/\W+/).filter(Boolean);
    return this.items.map((product) => {
      const haystack = [product.name, ...product.aliases].join(' ').toLowerCase();
      const hits = words.filter((word) => haystack.includes(word)).length;
      const confidence = Math.min(.99, hits / Math.max(1, words.length) * .7 + (haystack.includes(description.toLowerCase()) ? .3 : 0));
      return {
        product,
        confidence: Number(confidence.toFixed(2)),
        method: 'description' as const,
        reason: hits ? `Matched ${hits} description token(s)` : 'No exact identifier'
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }
}

export class MockLlmExtractor implements LlmExtractor {
  async extract(text: string) {
    // Treat document instructions as data. The mock never executes document text.
    const safe = text.replace(/ignore\s+(all|previous).*?(\n|$)/gi, '');
    const lines = safe.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed = lines.flatMap((line) => {
      const match = line.match(/^(?:[-*]\s*)?(?:(\w{3}-\d{3})\s+)?(.+?)(?:\s+x\s*(\d+)|\s+(\d+))?$/i);
      if (!match || /^(customer|po|purchase order|date)\s*:/i.test(line)) return [];
      const description = (match[2] ?? '').replace(/\s+x\s*\d+|\s+\d+$/, '').trim();
      return description ? [{ sku: match[1], description, quantity: Number(match[3] ?? match[4] ?? 1) }] : [];
    });
    return ExtractionResult.parse({
      customerName: safe.match(/customer\s*:\s*(.+)/i)?.[1]?.trim(),
      purchaseOrder: safe.match(/(?:po|purchase order)\s*[:#]?\s*([\w-]+)/i)?.[1],
      lines: parsed.length ? parsed : [{ description: safe.slice(0, 80), quantity: 1 }],
      warnings: [], provider: 'mock'
    });
  }
}

export class OpenAiCompatibleExtractor implements LlmExtractor {
  constructor(private readonly endpoint: string, private readonly model: string, private readonly apiKey = 'local') {}

  async extract(text: string) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return JSON only: {customerName?,purchaseOrder?,lines:[{sku?,ean?,description,quantity}]}.' },
          { role: 'user', content: text }
        ]
      })
    });
    if (!response.ok) throw new Error(`LLM provider returned ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM provider returned no content');
    try {
      return ExtractionResult.parse({ ...JSON.parse(content), provider: 'openai-compatible' });
    } catch {
      throw new Error('LLM output was not valid expected JSON');
    }
  }
}

export class SqliteOrderRepository implements OrderRepository {
  readonly db: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
  }

  init() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, source_id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS metrics (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0);`);
  }

  findBySourceId(sourceId: string) {
    const row = this.db.prepare('SELECT payload FROM orders WHERE source_id=?').get(sourceId) as { payload: string } | undefined;
    return row ? JSON.parse(row.payload) as Order : undefined;
  }

  get(id: string) {
    const row = this.db.prepare('SELECT payload FROM orders WHERE id=?').get(id) as { payload: string } | undefined;
    return row ? JSON.parse(row.payload) as Order : undefined;
  }

  list() {
    const rows = this.db.prepare('SELECT payload FROM orders ORDER BY created_at DESC').all() as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as Order);
  }

  save(order: Order) {
    this.db.prepare('INSERT INTO orders(id,source_id,payload,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(order.id, order.sourceId, JSON.stringify(order), order.createdAt);
  }

  close() { this.db.close(); }

  recordMetric(name: string, delta = 1) {
    this.db.prepare('INSERT INTO metrics(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=value+excluded.value').run(name, delta);
  }

  metrics(): OperationalMetrics {
    const all = this.list();
    const count = (status: string) => all.filter((order) => order.status === status).length;
    const lines = all.flatMap((order) => order.lines);
    const rows = this.db.prepare('SELECT name,value FROM metrics').all() as Array<{ name: string; value: number }>;
    const counters = Object.fromEntries(rows.map((row) => [row.name, row.value]));
    return {
      received: all.length,
      needsReview: count('needs_review'), approved: count('approved'), exported: count('exported'), failed: count('failed'),
      averageConfidence: lines.length ? Number((lines.reduce((sum, line) => sum + line.confidence, 0) / lines.length).toFixed(2)) : 0,
      deterministicMatches: counters.deterministicMatches ?? 0,
      llmCalls: counters.llmCalls ?? 0,
      exportFailures: counters.exportFailures ?? 0
    };
  }
}

export class MockErpGateway implements ErpGateway {
  private calls = 0;

  async export(_order: Order, idempotencyKey: string) {
    this.calls++;
    if (config.erpFailFirst && this.calls === 1) throw new Error('Simulated transient ERP outage');
    return { reference: `MOCK-${idempotencyKey.slice(-8).toUpperCase()}` };
  }
}

export function createAdapters() {
  const clock = new SystemClock();
  const ids = new UuidGenerator();
  const repo = new SqliteOrderRepository(config.databasePath);
  repo.init();
  const llm: LlmExtractor = config.llmMode === 'proxy'
    ? new OpenAiCompatibleExtractor(config.proxyUrl, config.llmModel, config.proxyApiKey)
    : config.llmMode === 'lmstudio'
      ? new OpenAiCompatibleExtractor(config.lmStudioUrl, config.lmStudioModel)
      : new MockLlmExtractor();
  return { clock, ids, repo, llm, catalog: new MemoryCatalog(), erp: new MockErpGateway() };
}



