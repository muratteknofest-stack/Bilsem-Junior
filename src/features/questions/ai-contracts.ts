import {z} from 'zod';
export const aiProviderSchema=z.enum(['gemini','openai','qwen']);export type AiProvider=z.infer<typeof aiProviderSchema>;
export const aiModelSelectionSchema=z.object({provider:aiProviderSchema,model:z.string().regex(/^[a-zA-Z0-9_.:/-]{1,100}$/)}).strict();export type AiModelSelection=z.infer<typeof aiModelSelectionSchema>;
export const aiRoleModelsSchema=z.object({designer:aiModelSelectionSchema,solver:aiModelSelectionSchema,pedagogue:aiModelSelectionSchema}).strict();export type AiRoleModels=z.infer<typeof aiRoleModelsSchema>;export type AiRole=keyof AiRoleModels;
const tokens=z.number().int().nonnegative().nullable();
export const aiUsageCallSchema=z.object({role:z.enum(['designer','solver','pedagogue']),provider:aiProviderSchema,model:z.string(),durationMs:z.number().nonnegative(),inputTokens:tokens,outputTokens:tokens,reasoningTokens:tokens,totalTokens:tokens,estimatedCostUsd:z.number().nonnegative().nullable(),pricingBasis:z.literal('configured-uncached-token-rates').nullable()});export type AiUsageCall=z.infer<typeof aiUsageCallSchema>;
export const aiCapabilitiesSchema=z.object({defaults:aiRoleModelsSchema,providers:z.array(z.object({provider:aiProviderSchema,configured:z.boolean()})),models:z.array(aiModelSelectionSchema),imageGenerationConfigured:z.boolean()});export type AiCapabilities=z.infer<typeof aiCapabilitiesSchema>;
