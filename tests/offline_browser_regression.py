"""State-safety browser test without external navigation. Synthetic data only.
CSP and hosted HTTP are tested separately by browser_smoke.py on CI.
"""
import os,re,base64,io
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
html=(P/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>|<link rel="stylesheet" href="\./style.css">|<script type="module" src="\./app.js"></script>','',html)
det=re.sub(r'^export ','',(P/'detector.js').read_text(),flags=re.M)
js=det+'\n'+(P/'app.js').read_text().replace("import {boundBox, suggestFromDetections} from './detector.js';",'')
def setup(b):
 p=b.new_page(viewport={'width':1440,'height':1000},bypass_csp=True)
 p.set_content(html);p.add_style_tag(content=(P/'style.css').read_text());p.add_script_tag(content=js)
 p.locator('#demoBtn').click();p.locator('#canvas').scroll_into_view_if_needed();return p
def mask(p):
 r=p.locator('#canvas').bounding_box();x=r['x']+r['width']*.25;y=r['y']+r['height']*.35
 p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+100,y+32,steps=4);p.mouse.up()
 assert p.locator('#regionCount').inner_text()=='1';return r
def main():
 with sync_playwright() as pw:
  kw={'executable_path':os.environ['CHROMIUM_BIN']} if os.environ.get('CHROMIUM_BIN') else {}
  b=pw.chromium.launch(headless=True,args=['--no-sandbox'],**kw)
  try:
   for mode in ['escape','pointercancel']:
    p=setup(b);r=mask(p);old=p.evaluate('({x:boxes[0].x,y:boxes[0].y})')
    x=r['x']+r['width']*(old['x']+15)/960;y=r['y']+r['height']*(old['y']+9)/610
    p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+38,y+42,steps=4)
    if mode=='escape':p.keyboard.press('Escape')
    else:p.locator('#canvas').dispatch_event('pointercancel',{'pointerId':1,'pointerType':'mouse'})
    p.mouse.up();assert p.evaluate('({x:boxes[0].x,y:boxes[0].y})')==old;p.close()
   p=setup(b);mask(p)
   img=Image.open(io.BytesIO(base64.b64decode(p.evaluate("exportCanvas().toDataURL('image/png')").split(',')[1]))).convert('RGB')
   loc=p.evaluate('({x:boxes[0].x+8,y:boxes[0].y+8})');assert img.getpixel((int(loc['x']),int(loc['y'])))==(21,39,29);p.close()
   p=setup(b)
   p.evaluate("() => {window.TextDetector=class {detect(){return new Promise(resolve=>window.done=resolve)}}}")
   p.locator('#scanBtn').click();p.wait_for_function('typeof window.done==="function"')
   p.locator('#demoBtn').click();p.evaluate('window.done([{rawValue:"demo@example.com",boundingBox:{x:9,y:9,width:100,height:20}}])')
   p.wait_for_timeout(100);assert p.locator('#suggestions').count()==0;p.close()
   p=setup(b)
   p.evaluate("""async () => {const real=createImageBitmap.bind(window),c=document.createElement('canvas');c.width=31;c.height=19;
    const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));window.bmp=await real(blob);
    window.createImageBitmap=()=>new Promise(resolve=>window.finishOpen=resolve);
    window.pending=openFile(new File([blob],'old.png',{type:'image/png'}));}""")
   p.locator('#demoBtn').click();p.evaluate('window.finishOpen(window.bmp)')
   p.wait_for_timeout(100);assert p.evaluate('imageWidth===960&&imageHeight===610');p.close()
   p=setup(b);mask(p)
   p.evaluate("""() => {const real=HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob=function(cb,...args){real.call(this,blob=>{window.finishExport=()=>cb(blob);window.readyExport=true},...args)}}""")
   p.locator('#downloadBtn').click();p.wait_for_function('window.readyExport===true')
   p.locator('#demoBtn').click();p.evaluate('window.finishExport()');p.wait_for_timeout(100)
   assert '已取消旧截图' in p.locator('#status').inner_text();p.close()
   print('PASS six targeted synthetic browser cases')
  finally:b.close()
if __name__=='__main__':main()
