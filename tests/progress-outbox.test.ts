import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressOutbox } from '../src/lib/progress-outbox';
function fixture() {
  const map = new Map<string, string>();
  const storage = { getItem: (k: string) => map.get(k) || null, setItem: (k: string,v: string) => { map.set(k,v); }, removeItem: (k: string) => { map.delete(k); } };
  return { storage, box: new ProgressOutbox(storage, ['scores','mistakes']) };
}
test('pending progress survives a new instance but cannot appear in another account', () => {
  const { storage, box } = fixture(); box.enqueue('a','scores','[1]');
  const reloaded = new ProgressOutbox(storage, ['scores','mistakes']);
  assert.deepEqual(reloaded.patch('a'), { scores: '[1]' }); assert.deepEqual(reloaded.patch('b'), {});
});
test('late acknowledgement cannot remove an edit made during a request, including a reverted value', () => {
  const { box } = fixture(); box.enqueue('a','scores','1'); const sent = box.read('a');
  box.enqueue('a','scores','2'); box.enqueue('a','scores','1'); box.enqueue('a','mistakes',null);
  box.acknowledge('a',sent); assert.deepEqual(box.patch('a'), { scores:'1', mistakes:null });
  box.acknowledge('a',box.read('a')); assert.deepEqual(box.patch('a'), {});
});
test('outbox rejects arbitrary profile/role keys', () => {
  const { box } = fixture(); assert.throws(() => box.enqueue('a','role','admin'));
});

test('storage quota fallback serves latest memory value instead of stale disk data', async()=>{
  const {safeStorage}=await import('../src/lib/storage');
  const original=Object.getOwnPropertyDescriptor(globalThis,'window');
  const disk=new Map<string,string>();let blocked=false;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>disk.get(k)||null,setItem:(k:string,v:string)=>{if(blocked)throw Error('QuotaExceeded');disk.set(k,v);},removeItem:(k:string)=>disk.delete(k)}}});
  try{
    safeStorage.setItem('storage-test','old');blocked=true;
    safeStorage.setItem('storage-test','new');
    assert.equal(safeStorage.getItem('storage-test'),'new');assert.equal(safeStorage.isVolatile('storage-test'),true);
    blocked=false;safeStorage.setItem('storage-test','saved');
    assert.equal(safeStorage.getItem('storage-test'),'saved');assert.equal(safeStorage.isVolatile('storage-test'),false);
    safeStorage.removeItem('storage-test');
  }finally{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');}
});
