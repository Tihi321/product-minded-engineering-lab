import type { ExtractionResult, MatchCandidate, OperationalMetrics, Order, Product } from './types.js';

export interface LlmExtractor { extract(text: string): Promise<ExtractionResult>; }
export interface ProductCatalog { findBySku(sku: string): Product | undefined; findByEan(ean: string): Product | undefined; search(description: string): MatchCandidate[]; }
export interface OrderRepository { init(): void; findBySourceId(sourceId: string): Order | undefined; get(id: string): Order | undefined; list(): Order[]; save(order: Order): void; metrics(): OperationalMetrics; recordMetric(name: string, delta?: number): void; }
export interface ErpGateway { export(order: Order, idempotencyKey: string): Promise<{ reference: string }>; }
export interface Clock { now(): string; }
export interface IdGenerator { next(prefix?: string): string; }
