import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import test from 'node:test';

const path = new URL('../public/motil-rock-master-v1.glb', import.meta.url);

test('Rock Master v1 is the only published hero GLB and stays within its asset budget', async () => {
  const data = await readFile(path);
  assert.ok(data.byteLength > 100_000 && data.byteLength < 1_000_000);
  assert.equal(data.toString('utf8', 0, 4), 'glTF');
  assert.equal(data.readUInt32LE(4), 2);
  assert.equal(data.readUInt32LE(8), data.byteLength);
  assert.equal(existsSync(new URL('../public/motil-rock.glb', import.meta.url)), false);
  assert.equal(existsSync(new URL('../motil-rock.glb', import.meta.url)), false);
});

test('Rock Master v1 has authored vertex color and watertight 360-degree triangles', async () => {
  const data = await readFile(path);
  const jsonLength = data.readUInt32LE(12);
  assert.equal(data.toString('utf8', 16, 20), 'JSON');
  const gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
  const binaryOffset = 20 + jsonLength + 8;
  assert.equal(data.toString('utf8', 20 + jsonLength + 4, binaryOffset), 'BIN\0');
  assert.equal(gltf.asset.version, '2.0');
  assert.ok(gltf.materials?.length > 0);
  const meshPrimitives = gltf.meshes.flatMap((mesh) => mesh.primitives);
  assert.ok(meshPrimitives.length > 0);
  const sectors = Array(8).fill(0);
  const edgeUsage = new Map();
  let faceCount = 0;
  for (const primitive of meshPrimitives) {
    assert.ok(primitive.attributes.COLOR_0 !== undefined, 'color must be stored in the GLB');
    assert.ok(primitive.attributes.NORMAL !== undefined);
    assert.ok(primitive.indices === undefined, 'baseline master uses nonindexed triangles');
    const accessor = gltf.accessors[primitive.attributes.POSITION];
    const view = gltf.bufferViews[accessor.bufferView];
    assert.equal(accessor.componentType, 5126);
    assert.equal(accessor.type, 'VEC3');
    assert.ok(accessor.count % 3 === 0);
    const byteStart = binaryOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const step = view.byteStride ?? 12;
    const vertices = [];
    for (let i = 0; i < accessor.count; i++) {
      const p = byteStart + i * step;
      const v = [data.readFloatLE(p), data.readFloatLE(p + 4), data.readFloatLE(p + 8)];
      assert.ok(v.every(Number.isFinite), 'position must be finite');
      vertices.push(v);
    }
    for (let i = 0; i < vertices.length; i += 3) {
      const [a,b,c] = vertices.slice(i,i+3);
      const ab = b.map((v,j)=>v-a[j]), ac=c.map((v,j)=>v-a[j]);
      const n = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
      const area = Math.hypot(...n);
      assert.ok(area > 1e-12, 'no degenerate triangles');
      const sector = Math.floor((((Math.atan2(n[0],n[2]) + Math.PI*2) % (Math.PI*2)) / (Math.PI*2)) * 8);
      sectors[sector]++;
      const key = (v) => v.map(x => Math.round(x * 100_000)).join(':');
      for (const [u,v] of [[a,b],[b,c],[c,a]]) {
        const edge = [key(u), key(v)].sort().join('|');
        edgeUsage.set(edge, (edgeUsage.get(edge) ?? 0) + 1);
      }
      faceCount++;
    }
  }
  assert.ok(faceCount >= 4000, 'the master must contain sculpted 3D geometry');
  for (const count of sectors) assert.ok(count >= 200, 'full 360-degree normals must be represented');
  for (const used of edgeUsage.values()) assert.equal(used, 2, 'surface must be closed and manifold');
});

test('Copper sulfide lab palette is encoded in the GLB and preserves dark fissures', async () => {
  const data = await readFile(path);
  const jsonLength = data.readUInt32LE(12);
  const gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
  const material = gltf.materials[0].pbrMetallicRoughness;
  assert.equal(gltf.asset.extras?.palette, 'bornite-chalcopyrite-copper-orange-v1');
  assert.equal(gltf.asset.extras?.geometry, 'unchanged');
  assert.equal(material.roughnessFactor, 0.42);
  assert.equal(material.metallicFactor, 0.88);
  const primitive = gltf.meshes[0].primitives[0];
  const accessor = gltf.accessors[primitive.attributes.COLOR_0];
  const offset = 20 + jsonLength + 8 + gltf.bufferViews[accessor.bufferView].byteOffset;
  const stride = gltf.bufferViews[accessor.bufferView].byteStride ?? 16;
  let dark = 0;
  let warmCopper = 0;
  const channelSums = [0, 0, 0];
  for (let i = 0; i < accessor.count; i++) {
    const p = offset + i * stride;
    const color = [data.readFloatLE(p), data.readFloatLE(p + 4), data.readFloatLE(p + 8)];
    const alpha = data.readFloatLE(p + 12);
    for (const c of color) assert.ok(Number.isFinite(c) && c >= 0 && c <= 1);
    assert.equal(alpha, 1);
    for (let c = 0; c < 3; c++) channelSums[c] += color[c];
    const luminance = color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
    if (luminance < 0.075) dark++;
    if (color[0] > 1.8 * color[1] && luminance > 0.13) warmCopper++;
  }
  assert.ok(dark >= 4000, 'retain dark sulfide matrix');
  assert.ok(warmCopper >= 3000, 'copper-orange remains visible across the model');
  assert.ok(channelSums[0] / channelSums[1] > 1.7, 'orange-copper must outweigh flat bronze');
  assert.ok(channelSums[2] / channelSums[0] < 0.40, 'avoid blue-biased highlights');
});
