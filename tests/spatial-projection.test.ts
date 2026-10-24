import test from 'node:test';
import assert from 'node:assert/strict';
import {connected,generateSpatialProjection,matrixKey,projection,verifySpatialProjection} from '../src/features/questions/spatial-projection';
test('projection orientation is mathematically consistent',()=>{
  const voxels = [[0,0,0],[2,1,2]] as const;
  assert.equal(projection(voxels,3,'FRONT')[2][0],1);
  assert.equal(projection(voxels,3,'RIGHT')[2][2],1);
  assert.equal(projection(voxels,3,'TOP')[0][0],1);
});
test('seeded 3D tasks are reproducible, connected and have exactly one answer',()=>{
  for(let seed=0;seed<300;seed++)for(let difficulty=1;difficulty<=6;difficulty++){
    const task=generateSpatialProjection(seed,difficulty);
    assert.deepEqual(task,generateSpatialProjection(seed,difficulty));
    assert.ok(connected(task.voxels));
    assert.ok(verifySpatialProjection(task));
    assert.equal(new Set(task.options.map(o=>matrixKey(o.matrix))).size,4);
  }
});
test('reject corrupted answer keys and disconnected geometry',()=>{
  const task=generateSpatialProjection(42,3);
  assert.equal(verifySpatialProjection({...task,correctOptionId:'INVALID'}),false);
  assert.equal(connected([[0,0,0],[2,2,2]]),false);
});
