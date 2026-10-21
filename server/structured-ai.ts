import {GoogleGenAI} from '@google/genai';import OpenAI from 'openai';import {z} from 'zod';
import {withRequestDeadline} from '../src/lib/request-deadline';
import type {AiModelSelection,AiRole,AiUsageCall} from '../src/features/questions/ai-contracts';
import {assertAiProviderConfigured,estimateConfiguredCost} from './ai-prompts/role-config';
interface AiRequest<T>{selection:AiModelSelection;role:AiRole;schema:z.ZodType<T>;system:string;prompt:string;deadline:number;usage:AiUsageCall[]}
const count=(n:number|undefined)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:null;
/** No automatic retries of billable POSTs. Unknown usage/cost remains null. */
export async function callStructuredAi<T>(r:AiRequest<T>):Promise<T>{
 assertAiProviderConfigured(r.selection);const {provider,model}=r.selection,start=Date.now(),remaining=r.deadline-start;if(remaining<1000)throw Error('REVIEW_BUDGET');
 let inputTokens:number|null=null,outputTokens:number|null=null,reasoningTokens:number|null=null,totalTokens:number|null=null;
 try{return await withRequestDeadline(async signal=>{
  let text:string;const schema=z.toJSONSchema(r.schema);
  if(provider==='gemini'){
   const response=await new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY!}).models.generateContent({model,contents:r.prompt,config:{systemInstruction:r.system,abortSignal:signal,responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:4096}});
   text=response.text||'';inputTokens=count(response.usageMetadata?.promptTokenCount);const generated=count(response.usageMetadata?.candidatesTokenCount);reasoningTokens=count(response.usageMetadata?.thoughtsTokenCount);outputTokens=generated===null?null:generated+(reasoningTokens||0);totalTokens=count(response.usageMetadata?.totalTokenCount);
  }else{
   const client=new OpenAI({apiKey:provider==='openai'?process.env.OPENAI_API_KEY:process.env.QWEN_API_KEY,...(provider==='qwen'?{baseURL:process.env.QWEN_BASE_URL||'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'}:{}),maxRetries:0});
   if(provider==='openai'){
    const response=await client.responses.create({model,store:false,input:[{role:'system',content:r.system},{role:'user',content:r.prompt}],text:{format:{type:'json_schema',name:`bilsem_${r.role}`,strict:true,schema}},max_output_tokens:4096},{signal});
    if(response.status!=='completed')throw Error('AI_INCOMPLETE');text=response.output_text;inputTokens=count(response.usage?.input_tokens);outputTokens=count(response.usage?.output_tokens);reasoningTokens=count(response.usage?.output_tokens_details.reasoning_tokens);totalTokens=count(response.usage?.total_tokens);
   }else{
    const response=await client.chat.completions.create({model,messages:[{role:'system',content:r.system+' JSON şeması: '+JSON.stringify(schema)},{role:'user',content:r.prompt}],response_format:{type:'json_object'},max_tokens:4096},{signal});
    if(response.choices[0]?.finish_reason!=='stop')throw Error('AI_INCOMPLETE');text=response.choices[0]?.message.content||'';inputTokens=count(response.usage?.prompt_tokens);outputTokens=count(response.usage?.completion_tokens);totalTokens=count(response.usage?.total_tokens);
   }
  }
  return r.schema.parse(JSON.parse(text));
 },Math.min(30000,remaining));}finally{const estimatedCostUsd=estimateConfiguredCost(r.selection,inputTokens,outputTokens);r.usage.push({role:r.role,provider,model,durationMs:Date.now()-start,inputTokens,outputTokens,reasoningTokens,totalTokens,estimatedCostUsd,pricingBasis:estimatedCostUsd===null?null:'configured-uncached-token-rates'});}
}
