"""Browser regression for mobile layouts, real pixel changes, export, and ZIP integrity."""
import contextlib
import io
import os
import pathlib
import socket
import tempfile
import threading
import time
import zipfile
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args): pass

def make_source(path, color=(255, 255, 255)):
    im=Image.new('RGB',(1170,2532),color)
    im.save(path,'PNG')

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    with tempfile.TemporaryDirectory() as temp:
        a=pathlib.Path(temp)/'phone.png';b=pathlib.Path(temp)/'phone-2.png'
        make_source(a);make_source(b,(235,240,250))
        with sync_playwright() as pw:
            chromium_path='/usr/bin/chromium' if pathlib.Path('/usr/bin/chromium').exists() else None
            browser=pw.chromium.launch(headless=True,executable_path=chromium_path,args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,accept_downloads=True)
            page=context.new_page()
            errors=[];requests=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('request',lambda req:requests.append(req.url))
            page.goto(origin,wait_until='networkidle')
            assert page.locator('#hero-title').is_visible()
            assert page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+2'),'Mobile horizontal overflow'
            page.locator('#fileInput').set_input_files([str(a),str(b)])
            page.locator('#previewCanvas').wait_for(state='visible')
            page.wait_for_timeout(180)
            assert page.locator('#fileCount').inner_text()=='已选择 2 张'
            # Alpha watermark changes white source pixels.
            has_watermark=page.locator('#previewCanvas').evaluate('''(c)=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data; for(let i=0;i<a.length;i+=4){if(a[i]<253||a[i+1]<253||a[i+2]<253)return true;}return false}''')
            assert has_watermark,'Watermark not rendered'
            # Switch to a solid footer and verify its image pixels are dark.
            page.locator('[data-mode="footer"]').click()
            page.wait_for_timeout(150)
            bottom=page.locator('#previewCanvas').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(5,c.height-4,1,1).data)')
            assert bottom[0]<100,bottom
            with page.expect_download() as d:
                page.locator('#downloadBtn').click()
            out=d.value
            assert out.suggested_filename.endswith('_FreeWatermark.png')
            export=pathlib.Path(temp)/out.suggested_filename
            out.save_as(export)
            im=Image.open(export)
            assert im.size==(1170,2532),im.size
            assert im.getpixel((5,2528))[0]<100
            # Pixel data is rebuilt; no EXIF metadata survives.
            assert not im.getexif()
            with page.expect_download(timeout=30000) as d:
                page.locator('#batchBtn').click()
            zipped=pathlib.Path(temp)/'batch.zip';d.value.save_as(zipped)
            with zipfile.ZipFile(zipped) as z:
                assert len(z.namelist())==2
                assert all('FreeWatermark' in name for name in z.namelist())
                for name in z.namelist():
                    outim=Image.open(io.BytesIO(z.read(name)))
                    assert outim.size==(1170,2532)
            # Test draggable manual mode on mobile emulation.
            page.locator('[data-mode="manual"]').click()
            assert page.locator('#dragHint').is_visible()
            box=page.locator('#previewCanvas').bounding_box()
            page.mouse.move(box['x']+box['width']*.38,box['y']+box['height']*.55)
            page.mouse.down()
            page.mouse.move(box['x']+box['width']*.65,box['y']+box['height']*.62,steps=3)
            page.mouse.up()
            # Ensure no tracking endpoint or source file upload network requests.
            assert all(u.startswith(origin) for u in requests),requests
            assert not errors,errors
            page.screenshot(path=str(ROOT/'docs'/'screenshot-mobile.png'),full_page=True)
            context.close()
            desktop=browser.new_context(viewport={'width':1440,'height':980},device_scale_factor=1)
            p=desktop.new_page();p.goto(origin,wait_until='networkidle')
            assert p.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+2')
            p.locator('#emptyDemoBtn').click();p.locator('#previewCanvas').wait_for(state='visible')
            p.screenshot(path=str(ROOT/'docs'/'screenshot-desktop.png'),full_page=True)
            desktop.close();browser.close()
        print('PASS: mobile width, source upload, watermarked pixels, footer pixels, PNG export size, ZIP, privacy, desktop')
    server.shutdown()

if __name__=='__main__':run()
