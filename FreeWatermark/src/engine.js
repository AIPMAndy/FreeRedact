/**
 * FreeWatermark rendering engine. No network, no third-party dependencies.
 * All coordinates are computed against the actual target image dimensions.
 */
export const DEFAULTS = Object.freeze({
  text: '星觉科技', mode: 'tile', color: '#111827',
  opacity: 24, size: 4.5, density: 2, angle: -24, x: 0.5, y: 0.5
});
export const MODES = Object.freeze(['tile','corner','footer','manual']);
export const MAX_PIXELS = 32_000_000;
export const MAX_SIDE = 8500;
export const MAX_ITEMS = 12;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 90 * 1024 * 1024;

export function clamp(value, lo, hi) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
}
export function normalizeOptions(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  return {
    text: String(o.text ?? '').slice(0,64).trim(),
    mode: MODES.includes(o.mode) ? o.mode : 'tile',
    color: /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : DEFAULTS.color,
    opacity: clamp(o.opacity, 5, 100),
    size: clamp(o.size, 2, 12), density: Math.round(clamp(o.density, 1, 4)),
    angle: clamp(o.angle, -60, 60), x: clamp(o.x, .02, .98), y: clamp(o.y, .02, .98)
  };
}
export function validateDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return '图片尺寸无效';
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) return '这张图片太大，可能超出手机内存。请先压缩或缩小后再试（最长边 8500 像素以内，最多 3200 万像素）。';
  return null;
}
export function textSize(width, height, options) {
  return Math.max(10, Math.round(Math.min(width,height) * normalizeOptions(options).size / 100));
}
export function tileSpacing(itemWidth, itemHeight, options) {
  const o = normalizeOptions(options);
  const extraX = [5.1, 3.6, 2.4, 1.4][o.density - 1];
  const extraY = [8.2, 6.2, 4.3, 2.7][o.density - 1];
  return { stepX: Math.max(20, itemWidth + itemHeight * extraX), stepY: Math.max(20, itemHeight * extraY) };
}
function roundedRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();
}
function hexIsLight(color){
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
  return (r*.2126+g*.7152+b*.0722)>160;
}
function fitImageDimensions(image,targetWidth){
  const w=image.naturalWidth||image.width||1, h=image.naturalHeight||image.height||1;
  return {width:targetWidth,height:Math.max(1,targetWidth*h/w)};
}
/** Draws an identical watermark on preview or original-size export. */
export function drawWatermark(ctx, width, height, options, logoImage = null) {
  const o=normalizeOptions(options);
  if (!logoImage && !o.text) return;
  const fontSize=textSize(width,height,o);
  const baseHeight=Math.max(1,fontSize*1.18);
  ctx.save();
  ctx.textBaseline='middle';ctx.textAlign='center';
  ctx.font=`800 ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
  const rawWidth=logoImage?fontSize*5:ctx.measureText(o.text).width;
  const logoSize=logoImage?fitImageDimensions(logoImage,rawWidth):null;
  const itemWidth=logoSize?.width??rawWidth;
  const itemHeight=logoSize?.height??baseHeight;
  const alpha=o.opacity/100;
  function drawItem(x,y,scale=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.globalAlpha=alpha;
    if(logoImage){ctx.drawImage(logoImage,-itemWidth/2,-itemHeight/2,itemWidth,itemHeight)}
    else {ctx.fillStyle=o.color;ctx.fillText(o.text,0,0)}
    ctx.restore();
  }
  if(o.mode==='tile'){
    const radius=Math.ceil(Math.hypot(width,height)/2)+itemWidth;
    const {stepX,stepY}=tileSpacing(itemWidth,itemHeight,o);
    ctx.translate(width/2,height/2);ctx.rotate(o.angle*Math.PI/180);
    let row=0;
    for(let y=-radius;y<=radius;y+=stepY){
      const offset=(row%2)*stepX/2;
      for(let x=-radius;x<=radius;x+=stepX)drawItem(x+offset,y);
      row++;
      if(row>200)break;
    }
  }else if(o.mode==='corner'){
    const pad=Math.max(12,Math.min(width,height)*.035);
    const h=itemHeight+fontSize*.7;
    const w=itemWidth+fontSize*1.2;
    const x=width-pad-w,y=height-pad-h;
    ctx.save();ctx.globalAlpha=Math.max(.55,alpha);
    ctx.fillStyle=hexIsLight(o.color)?'rgba(24,27,37,.86)':'rgba(255,255,255,.9)';
    roundedRect(ctx,x,y,w,h,Math.max(8,fontSize*.34));ctx.fill();
    ctx.restore();
    drawItem(x+w/2,y+h/2);
  }else if(o.mode==='footer'){
    const bandHeight=Math.max(fontSize*3.2,height*.09);
    const grad=ctx.createLinearGradient(0,height-bandHeight,0,height);
    grad.addColorStop(0,'rgba(16,19,29,0.0)');grad.addColorStop(.35,'rgba(16,19,29,.60)');grad.addColorStop(1,'rgba(16,19,29,.92)');
    ctx.fillStyle=grad;ctx.fillRect(0,height-bandHeight,width,bandHeight);
    ctx.save();ctx.textAlign='left';ctx.fillStyle='#ffffff';ctx.globalAlpha=Math.max(.65,alpha);
    if(logoImage){const maxW=width*.48;const useW=Math.min(itemWidth,maxW),useH=useW*itemHeight/itemWidth;ctx.drawImage(logoImage,width*.05,height-bandHeight*.36-useH/2,useW,useH)}
    else {ctx.font=`800 ${fontSize}px -apple-system,"PingFang SC",sans-serif`;ctx.fillText(o.text,width*.05,height-bandHeight*.35)}
    ctx.restore();
  }else if(o.mode==='manual'){
    ctx.translate(o.x*width,o.y*height);ctx.rotate(o.angle*Math.PI/180);drawItem(0,0);
  }
  ctx.restore();
}

export function safeFilename(filename){
  let name=String(filename||'image').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim().slice(0,95);
  return name || 'image';
}
export function filenameFor(file,index,mime){
  const ext=mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'png';
  return `${String(index+1).padStart(2,'0')}_${safeFilename(file.name)}_FreeWatermark.${ext}`;
}
export function mimeExtension(mime){return mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'png'};
