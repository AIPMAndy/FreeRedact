import {DEFAULTS,normalizeOptions,drawWatermark,validateDimensions,MAX_FILE_BYTES,MAX_TOTAL_BYTES,MAX_ITEMS,filenameFor,mimeExtension,clamp} from './engine.js';
import {encodeZip} from './zip.js';

const $ = (id) => document.getElementById(id);
const state = { files: [], selected: -1, selectedImage: null, logo: null, options: {...DEFAULTS}, revision: 0, busy: false, lastToastTimer: null, renderQueued: false };
const canShareFiles = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
const input = $('fileInput'), logoInput = $('logoInput'), preview = $('previewCanvas'), pctx = preview.getContext('2d',{alpha:true});

function toast(message) {
  const node=$('toast');node.textContent=message;node.hidden=false;
  clearTimeout(state.lastToastTimer);
  state.lastToastTimer=setTimeout(()=>{node.hidden=true},4400);
}
function saveSettings(){try{localStorage.setItem('freewatermark-settings-v1',JSON.stringify(state.options))}catch{}}
function loadSettings(){try{const raw=localStorage.getItem('freewatermark-settings-v1');if(raw)state.options=normalizeOptions(JSON.parse(raw));}catch{}}
function updateButtons(){
  const available=state.selectedImage!==null&&!state.busy;
  for(const id of ['downloadBtn','shareBtn','mobileExportBtn'])$(id).disabled=!available;
  $('batchBtn').hidden=state.files.length<2;
  $('batchBtn').disabled=!available;
  $('batchCount').textContent=`（${state.files.length} 张）`;
  $('mobileFileCount').textContent=state.files.length?`已选 ${state.files.length} 张 · ${state.options.text||'Logo 水印'}`:'选择截图开始';
  $('downloadBtn').textContent=state.busy?'正在生成…':'下载图片';
  // Button contains an SVG in initial HTML, but textContent change is deliberately text-only.
  $('batchBtn').textContent=state.busy?'正在打包…':`批量打包 ZIP（${state.files.length} 张）`;
}
function setBusy(flag){state.busy=flag;updateButtons();}
function updateSettingsUI(){
  $('watermarkText').value=state.options.text;
  for(const id of ['opacity','size','density','angle'])$(id).value=state.options[id];
  $('opacityValue').textContent=state.options.opacity+'%';
  $('sizeValue').textContent=state.options.size+'%';
  $('densityValue').textContent=['','稀疏','适中','密集','更密'][state.options.density];
  $('angleValue').textContent=state.options.angle+'°';
  for(const b of document.querySelectorAll('[data-preset]')){let selected=b.dataset.preset===state.options.text;
    if(b.dataset.preset==='custom')selected=!['星觉科技','安迪星觉','AI 酋长 Andy'].includes(state.options.text);
    b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));
  }
  for(const b of document.querySelectorAll('[data-mode]')){const selected=b.dataset.mode===state.options.mode;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))}
  const labels={'#111827':'深色','#ffffff':'白色','#5c62e8':'蓝紫色'};
  $('colorValue').textContent=labels[state.options.color]||'自定义';
  for(const b of document.querySelectorAll('[data-color]')){const selected=b.dataset.color===state.options.color;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))}
  $('densityRow').hidden=state.options.mode!=='tile';
  $('angleRow').hidden=state.options.mode==='footer'||state.options.mode==='corner';
  $('dragHint').hidden=state.options.mode!=='manual'||!state.selectedImage;
  preview.classList.toggle('drag-enabled',state.options.mode==='manual');
  updateButtons();
}
function updateSettings(patch){state.options=normalizeOptions({...state.options,...patch});saveSettings();updateSettingsUI();requestRender()}
function requestRender(){if(state.renderQueued)return;state.renderQueued=true;requestAnimationFrame(()=>{state.renderQueued=false;renderPreview()})}
function renderPreview(){
  if(!state.selectedImage)return;
  const img=state.selectedImage;
  const naturalWidth=img.naturalWidth||img.width,naturalHeight=img.naturalHeight||img.height;
  const maxEdge=1150,ratio=Math.min(1,maxEdge/Math.max(naturalWidth,naturalHeight));
  const w=Math.max(1,Math.round(naturalWidth*ratio)),h=Math.max(1,Math.round(naturalHeight*ratio));
  if(preview.width!==w||preview.height!==h){preview.width=w;preview.height=h}
  pctx.clearRect(0,0,w,h);pctx.drawImage(img,0,0,w,h);
  drawWatermark(pctx,w,h,state.options,state.logo);
}
function supportedImage(file){const ok=/\.(png|jpe?g|webp|heic|heif|avif)$/i.test(file.name);return (file.type.startsWith('image/')&&file.type!=='image/svg+xml')||(!file.type&&ok)}
function decodeImage(file){return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();let done=false;
  const finish=(err)=>{if(done)return;done=true;URL.revokeObjectURL(url);if(err)reject(err);else resolve(img)};
  img.onload=()=>finish(null);
  img.onerror=()=>finish(new Error(`无法读取「${file.name}」。当前浏览器可能不支持此图片格式，请先转换成 PNG 或 JPG。`));
  img.src=url;
});}
function updateFileUI(){
  $('fileRow').hidden=state.files.length===0;
  $('fileCount').textContent=`已选择 ${state.files.length} 张`;
  const wrap=$('fileChips');wrap.replaceChildren();
  for(let i=0;i<state.files.length;i++){
    const f=state.files[i],button=document.createElement('button');button.type='button';button.className='file-chip'+(state.selected===i?' active':'');button.setAttribute('role','listitem');button.setAttribute('aria-label',`查看第 ${i+1} 张图片：${f.name}`);
    const icon=document.createElement('span');icon.textContent='▧';icon.style.flexShrink='0';const text=document.createElement('span');text.textContent=f.name;
    button.append(icon,text);button.addEventListener('click',()=>selectFile(i));wrap.append(button);
  }
  updateButtons();
}
async function selectFile(index){
  if(state.busy||index<0||index>=state.files.length)return;
  state.selected=index;state.selectedImage=null;
  const rev=++state.revision;
  $('emptyPreview').hidden=false;preview.hidden=true;
  $('imageMeta').textContent='读取中…';updateFileUI();updateSettingsUI();
  try{
    const file=state.files[index],img=await decodeImage(file);
    if(rev!==state.revision)return;
    const err=validateDimensions(img.naturalWidth,img.naturalHeight);
    if(err)throw Error(err);
    state.selectedImage=img;
    $('emptyPreview').hidden=true;preview.hidden=false;
    $('imageMeta').textContent=`${img.naturalWidth} × ${img.naturalHeight} px · ${formatBytes(file.size)}`;
    renderPreview();updateSettingsUI();
  }catch(err){if(rev===state.revision){$('imageMeta').textContent='图片读取失败';toast(err.message||'图片读取失败，请更换图片');updateButtons();}}
}
function formatBytes(bytes){return bytes>1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.round(bytes/1024)} KB`}
async function addFiles(list){
  if(state.busy)return;
  const existing=state.files.reduce((sum,file)=>sum+file.size,0);
  let total=existing,added=0,errors=[];
  for(const file of Array.from(list||[])){
    if(state.files.length>=MAX_ITEMS){errors.push(`最多 ${MAX_ITEMS} 张`);break}
    if(!supportedImage(file)){errors.push('忽略了非图片文件');continue}
    if(file.size>MAX_FILE_BYTES){errors.push(`「${file.name}」超过单张 30 MB 限制`);continue}
    if(total+file.size>MAX_TOTAL_BYTES){errors.push('图片总大小最多 90 MB');break}
    state.files.push(file);total+=file.size;added++;
  }
  if(added){updateFileUI();await selectFile(state.files.length-added)}
  if(errors.length)toast([...new Set(errors)].join('；'));
  else if(added>1)toast(`已添加 ${added} 张图片，所有图片会共用当前水印设置`);
}
function clearFiles(){if(state.busy)return;state.files=[];state.selected=-1;state.selectedImage=null;state.revision++;
  preview.hidden=true;$('emptyPreview').hidden=false;$('imageMeta').textContent='尚未选择图片';input.value='';updateFileUI();updateSettingsUI()}
function demoFile(){
  const c=document.createElement('canvas');c.width=900;c.height=1410;
  const x=c.getContext('2d');x.fillStyle='#f7f8fa';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#fff';x.fillRect(0,0,900,96);x.fillStyle='#222632';x.font='800 32px sans-serif';x.fillText('创作者工作台',52,65);
  x.fillStyle='#a5a9b0';x.font='20px sans-serif';x.fillText('WORKSPACE / DEMO',630,62);
  x.fillStyle='#141820';x.beginPath();x.roundRect(45,145,810,420,26);x.fill();
  x.fillStyle='#aea8ff';x.font='700 21px sans-serif';x.fillText('CREATOR NOTE   /   001',92,223);
  x.fillStyle='#fff';x.font='800 76px sans-serif';x.fillText('用 AI 做内容，',90,348);x.fillText('别忘了留下署名。',90,445);
  x.fillStyle='#959aab';x.font='23px sans-serif';x.fillText('把自己的原创，变成可积累的品牌资产。',94,515);
  x.fillStyle='#191d27';x.font='800 37px sans-serif';x.fillText('一张截图的价值，远不止一张图。',54,664);
  x.fillStyle='#717783';x.font='24px sans-serif';
  const lines=['01  有价值的信息，被别人看到。','02  让读者知道，是谁创造了它。','03  让每次传播，都成为你的品牌触点。'];
  lines.forEach((line,i)=>{x.fillStyle='#fff';x.beginPath();x.roundRect(48,714+i*122,802,102,15);x.fill();x.fillStyle='#404652';x.fillText(line,82,781+i*122)});
  x.fillStyle='#dce0e7';x.fillRect(50,1140,800,1);x.fillStyle='#242832';x.font='800 29px sans-serif';x.fillText('FreeWatermark',54,1204);
  x.fillStyle='#9499a5';x.font='22px sans-serif';x.fillText('免费加水印 · 原图不上传 · 开源',54,1250);
  x.fillStyle='#8186d6';x.font='24px sans-serif';x.fillText('AI 酋长 Andy · 星觉科技',54,1350);
  return new Promise(resolve=>c.toBlob(blob=>resolve(new File([blob],`示例截图.png`,{type:'image/png'})),'image/png'));
}
function pickImages(){input.click()}
function bindEvents(){
  $('selectBtn').addEventListener('click',pickImages);$('emptySelectBtn').addEventListener('click',pickImages);$('addMoreBtn').addEventListener('click',pickImages);
  input.addEventListener('change',async(e)=>{await addFiles(e.target.files);input.value=''});
  $('demoBtn').addEventListener('click',async()=>{const f=await demoFile();await addFiles([f])});
  $('emptyDemoBtn').addEventListener('click',async()=>{const f=await demoFile();await addFiles([f])});
  $('clearFilesBtn').addEventListener('click',clearFiles);
  $('dropzone').addEventListener('dragover',e=>{e.preventDefault();$('dropzone').classList.add('drag-over')});
  $('dropzone').addEventListener('dragleave',()=>{$('dropzone').classList.remove('drag-over')});
  $('dropzone').addEventListener('drop',async(e)=>{e.preventDefault();$('dropzone').classList.remove('drag-over');await addFiles(e.dataTransfer.files)});
  window.addEventListener('paste',e=>{const files=[...(e.clipboardData?.files||[])].filter(supportedImage);if(files.length){e.preventDefault();addFiles(files)}});
  for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>updateSettings({text:b.dataset.preset==='custom'?'':b.dataset.preset}));
  $('watermarkText').addEventListener('input',e=>updateSettings({text:e.target.value}));
  for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{
    const mode=b.dataset.mode;
    updateSettings({mode, opacity:mode==='corner'?95:mode==='footer'?90:mode==='manual'?55:24});
    if(mode==='manual')toast('自由拖动已开启：在图片上按住并移动水印');
  });
  for(const id of ['opacity','size','density','angle'])$(id).addEventListener('input',e=>updateSettings({[id]:Number(e.target.value)}));
  for(const b of document.querySelectorAll('[data-color]'))b.addEventListener('click',()=>updateSettings({color:b.dataset.color}));
  $('logoBtn').addEventListener('click',()=>logoInput.click());
  logoInput.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>6*1024*1024){toast('Logo 请使用 6 MB 内的 PNG、JPG 或 WebP 图片');return}
    try{const img=await decodeImage(file);if(validateDimensions(img.naturalWidth,img.naturalHeight))throw Error('Logo 分辨率过高');state.logo=img;$('logoName').textContent=file.name;$('removeLogoBtn').hidden=false;requestRender();toast('Logo 已添加；水印文字仍可随时切换');}
    catch(err){toast(err.message||'Logo 无法读取')}
    logoInput.value='';
  });
  $('removeLogoBtn').addEventListener('click',()=>{state.logo=null;$('logoName').textContent='未添加（使用文字）';$('removeLogoBtn').hidden=true;requestRender()});
  preview.addEventListener('pointerdown',e=>{
    if(state.options.mode!=='manual'||!state.selectedImage||state.busy)return;
    preview.setPointerCapture(e.pointerId);moveMark(e);
  });
  preview.addEventListener('pointermove',e=>{if(state.options.mode==='manual'&&preview.hasPointerCapture(e.pointerId))moveMark(e)});
  preview.addEventListener('pointerup',e=>{if(preview.hasPointerCapture(e.pointerId))preview.releasePointerCapture(e.pointerId)});
  preview.addEventListener('pointercancel',e=>{if(preview.hasPointerCapture(e.pointerId))preview.releasePointerCapture(e.pointerId)});
  $('downloadBtn').addEventListener('click',()=>exportCurrent(false));
  $('mobileExportBtn').addEventListener('click',()=>exportCurrent(false));
  $('shareBtn').addEventListener('click',()=>exportCurrent(true));
  $('batchBtn').addEventListener('click',exportBatch);
  $('copyWechat').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('AIPMAndy');toast('微信号 AIPMAndy 已复制')}catch{toast('微信号：AIPMAndy')}});
}
function moveMark(e){const r=preview.getBoundingClientRect();const x=clamp((e.clientX-r.left)/r.width,.02,.98),y=clamp((e.clientY-r.top)/r.height,.02,.98);updateSettings({x,y})}
function canvasBlob(canvas,mime){return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(Error('图片生成失败，设备内存可能不足')),mime,(mime==='image/jpeg'||mime==='image/webp') ? .92 : undefined)}catch(err){reject(err)}})}
async function renderImage(img, options, logo, mime){
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  const err=validateDimensions(w,h);if(err)throw Error(err);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw Error('设备无法创建画布');
  if(mime==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h)}
  ctx.drawImage(img,0,0,w,h);drawWatermark(ctx,w,h,options,logo);
  const blob=await canvasBlob(canvas,mime);canvas.width=1;canvas.height=1;
  return blob;
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000)}
async function exportCurrent(share){
  if(!state.selectedImage||state.busy)return;
  setBusy(true);const opts={...state.options},logo=state.logo,entry=state.files[state.selected],img=state.selectedImage;
  try{
    const mime=$('format').value;
    const blob=await renderImage(img,opts,logo,mime);
    const actual=blob.type||'image/png',filename=filenameFor(entry,state.selected,actual);
    if(actual!==mime)toast('当前浏览器暂不支持此导出格式，已改用 PNG');
    if(share){
      const file=new File([blob],filename,{type:actual});
      if(canShareFiles&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:'FreeWatermark 加水印图片'})}catch(err){if(err.name!=='AbortError')downloadBlob(blob,filename)}
      }else{downloadBlob(blob,filename);toast('当前浏览器不支持直接分享，已尝试下载图片')}
    }else{downloadBlob(blob,filename);toast('图片已生成。iPhone 如未自动保存，可点击「手机分享 / 保存」。')}
  }catch(err){toast(`导出失败：${err.message||'请尝试缩小图片或切换 PNG'}`)}
  finally{setBusy(false)}
}
async function exportBatch(){
  if(state.busy||state.files.length<2||!state.selectedImage)return;
  setBusy(true);
  const opts={...state.options},logo=state.logo,mime=$('format').value,originalSelection=state.selected;
  const items=[];let total=0;
  try{
    for(let i=0;i<state.files.length;i++){
      const image=i===originalSelection?state.selectedImage:await decodeImage(state.files[i]);
      const blob=await renderImage(image,opts,logo,mime);
      const bytes=new Uint8Array(await blob.arrayBuffer());total+=bytes.byteLength;
      if(total>180*1024*1024)throw Error('输出超过 180 MB，请减少批次数量，或选 JPG 格式');
      items.push({name:filenameFor(state.files[i],i,blob.type||'image/png'),bytes});
    }
    const zip=encodeZip(items);
    downloadBlob(zip,`FreeWatermark_${state.files.length}_images.zip`);
    toast(`已打包 ${state.files.length} 张图片。iPhone 可在「文件」App 中解压。`);
  }catch(err){toast(`批量导出失败：${err.message||'请尝试减少图片数量'}`)}
  finally{setBusy(false)}
}
function init(){loadSettings();updateSettingsUI();bindEvents();updateFileUI();
  if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(!canShareFiles){$('shareBtn').textContent='备用下载 / 手机保存';}
}
init();
