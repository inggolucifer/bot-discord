import { z } from 'zod';

export const PillSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  count: z.number()
}).nullable();

export const CultivationDataSchema = z.object({
  realm: z.string(),
  stage: z.number().or(z.string()),
  currentQi: z.number(),
  maxQi: z.number(),
  ratePerMinute: z.number(),
  isReadyForBreakthrough: z.boolean(),
  baseSuccessRate: z.number(),
  isMaxLevel: z.boolean(),
  pill: PillSchema.optional()
});

export const BreakthroughResponseSchema = z.object({
  success: z.boolean(),
  isSuccess: z.boolean().optional(),
  message: z.string(),
  error: z.string().optional(),
});

export type CultivationData = z.infer<typeof CultivationDataSchema>;
export type BreakthroughResponse = z.infer<typeof BreakthroughResponseSchema>;
