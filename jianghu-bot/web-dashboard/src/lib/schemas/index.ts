import { z } from 'zod';

export const PillSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  count: z.number()
}).nullable();

export const UsablePillSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  count: z.number(),
  effectValue: z.number(),
  effectTierGate: z.number(),
  bonusPercent: z.number()
});

export const BreakthroughChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  current: z.number().or(z.string()),
  target: z.number().or(z.string()),
  isMet: z.boolean(),
  required: z.boolean().optional(),
  hint: z.string().optional()
});

export const TribulationWaveDetailSchema = z.object({
  wave: z.number(),
  damage: z.number(),
  survived: z.boolean()
});

export const TribulationInfoSchema = z.object({
  required: z.boolean(),
  title: z.string().optional(),
  tier: z.number().optional(),
  baseDamage: z.number().optional(),
  waveDamages: z.array(z.number()).optional(),
  survivalHp: z.number().optional(),
  maxWaveDmg: z.number().optional(),
  canSurvive: z.boolean().optional()
});

export const CultivationDataSchema = z.object({
  realm: z.string(),
  stage: z.number().or(z.string()),
  realmIdx: z.number().optional(),
  currentQi: z.number(),
  maxQi: z.number(),
  ratePerMinute: z.number(),
  isReadyForBreakthrough: z.boolean(),
  baseSuccessRate: z.number(),
  effectiveSuccessRate: z.number().optional(),
  currentLevel: z.number().optional(),
  currentLevelCap: z.number().optional(),
  isMaxLevelReached: z.boolean().optional(),
  isMajorBreakthrough: z.boolean().optional(),
  canBreakthrough: z.boolean().optional(),
  blockingReasons: z.array(z.string()).optional(),
  breakthroughChecklist: z.array(BreakthroughChecklistItemSchema).optional(),
  tribulationInfo: TribulationInfoSchema.optional(),
  isMaxLevel: z.boolean(),
  penaltyPreview: z.object({
    percent: z.number(),
    qiAmount: z.number()
  }).optional(),
  usablePills: z.array(UsablePillSchema).optional(),
  moodCost: z.number().optional()
});

export const BreakthroughResponseSchema = z.object({
  success: z.boolean(),
  isSuccess: z.boolean().optional(),
  message: z.string(),
  error: z.string().optional(),
  data: z.object({
    realm: z.string().optional(),
    stage: z.number().optional(),
    penalty: z.number().optional(),
    usedBonus: z.number().optional(),
    pillConsumed: z.boolean().optional(),
    tribulation: z.any().optional(),
    newLevelCap: z.number().nullable().optional(),
    isNewRealm: z.boolean().optional()
  }).optional()
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
