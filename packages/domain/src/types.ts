import { z } from 'zod';

export const WorkflowStatus = z.enum(['received', 'processing', 'needs_review', 'ready', 'approved', 'exported', 'failed']);
export type WorkflowStatus = z.infer<typeof WorkflowStatus>;
export const SourceType = z.enum(['email', 'pdf', 'csv', 'text', 'other']);
export type SourceType = z.infer<typeof SourceType>;

export const Product = z.object({
  sku: z.string(), ean: z.string().optional(), name: z.string(), unit: z.string().default('each'),
  aliases: z.array(z.string()).default([])
});
export type Product = z.infer<typeof Product>;

export const MatchCandidate = z.object({
  product: Product, confidence: z.number().min(0).max(1), method: z.enum(['sku', 'ean', 'description', 'llm', 'manual']), reason: z.string()
});
export type MatchCandidate = z.infer<typeof MatchCandidate>;

export const OrderLine = z.object({
  id: z.string(), rawText: z.string(), requestedSku: z.string().optional(), requestedEan: z.string().optional(),
  description: z.string(), quantity: z.number().positive(), match: MatchCandidate.optional(), alternatives: z.array(MatchCandidate).default([]),
  confidence: z.number().min(0).max(1).default(0), correctionNote: z.string().optional()
});
export type OrderLine = z.infer<typeof OrderLine>;

export const Order = z.object({
  id: z.string(), sourceId: z.string(), sourceType: SourceType, sourceText: z.string(), customerName: z.string().optional(),
  purchaseOrder: z.string().optional(), orderDate: z.string().optional(), lines: z.array(OrderLine), status: WorkflowStatus,
  createdAt: z.string(), updatedAt: z.string(), approvedAt: z.string().optional(), exportedAt: z.string().optional(),
  exportReference: z.string().optional(), error: z.string().optional()
});
export type Order = z.infer<typeof Order>;

export const ExtractionLine = z.object({ sku: z.string().optional(), ean: z.string().optional(), description: z.string(), quantity: z.number().positive() });
export const ExtractionResult = z.object({ customerName: z.string().optional(), purchaseOrder: z.string().optional(), orderDate: z.string().optional(), lines: z.array(ExtractionLine), warnings: z.array(z.string()).default([]), provider: z.string() });
export type ExtractionResult = z.infer<typeof ExtractionResult>;

export const ReviewDecision = z.object({
  lines: z.array(z.object({ lineId: z.string(), sku: z.string(), note: z.string().optional() })).default([]),
  approve: z.boolean()
});
export type ReviewDecision = z.infer<typeof ReviewDecision>;

export const DomainEvent = z.object({ id: z.string(), type: z.string(), orderId: z.string(), at: z.string(), data: z.record(z.unknown()).default({}) });
export type DomainEvent = z.infer<typeof DomainEvent>;

export const OperationalMetrics = z.object({ received: z.number(), needsReview: z.number(), approved: z.number(), exported: z.number(), failed: z.number(), averageConfidence: z.number(), deterministicMatches: z.number(), llmCalls: z.number(), exportFailures: z.number() });
export type OperationalMetrics = z.infer<typeof OperationalMetrics>;

export const IngestRequest = z.object({ sourceId: z.string().min(1), sourceType: SourceType, text: z.string().min(1) });
export type IngestRequest = z.infer<typeof IngestRequest>;
