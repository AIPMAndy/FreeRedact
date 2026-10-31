// Adapted in spirit from RedactShot's MIT-licensed sensitive-data detection.
// Original project: https://github.com/darkzOGx/RedactShot
// Copyright (c) 2026 RedactShot contributors; attribution in THIRD_PARTY_NOTICES.md.
// Deliberately conservative: a regex hit only suggests a rectangle for human review.

export function luhnValid(number) {
  if (!/^\d{13,19}$/.test(number)) return false;
  let sum = 0, alternate = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = Number(number[i]);
    if (alternate) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alternate = !alternate;
  }
  return sum % 10 === 0;
}

const CHECKS = [
  {type: '邮箱', test: value => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)},
  {type: '手机号', test: value => /(?:^|\D)1[3-9]\d{9}(?!\d)/.test(value.replace(/[\s-]/g,''))},
  {type: '身份证号', test: value => /(?:^|\D)\d{17}[\dXx](?!\d)/.test(value.replace(/\s/g,''))},
  {type: '令牌 / 密钥', test: value => /(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._-]{16,})/.test(value)},
  {type: 'IP 地址', test: value => /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value)},
  {type: '银行卡号', test: value => { const matches=value.match(/(?:\d[ -]?){13,19}/g)||[]; return matches.some(m=>luhnValid(m.replace(/\D/g,''))); }},
  {type: '敏感字段', test: value => /(?:手机号|电话号码|身份证|收货地址|家庭地址|家庭住址|银行卡|密码|验证码|微信号|邮箱地址|api.?key|access.?token)\s*[:：]/i.test(value)}
];

export function classifyText(value) {
  const text = String(value||'').trim();
  return CHECKS.filter(check=>check.test(text)).map(check=>check.type);
}

export function boundBox(b, width, height, padding=0) {
  const a=Math.max(0,Math.floor(Number(b.x||0)-padding));
  const y=Math.max(0,Math.floor(Number(b.y||0)-padding));
  const x2=Math.min(width,Math.ceil(Number(b.x||0)+Number(b.w||0)+padding));
  const y2=Math.min(height,Math.ceil(Number(b.y||0)+Number(b.h||0)+padding));
  return {x:a,y,w:Math.max(0,x2-a),h:Math.max(0,y2-y)};
}

export function intersect(a,b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// The native TextDetector API is experimental and not universally available.
// We never include recognized strings in the resulting UI; only candidate labels.
export function suggestFromDetections(detections, imageWidth, imageHeight) {
  if (!Array.isArray(detections)) return [];
  return detections.flatMap(item => {
    const types=classifyText(item.rawValue ?? item.text ?? '');
    if (!types.length || !item.boundingBox) return [];
    const b=item.boundingBox;
    const box=boundBox({x:b.x,y:b.y,w:b.width,h:b.height},imageWidth,imageHeight,7);
    if (box.w<4||box.h<4) return [];
    return [{...box, category:types[0]}];
  }).filter((candidate,i,arr)=>!arr.some((other,j)=>j<i&&intersect(candidate,other)&&other.category===candidate.category));
}
