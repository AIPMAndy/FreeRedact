import {boundBox, suggestFromDetections} from './detector.js';

const $ = selector => document.querySelector(selector);
const canvas=$('#canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const source=document.createElement('canvas');
let originalName='screenshot',imageWidth=0,imageHeight=0,boxes=[],history=[],future=[],selected=-1,gesture=null,suggestions=[];
let busy=false;
// Invalidate operations started for a previous image.
let loadRequest=0,imageVersion=0,editVersion=0;
const MAX_SIZE=25*1024*1024,MAX_PIXELS=30_000_000;
const fileInput=$('#fileInput');

function notice(message,type='normal'){
  $('#status').textContent=message;
  $('#status').style.color=type==='error'?'#a13e3e':type==='success'?'#24734c':'#87948a';
}
function hasImage(){return imageWidth>0&&imageHeight>0;}
function cloneBoxes(src=boxes){return src.map(b=>({...b}));}
function snapshot(){editVersion++;history.push(cloneBoxes());if(history.length>70)history.shift();future=[];updateControls();}
function updateControls(){
  $('#undoBtn').disabled=!hasImage()||!history.length;
  $('#redoBtn').disabled=!hasImage()||!future.length;
  $('#clearBtn').disabled=!hasImage()||!boxes.length;
  $('#downloadBtn').disabled=!hasImage()||busy;
  $('#copyBtn').disabled=!hasImage()||busy;
  $('#scanBtn').disabled=!hasImage()||busy;
  $('#regionCount').textContent=String(boxes.length);
  const list=$('#regions');list.replaceChildren();
  if(!boxes.length){const empty=document.createElement('div');empty.className='regions-empty';empty.innerHTML='还没有遮挡区域<br><small>在截图上拖动，画出第一个框</small>';list.append(empty);}
  boxes.forEach((box,i)=>{
    const row=document.createElement('div');row.className='region-row'+(selected===i?' active':'');
    const color=document.createElement('span');color.className='mini-box';
    const name=document.createElement('button');name.className='region-name';name.textContent=`区域 ${i+1} · ${Math.round(box.w)} × ${Math.round(box.h)}`;name.type='button';name.addEventListener('click',()=>{selected=i;render();updateControls();});
    const del=document.createElement('button');del.title=`删除区域 ${i+1}`;del.type='button';del.textContent='×';del.addEventListener('click',()=>{snapshot();boxes.splice(i,1);selected=-1;render();updateControls();});
    row.append(color,name,del);list.append(row);
  });
}
function getBoxForCanvas(box){return boundBox(box,imageWidth,imageHeight,0);}
function render(){
  if(!hasImage())return;
  canvas.width=imageWidth;canvas.height=imageHeight;
  ctx.clearRect(0,0,imageWidth,imageHeight);ctx.drawImage(source,0,0);
  boxes.forEach((raw,i)=>{
    const box=getBoxForCanvas(raw);if(box.w<1||box.h<1)return;
    ctx.fillStyle='#15271d';ctx.fillRect(box.x,box.y,box.w,box.h);
    if(selected===i){const stroke=Math.max(2,Math.round(imageWidth/600));ctx.lineWidth=stroke;ctx.strokeStyle='#66d797';ctx.strokeRect(box.x+stroke/2,box.y+stroke/2,Math.max(0,box.w-stroke),Math.max(0,box.h-stroke));}
  });
  if(gesture&&gesture.kind==='new'){
    const box=normalizeDrag(gesture.startX,gesture.startY,gesture.nowX,gesture.nowY);
    ctx.fillStyle='rgba(29,87,54,.45)';ctx.fillRect(box.x,box.y,box.w,box.h);
    ctx.lineWidth=Math.max(2,imageWidth/500);ctx.strokeStyle='#3caa73';ctx.strokeRect(box.x,box.y,box.w,box.h);
  }
}
function normalizeDrag(x1,y1,x2,y2){return boundBox({x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)},imageWidth,imageHeight);}
function fromPointer(event){const b=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(imageWidth,(event.clientX-b.left)*imageWidth/b.width)),y:Math.max(0,Math.min(imageHeight,(event.clientY-b.top)*imageHeight/b.height))};}
function findHit(point){for(let i=boxes.length-1;i>=0;i--){const b=boxes[i];if(point.x>=b.x&&point.x<=b.x+b.w&&point.y>=b.y&&point.y<=b.y+b.h)return i;}return -1;}
canvas.addEventListener('pointerdown',event=>{
  if(!hasImage()||event.button!==0)return;event.preventDefault();
  // Editing invalidates a pending PNG export, even before pointerup.
  editVersion++;
  const p=fromPointer(event),hit=findHit(p);
  if(hit>=0){selected=hit;gesture={kind:'move',startX:p.x,startY:p.y,origin:{...boxes[hit]},index:hit,changed:false};}
  else{selected=-1;gesture={kind:'new',startX:p.x,startY:p.y,nowX:p.x,nowY:p.y};}
  canvas.setPointerCapture(event.pointerId);render();updateControls();
});
canvas.addEventListener('pointermove',event=>{
  if(!gesture)return;const p=fromPointer(event);
  if(gesture.kind==='new'){gesture.nowX=p.x;gesture.nowY=p.y;}
  else{const dx=p.x-gesture.startX,dy=p.y-gesture.startY;
    const target=boxes[gesture.index];if(target){target.x=Math.round(Math.max(0,Math.min(imageWidth-target.w,gesture.origin.x+dx)));target.y=Math.round(Math.max(0,Math.min(imageHeight-target.h,gesture.origin.y+dy)));gesture.changed=gesture.changed||Math.abs(dx)>1||Math.abs(dy)>1;}}
  render();
});
function cancelGesture(){
  if(!gesture)return;
  const g=gesture;gesture=null;
  if(g.kind==='move'&&boxes[g.index])boxes[g.index]={...g.origin};
  render();updateControls();
}
function endGesture(){if(!gesture)return;
  const g=gesture;gesture=null;
  if(g.kind==='new'){
    const box=normalizeDrag(g.startX,g.startY,g.nowX,g.nowY);
    if(box.w>=5&&box.h>=5){snapshot();boxes.push(box);selected=boxes.length-1;notice('遮挡已添加。请继续检查图中其他敏感信息。','success');}
  } else if(g.changed){history.push(boxes.map((b,i)=>i===g.index?{...g.origin}:{...b}));if(history.length>70)history.shift();future=[];}
  render();updateControls();
}
canvas.addEventListener('pointerup',endGesture);canvas.addEventListener('pointercancel',cancelGesture);
function undo(){if(!history.length)return;editVersion++;future.push(cloneBoxes());boxes=history.pop();selected=-1;render();updateControls();}
function redo(){if(!future.length)return;editVersion++;history.push(cloneBoxes());boxes=future.pop();selected=-1;render();updateControls();}
$('#undoBtn').addEventListener('click',undo);$('#redoBtn').addEventListener('click',redo);
$('#clearBtn').addEventListener('click',()=>{if(!boxes.length)return;snapshot();boxes=[];selected=-1;render();updateControls();notice('已清除所有遮挡；请重新标注敏感区域。');});
document.addEventListener('keydown',event=>{
  const el=document.activeElement;if(el&&['INPUT','TEXTAREA'].includes(el.tagName))return;
  const mod=event.metaKey||event.ctrlKey;
  if(mod&&event.key.toLowerCase()==='z'){event.preventDefault();if(event.shiftKey)redo();else undo();}
  if((event.key==='Delete'||event.key==='Backspace')&&selected>=0){event.preventDefault();snapshot();boxes.splice(selected,1);selected=-1;render();updateControls();}
  if(event.key==='Escape'&&gesture){event.preventDefault();cancelGesture();}
});
function cleanupSuggestions(){suggestions=[];const node=$('#suggestions');if(node)node.remove();}
function resetImage(width,height,name){imageVersion++;imageWidth=width;imageHeight=height;originalName=name||'screenshot';boxes=[];history=[];future=[];selected=-1;gesture=null;cleanupSuggestions();
  $('#emptyState').hidden=true;$('#canvasWrap').hidden=false;
  $('#imageInfo').textContent=`${width} × ${height} px · PNG 导出`;
  render();updateControls();
}
async function openFile(file){
  if(!file)return;
  const requestId=++loadRequest;
  const accepted=['image/png','image/jpeg','image/webp'];if(!accepted.includes(file.type)){notice('仅支持 PNG、JPG、WebP 图片。','error');return;}
  if(file.size>MAX_SIZE){notice('图片超过 25MB，请先压缩后再导入。','error');return;}
  let bitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    if(requestId!==loadRequest)return;
    if(bitmap.width*bitmap.height>MAX_PIXELS){notice('图片像素过大（最多 3000 万像素），请先缩小再处理。','error');return;}
    if(!bitmap.width||!bitmap.height){notice('无法读取此图片。','error');return;}
    source.width=bitmap.width;source.height=bitmap.height;source.getContext('2d',{alpha:false}).drawImage(bitmap,0,0);resetImage(bitmap.width,bitmap.height,file.name.replace(/\.[^/.]+$/,''));
    notice('图片已在本地打开。拖动鼠标或手指来添加实心遮挡框。','success');
  }catch(err){if(requestId===loadRequest){console.error(err);notice('图片解码失败，请尝试另一张 PNG 或 JPG。','error');}}
  finally{if(bitmap)bitmap.close();fileInput.value='';}
}
fileInput.addEventListener('change',()=>openFile(fileInput.files?.[0]));
$('#emptyPick').addEventListener('click',()=>fileInput.click());
const drop=$('#dropZone');
for(const type of ['dragenter','dragover'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('dragging');$('#dropHint').hidden=false;});
for(const type of ['dragleave','drop'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('dragging');$('#dropHint').hidden=true;});
drop.addEventListener('drop',e=>openFile([...e.dataTransfer.files].find(f=>f.type.startsWith('image/'))));
document.addEventListener('paste',event=>{const item=[...event.clipboardData?.items||[]].find(i=>i.type.startsWith('image/'));if(item){event.preventDefault();openFile(item.getAsFile());}});

// Generate demo with entirely fictional examples; no user's data is involved.
$('#demoBtn').addEventListener('click',()=>{
  ++loadRequest;
  const d=document.createElement('canvas');d.width=960;d.height=610;const c=d.getContext('2d');
  c.fillStyle='#f4f6f4';c.fillRect(0,0,960,610);c.fillStyle='#fff';c.beginPath();c.roundRect(62,46,836,510,25);c.fill();
  c.fillStyle='#174b38';c.font='bold 28px Arial';c.fillText('项目沟通记录 · 示例截图',105,109);
  c.fillStyle='#85978a';c.font='20px Arial';c.fillText('这是虚构的演示数据，请在分享真实截图前检查每个细节。',105,149);
  c.strokeStyle='#e9eee9';c.beginPath();c.moveTo(100,176);c.lineTo(858,176);c.stroke();
  const rows=[['客户','张同学'],['电话','13812345678'],['邮箱','demo@example.com'],['工单','FR-2026-0123'],['访问令牌','sk-test_fake0123456789ABCDEFG']];
  rows.forEach((row,i)=>{const y=225+i*62;c.fillStyle='#5a7063';c.font='22px Arial';c.fillText(row[0],111,y);c.fillStyle='#15271d';c.font='bold 22px Arial';c.fillText(row[1],270,y);});
  c.fillStyle='#f0f6ef';c.fillRect(105,510,747,1);
  c.fillStyle='#83978a';c.font='17px Arial';c.fillText('演示数据均为虚构 · 拖框遮挡手机号、邮箱和密钥',107,538);
  source.width=d.width;source.height=d.height;source.getContext('2d',{alpha:false}).drawImage(d,0,0);resetImage(d.width,d.height,'freeredact-demo');
  notice('已加载虚构示例图。试着遮挡手机号、邮箱和密钥。','success');
});

function exportCanvas(){
  const output=document.createElement('canvas');output.width=imageWidth;output.height=imageHeight;
  const out=output.getContext('2d',{alpha:false,willReadFrequently:true});out.drawImage(source,0,0);
  // Opaque masks overwrite the original pixels; no original image layer is retained.
  out.fillStyle='#15271d';
  for(const item of boxes){const b=boundBox(item,imageWidth,imageHeight,3);if(b.w>0&&b.h>0)out.fillRect(b.x,b.y,b.w,b.h);}
  return output;
}
async function exportBlob(){return new Promise((resolve,reject)=>exportCanvas().toBlob(blob=>blob?resolve(blob):reject(new Error('浏览器无法生成 PNG')),'image/png'));}
async function runExport(copy=false){
  if(!hasImage()||busy)return;
  if(gesture){notice('请先结束当前的遮挡操作，再导出。','error');return;}
  if(boxes.length===0){notice('还没有添加任何遮挡框。请先遮挡需要保护的信息，再导出。','error');return;}
  busy=true;updateControls();
  const exportVersion=imageVersion,exportEditVersion=editVersion;
  try{const blob=await exportBlob();
    if(exportVersion!==imageVersion){notice('图片已更换，已取消旧截图的导出。','error');return;}
    if(exportEditVersion!==editVersion){notice('遮挡区域已更改，已取消旧截图的导出。','error');return;}
    if(copy){if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('当前浏览器不支持复制 PNG，请使用下载按钮。');await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      if(exportVersion!==imageVersion||exportEditVersion!==editVersion){notice('复制期间截图或遮挡已更改，剪贴板中可能是旧版本，请勿粘贴并重新复制。','error');return;}
      notice('安全图片已复制到剪贴板，请确认后再分享。','success');}
    else{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='freeredact-safe.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);notice('已生成全新的 PNG 图片。分享前请放大复查所有敏感区域。','success');}
  }catch(err){notice(err.message||'导出失败，请重试。','error');}finally{busy=false;updateControls();}
}
$('#downloadBtn').addEventListener('click',()=>runExport(false));$('#copyBtn').addEventListener('click',()=>runExport(true));

function paintSuggestions(items){
  cleanupSuggestions();suggestions=items;
  const outer=document.createElement('div');outer.id='suggestions';outer.className='suggestions';
  const h=document.createElement('p');h.textContent=`识别到 ${items.length} 个待确认区域（仅列类型，不展示原文）`;
  outer.append(h);
  items.forEach((item,i)=>{
    const row=document.createElement('div');row.className='region-row';
    const text=document.createElement('span');text.textContent=item.category;text.style.flex='1';
    const btn=document.createElement('button');btn.textContent='遮挡';btn.style.fontSize='12px';btn.addEventListener('click',()=>{snapshot();boxes.push({x:item.x,y:item.y,w:item.w,h:item.h});selected=boxes.length-1;suggestions=suggestions.filter(x=>x!==item);paintSuggestions(suggestions);render();updateControls();notice('已添加建议区域，请检查其覆盖范围。','success');});row.append(text,btn);outer.append(row);
  });
  if(items.length){const all=document.createElement('button');all.className='btn btn-outline';all.textContent='确认并遮挡全部建议';all.addEventListener('click',()=>{snapshot();boxes.push(...suggestions.map(({x,y,w,h})=>({x,y,w,h})));selected=-1;cleanupSuggestions();render();updateControls();notice('已应用全部建议；自动识别可能漏检，仍需人工检查。','success');});outer.append(all);}
  $('.auto-block').append(outer);
}
$('#scanBtn').addEventListener('click',async()=>{
  if(!hasImage()||busy)return;
  if(typeof window.TextDetector!=='function'){
    notice('当前浏览器没有本地文字识别接口，自动识别不可用。你仍可完整使用手动遮挡功能。','error');return;
  }
  busy=true;updateControls();
  const scanVersion=imageVersion;
  notice('正在尝试通过浏览器内置接口识别文字；图片不会上传…');
  try{
    const detector=new window.TextDetector();const found=await detector.detect(source);
    if(scanVersion!==imageVersion)return;
    const candidates=suggestFromDetections(found,imageWidth,imageHeight);
    if(!candidates.length){cleanupSuggestions();notice('没有发现明显的敏感文字。注意：识别可能漏检，请手动检查。');}
    else{paintSuggestions(candidates);notice(`发现 ${candidates.length} 个候选区域，确认后才会加入遮挡。`);}
  }catch(err){if(scanVersion===imageVersion){console.error(err);notice('本机文字识别失败，请使用手动遮挡。','error');}}
  finally{busy=false;updateControls();}
});
updateControls();

/* Optional author contact uses browser clipboard only: no third-party calls. */
const wechatCopyButton=document.getElementById('copyWechatBtn');
const wechatCopyStatus=document.getElementById('copyWechatStatus');
if(wechatCopyButton&&wechatCopyStatus){
  wechatCopyButton.addEventListener('click',async()=>{
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText('AIPMAndy');
      wechatCopyStatus.textContent='已复制微信号 AIPMAndy';
    }catch{
      wechatCopyStatus.textContent='复制未成功，请长按微信号 AIPMAndy 手动复制。';
    }
  });
}
