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


export const LawSchema = z.object({
  _id: z.string(),
  name: z.string(),
  element: z.string().optional(),
  description: z.string().optional(),
  multiplierBonus: z.object({
      hp: z.number().optional(),
      atk: z.number().optional(),
      def: z.number().optional(),
      spd: z.number().optional(),
  }).optional()
});

export const OracleEconomySchema = z.object({
  copper: z.number(),
  silver: z.number(),
  gold: z.number(),
  jade: z.number(),
  spirit: z.number(),
});

export const OracleResponseSchema = z.object({
  totalPlayers: z.number(),
  totalSects: z.number(),
  totalWealth: z.number(),
  economy: OracleEconomySchema,
  topSects: z.array(z.any()),
  topPlayers: z.array(z.any()),
});

export type LawData = z.infer<typeof LawSchema>;
export type OracleData = z.infer<typeof OracleResponseSchema>;
