#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './normalize-asset-sheet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PALETTE = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/visual-targets/farm_environment_palette_v1.json'), 'utf8'));
const ALLOWED = new Set(Object.values(PALETTE.families).flat().map((hex) => hex.toUpperCase()));
const SPECS = [
  ['tile_village_shop_wall', ['stone_base','wood_trim','window_lit'], ['stone_base']],
  ['tile_village_shop_door', ['closed','highlighted','open_optional'], []],
  ['tile_village_shop_roof', ['thatch_base','thatch_moss','ridge'], ['thatch_base','thatch_moss']]
];

function rgbaHex(image, offset) {
  return `#${[image.data[offset], image.data[offset+1], image.data[offset+2]].map((n) => n.toString(16).padStart(2,'0')).join('').toUpperCase()}`;
}
function samePixels(a, b) {
  assert.equal(a.width, b.width); assert.equal(a.height, b.height); assert.deepEqual([...a.data], [...b.data]);
}
function cell(sheet, index) {
  const out = { width: 16, height: 16, data: new Uint8Array(16*16*4) };
  for (let y=0;y<16;y+=1) for (let x=0;x<16;x+=1) {
    const src=(y*sheet.width+index*16+x)*4, dst=(y*16+x)*4;
    out.data.set(sheet.data.subarray(src,src+4),dst);
  }
  return out;
}
function seamRatio(image, axis) {
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const p=(x,y)=>{const i=(y*image.width+x)*4;return [image.data[i],image.data[i+1],image.data[i+2]]};
  const wrap=[], internal=[];
  if(axis==='h') for(let y=0;y<image.height;y+=1){wrap.push(dist(p(image.width-1,y),p(0,y)));for(let x=0;x<image.width-1;x+=1)internal.push(dist(p(x,y),p(x+1,y)));}
  else for(let x=0;x<image.width;x+=1){wrap.push(dist(p(x,image.height-1),p(x,0)));for(let y=0;y<image.height-1;y+=1)internal.push(dist(p(x,y),p(x,y+1)));}
  const avg=(v)=>v.reduce((a,b)=>a+b,0)/v.length;
  return avg(wrap)/Math.max(0.0001,avg(internal));
}

let checked=0;
for (const [id, variants, seamless] of SPECS) {
  const packed = readPng(path.join(ROOT,'assets/tilesets',`${id}.png`));
  assert.deepEqual([packed.width,packed.height],[48,16]);
  variants.forEach((variant,index)=>{
    const reviewDir=path.join(ROOT,'docs/art-pipeline/review',`${id}_${variant}`);
    const master=readPng(path.join(reviewDir,`${variant}.approved-runtime-master.png`));
    const normalized=readPng(path.join(reviewDir,`${variant}.review-normalized.png`));
    const source=readPng(path.join(ROOT,'assets/source/generated',id,`${variant}.png`));
    assert.deepEqual([master.width,master.height],[16,16]);
    assert.deepEqual([source.width,source.height],[1024,1024]);
    samePixels(master,normalized); samePixels(master,cell(packed,index));
    for(let i=0;i<master.data.length;i+=4){assert.equal(master.data[i+3],255);assert.ok(ALLOWED.has(rgbaHex(master,i)),`${id}/${variant}: unexpected ${rgbaHex(master,i)}`);}
    for(let y=0;y<1024;y+=1)for(let x=0;x<1024;x+=1){const m=(Math.floor(y/64)*16+Math.floor(x/64))*4,s=(y*1024+x)*4;for(let c=0;c<4;c+=1)assert.equal(source.data[s+c],master.data[m+c]);}
    const report=JSON.parse(fs.readFileSync(path.join(reviewDir,'review.json'),'utf8'));
    assert.equal(report.alpha.opaque,256); assert.equal(report.alpha.partial,0); assert.equal(report.palette.max,0); assert.equal(report.palette.withinTolerance,256);
    assert.match(fs.readFileSync(path.join(reviewDir,'AUDIT.md'),'utf8'),/APPROVED RUNTIME MASTER/);
    if(seamless.includes(variant)){assert.ok(seamRatio(master,'h')<=1.35);assert.ok(seamRatio(master,'v')<=1.35);}
    checked+=1;
  });
}
const contact=readPng(path.join(ROOT,'docs/art-pipeline/review/village_top_gaps/village-top-gaps-contact-sheet.png'));
assert.deepEqual([contact.width,contact.height],[640,640]);
assert.match(fs.readFileSync(path.join(ROOT,'docs/art-pipeline/review/village_top_gaps/AUDIT.md'),'utf8'),/PASS — NINE APPROVED RUNTIME MASTERS/);
const targetDoc=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/visual-targets/farm_village_tile_targets.json'),'utf8'));
assert.deepEqual(targetDoc.targets.find((t)=>t.id==='tile_village_shop_wall').paletteFamilies,['metal','wood_leather']);
assert.deepEqual(targetDoc.targets.find((t)=>t.id==='tile_village_shop_door').paletteFamilies,['wood_leather','metal']);
const roofDoc=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/visual-targets/village_shop_roof_target.json'),'utf8'));
assert.equal(roofDoc.targets[0].id,'tile_village_shop_roof');
assert.deepEqual(roofDoc.targets[0].variants,['thatch_base','thatch_moss','ridge']);
console.log(`Village art tests passed: ${checked} masters + 3 packed families + contact sheet.`);
