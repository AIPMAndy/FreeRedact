import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,clamp,normalizeOptions,validateDimensions,textSize,tileSpacing,filenameFor,safeFilename,drawWatermark} from '../src/engine.js';
import {crc32,encodeZip} from '../src/zip.js';

const decoder=new TextDecoder();
test('default preset is 星觉科技 and tile, designed for screenshots',()=>{
 assert.equal(DEFAULTS.text,'星觉科技');assert.equal(DEFAULTS.mode,'tile');assert.equal(DEFAULTS.opacity,15);assert.equal(DEFAULTS.density,1);assert.equal(DEFAULTS.size,3.5);
});
test('normalization clamps all malformed numeric inputs',()=>{
 const o=normalizeOptions({text:' Hi ',mode:'unknown',opacity:200,size:-1,density:100,angle:-999,x:99,y:-10,color:'red'});
 assert.equal(o.text,'Hi');assert.equal(o.mode,'tile');assert.equal(o.opacity,100);assert.equal(o.size,2);
 assert.equal(o.density,4);assert.equal(o.angle,-60);assert.equal(o.x,.98);assert.equal(o.y,.02);assert.equal(o.color,DEFAULTS.color);
 assert.equal(clamp('bad',0,1),0);
});
test('mobile image sizes remain valid but huge images are safely rejected',()=>{
 assert.equal(validateDimensions(1170,2532),null);
 assert.match(validateDimensions(12000,2000),/太大/);
 assert.match(validateDimensions(8500,8500),/太大/);
 assert.match(validateDimensions(0,99),/无效/);
});
test('font size scales with original resolution; denser tiles are closer',()=>{
 assert.ok(textSize(1170,2532,DEFAULTS)>textSize(390,844,DEFAULTS));
 assert.ok(tileSpacing(150,44,{density:4}).stepX<tileSpacing(150,44,{density:1}).stepX);
});
test('filename sanitization prevents unsafe paths',()=>{
 assert.equal(safeFilename('hi/there:1.png'),'hi_there_1');
 assert.equal(filenameFor({name:'截图.png'},1,'image/jpeg'),'02_截图_FreeWatermark.jpg');
});
test('watermark engine draws all modes without leaking canvas state',()=>{
 const ops=[];
 const ctx={save(){ops.push('save')},restore(){ops.push('restore')},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},fillRect(){},translate(){},rotate(){},scale(){},fillText(){ops.push('text')},measureText(){return {width:150}},createLinearGradient(){return {addColorStop(){}}}};
 for(const mode of ['tile','corner','footer','manual']){
  const start=ops.length;drawWatermark(ctx,1170,2532,{...DEFAULTS,mode});
  assert.ok(ops.slice(start).includes('save'));assert.equal(ops.slice(start).filter(x=>x==='save').length,ops.slice(start).filter(x=>x==='restore').length);
 }
});
test('ZIP encodes Chinese filenames and a valid CRC32',async()=>{
 const content=new TextEncoder().encode('hello world');
 assert.equal(crc32(content),0x0d4a1185);
 const zip=encodeZip([{name:'截图_星觉科技.png',bytes:content},{name:'hello.txt',bytes:new Uint8Array([1,2,3])}]);
 const bytes=new Uint8Array(await zip.arrayBuffer());
 const view=new DataView(bytes.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);
 assert.equal(view.getUint16(bytes.length-12,true),2);
 assert.ok(decoder.decode(bytes).includes('截图_星觉科技.png'));
});

test('aesthetic baseline stays airy and uses a medium-weight native font',()=>{
 const ops=[], ctx={
  save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, closePath(){},
  fill(){}, fillRect(){}, translate(){}, rotate(){}, scale(){},
  fillText(text,x,y){ops.push({text,x,y})}, measureText(){return {width:160}},
  createLinearGradient(){return {addColorStop(){}}}, letterSpacing:''
 };
 drawWatermark(ctx,1170,2532,DEFAULTS);
 assert.match(ctx.font,/^500 /,'watermarks use medium, not extra bold font');
 assert.ok(Number.parseFloat(ctx.letterSpacing)>0,'optical spacing is positive');
 assert.ok(ops.length>4&&ops.length<80,'sparse layout uses a controlled number of marks before crop');
 const airy=tileSpacing(160,52,DEFAULTS), dense=tileSpacing(160,52,{density:4});
 assert.ok(airy.stepX>dense.stepX*1.5);
 assert.ok(airy.stepY>dense.stepY*2);
});
