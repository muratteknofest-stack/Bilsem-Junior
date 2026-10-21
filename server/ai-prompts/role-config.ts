import {aiModelSelectionSchema,type AiCapabilities,type AiModelSelection,type AiProvider,type AiRoleModels} from '../../src/features/questions/ai-contracts';
import {AI_MODELS} from './ai-config';
const keys:Record<AiProvider,string>={gemini:'GEMINI_API_KEY',openai:'OPENAI_API_KEY',qwen:'QWEN_API_KEY'};
export function aiProviderConfigured(provider:AiProvider):boolean{return !!process.env[keys[provider]]?.trim();}
export function assertAiProviderConfigured(selection:AiModelSelection){aiModelSelectionSchema.parse(selection);if(!aiProviderConfigured(selection.provider))throw Error('AI_NOT_CONFIGURED: Sunucu anahtarı tanımlı değil.');}
function model(role:string,fallback:string):AiModelSelection{return aiModelSelectionSchema.parse({provider:process.env[`AI_PROVIDER_${role}`]||'gemini',model:process.env[`AI_MODEL_${role}`]||fallback});}
export function defaultAiRoleModels():AiRoleModels{return {designer:model('DESIGNER',AI_MODELS.QUESTION_PLANNER),solver:model('SOLVER',AI_MODELS.QUESTION_VALIDATOR),pedagogue:model('PEDAGOGUE',AI_MODELS.QUESTION_VALIDATOR)};}
export function aiCapabilities():AiCapabilities{const defaults=defaultAiRoleModels(),models=[...Object.values(defaults)];if(process.env.OPENAI_TEXT_MODEL)models.push(aiModelSelectionSchema.parse({provider:'openai',model:process.env.OPENAI_TEXT_MODEL}));return {defaults,providers:(['gemini','openai','qwen'] as const).map(provider=>({provider,configured:aiProviderConfigured(provider)})),models:[...new Map(models.map(m=>[m.provider+':'+m.model,m])).values()],imageGenerationConfigured:aiProviderConfigured('openai')&&!!process.env.AI_IMAGE_MODEL};}
export function estimateConfiguredCost(selection:AiModelSelection,input:number|null,output:number|null):number|null{
 if(input===null||output===null)return null;
 try{const raw:unknown=JSON.parse(process.env.AI_MODEL_PRICES_JSON||'{}');if(!raw||typeof raw!=='object')return null;const price=(raw as Record<string,unknown>)[selection.provider+':'+selection.model];if(!price||typeof price!=='object')return null;const {inputPerMillion,outputPerMillion}=price as Record<string,unknown>;return typeof inputPerMillion==='number'&&typeof outputPerMillion==='number'&&Number.isFinite(inputPerMillion)&&Number.isFinite(outputPerMillion)&&inputPerMillion>=0&&outputPerMillion>=0?(input*inputPerMillion+output*outputPerMillion)/1e6:null;}catch{return null;}
}
