import { ExtractionResult, IngestRequest, Order, ReviewDecision, type Clock, type ErpGateway, type IdGenerator, type LlmExtractor, type OrderRepository, type ProductCatalog } from '@rb2/domain';
import { matchLine } from '@rb2/domain';

export class OrderService {
  constructor(private readonly deps: { repo: OrderRepository; catalog: ProductCatalog; llm: LlmExtractor; erp: ErpGateway; clock: Clock; ids: IdGenerator }) {}

  async ingest(input: unknown): Promise<{ order: Order; duplicate: boolean }> {
    const data = IngestRequest.parse(input);
    const existing = this.deps.repo.findBySourceId(data.sourceId);
    if (existing) return { order: existing, duplicate: true };
    let extraction;
    try {
      // A document containing only known identifiers can be parsed without a model call.
      // This makes the cheap, deterministic path observable and keeps provider outages away from it.
      const directLines = data.text.split(/\r?\n/).flatMap((raw) => {
        const found = raw.match(/^\s*[-*]?\s*(?:(\w{3}-\d{3})|(\d{13}))\s+(.+?)(?:\s+x\s*(\d+)|\s+(\d+))?\s*$/i);
        if (!found) return [];
        return [{ sku: found[1], ean: found[2], description: found[3], quantity: Number(found[4] ?? found[5] ?? 1) }];
      });
      if (directLines.length) {
        extraction = ExtractionResult.parse({ customerName: data.text.match(/customer\s*:\s*(.+)/i)?.[1]?.trim(), purchaseOrder: data.text.match(/(?:po|purchase order)\s*[:#]?\s*([\w-]+)/i)?.[1], lines: directLines, warnings: [], provider: 'deterministic' });
      } else {
        extraction = await this.deps.llm.extract(data.text);
        this.deps.repo.recordMetric('llmCalls');
      }
    } catch (error) {
      const now = this.deps.clock.now();
      const failed: Order = { id: this.deps.ids.next('ord'), sourceId: data.sourceId, sourceType: data.sourceType, sourceText: data.text, lines: [], status: 'failed', createdAt: now, updatedAt: now, error: error instanceof Error ? error.message : 'Extraction failed' };
      this.deps.repo.save(failed);
      return { order: failed, duplicate: false };
    }
    const lines = extraction.lines.map((line, index) => {
      const result = matchLine(this.deps.catalog, line);
      if (result.match?.method === 'sku' || result.match?.method === 'ean') this.deps.repo.recordMetric('deterministicMatches');
      return { id: this.deps.ids.next(`line${index + 1}`), rawText: line.description, requestedSku: line.sku, requestedEan: line.ean, description: line.description, quantity: line.quantity, match: result.match, alternatives: result.alternatives, confidence: result.match?.confidence ?? 0 };
    });
    const now = this.deps.clock.now();
    const needsReview = lines.some((line) => !line.match || line.confidence < .93);
    const order: Order = { id: this.deps.ids.next('ord'), sourceId: data.sourceId, sourceType: data.sourceType, sourceText: data.text, customerName: extraction.customerName, purchaseOrder: extraction.purchaseOrder, orderDate: extraction.orderDate, lines, status: needsReview ? 'needs_review' : 'ready', createdAt: now, updatedAt: now };
    this.deps.repo.save(order);
    return { order, duplicate: false };
  }

  review(id: string, input: unknown) {
    const order = this.deps.repo.get(id); if (!order) throw new Error('Order not found');
    const decision = ReviewDecision.parse(input);
    const updated: Order = { ...order, lines: order.lines.map((line) => { const fix = decision.lines.find((item) => item.lineId === line.id); if (!fix) return line; const product = this.deps.catalog.findBySku(fix.sku); if (!product) throw new Error(`Unknown SKU: ${fix.sku}`); return { ...line, match: { product, confidence: 1, method: 'manual', reason: 'Reviewer correction' }, alternatives: [], confidence: 1, correctionNote: fix.note }; }), status: decision.approve ? 'approved' : 'needs_review', approvedAt: decision.approve ? this.deps.clock.now() : undefined, updatedAt: this.deps.clock.now() };
    if (decision.approve && updated.lines.some((line) => !line.match || line.confidence < .93)) {
      throw new Error("Cannot approve while unresolved lines remain");
    }
    this.deps.repo.save(updated); return updated;
  }

  async export(id: string) {
    const order = this.deps.repo.get(id); if (!order) throw new Error('Order not found'); if (order.status === 'exported') return order; if (order.status !== 'approved') throw new Error('Order must be explicitly approved before export');
    try { const result = await this.deps.erp.export(order, order.id); const updated = { ...order, status: 'exported' as const, exportedAt: this.deps.clock.now(), exportReference: result.reference, updatedAt: this.deps.clock.now() }; this.deps.repo.save(updated); return updated; } catch (error) { this.deps.repo.recordMetric('exportFailures'); throw error; }
  }
}





