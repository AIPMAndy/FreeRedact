/** Minimal ZIP writer, using the STORE method and standard CRC-32. No SDK, no CDN. */
const CRC_TABLE=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);CRC_TABLE[n]=c>>>0;}
export function crc32(data){let crc=0xffffffff;for(const b of data)crc=CRC_TABLE[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function put16(a,offset,n){a[offset]=n&255;a[offset+1]=(n>>>8)&255;}
function put32(a,offset,n){put16(a,offset,n&65535);put16(a,offset+2,(n>>>16)&65535);}
function concat(parts){const total=parts.reduce((s,p)=>s+p.length,0);const out=new Uint8Array(total);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
/** @param {{name:string,bytes:Uint8Array}[]} files */
export function encodeZip(files){
  if(!Array.isArray(files)||files.length===0||files.length>1000)throw Error('ZIP 文件数量无效');
  const utf8=new TextEncoder(),locals=[],centrals=[];let offset=0;
  for(const f of files){
    if(!(f.bytes instanceof Uint8Array))throw TypeError('ZIP 内容需要 Uint8Array');
    const name=utf8.encode(f.name);
    if(name.length>65535||f.bytes.length>0xffffffff)throw Error('ZIP 文件过大');
    const crc=crc32(f.bytes),size=f.bytes.length;
    const local=new Uint8Array(30+name.length);
    put32(local,0,0x04034b50);put16(local,4,20);put16(local,6,0x0800); // UTF-8 filename flag
    put16(local,8,0);put16(local,10,0);put16(local,12,0);put32(local,14,crc);
    put32(local,18,size);put32(local,22,size);put16(local,26,name.length);put16(local,28,0);local.set(name,30);
    locals.push(local,f.bytes);
    const central=new Uint8Array(46+name.length);
    put32(central,0,0x02014b50);put16(central,4,20);put16(central,6,20);put16(central,8,0x0800);
    put16(central,10,0);put16(central,12,0);put16(central,14,0);put32(central,16,crc);
    put32(central,20,size);put32(central,24,size);put16(central,28,name.length);put16(central,30,0);
    put16(central,32,0);put16(central,34,0);put16(central,36,0);put32(central,38,0);put32(central,42,offset);central.set(name,46);
    centrals.push(central);offset+=local.length+size;
    if(offset>0xffffffff)throw Error('ZIP 超过经典格式 4GB 限制');
  }
  const directory=concat(centrals),end=new Uint8Array(22);
  put32(end,0,0x06054b50);put16(end,4,0);put16(end,6,0);put16(end,8,files.length);put16(end,10,files.length);
  put32(end,12,directory.length);put32(end,16,offset);put16(end,20,0);
  return new Blob([...locals,directory,end],{type:'application/zip'});
}
