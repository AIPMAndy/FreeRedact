"""Real browser smoke test; synthetic image data only."""
import io
import os
import subprocess
import time
import tempfile
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','18763','--bind','127.0.0.1'],cwd=str(ROOT),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(.7)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(**({'executable_path':os.environ['CHROMIUM_BIN']} if os.environ.get('CHROMIUM_BIN') else {}),headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
        errors=[]
        requests=[]
        page.on('pageerror',lambda err: errors.append(str(err)))
        page.on('request',lambda req: requests.append((req.method,req.url)))
        page.goto('http://127.0.0.1:18763/',wait_until='domcontentloaded')
        assert page.title().startswith('FreeRedact')
        assert page.locator('#hero-title').inner_text().strip().startswith('截图可以分享。')
        assert page.locator('a.hero-button[href="#editor"]').count() >= 1
        assert page.locator('.faq-list details').count()==4
        assert "connect-src 'none'" in page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute('content')
        page.locator('#demoBtn').click()
        assert page.locator('#canvas').is_visible()
        assert '960 × 610' in page.locator('#imageInfo').inner_text()
        canvas=page.locator('#canvas')
        dims=canvas.bounding_box()
        x=dims['x']+dims['width']*.245
        y=dims['y']+dims['height']*.32
        page.mouse.move(x,y)
        page.mouse.down()
        page.mouse.move(x+100,y+36,steps=8)
        page.mouse.up()
        assert page.locator('#regionCount').inner_text()=='1'
        page.locator('#undoBtn').click()
        assert page.locator('#regionCount').inner_text()=='0'
        page.locator('#redoBtn').click()
        assert page.locator('#regionCount').inner_text()=='1'
        with page.expect_download() as download_info:
            page.locator('#downloadBtn').click()
        download=download_info.value
        path=download.path()
        image=Image.open(path).convert('RGB')
        assert image.size==(960,610)
        # Check solid mask replaced the demo's text pixels, not a removable overlay.
        center_x=int((x+50-dims['x'])*960/dims['width'])
        center_y=int((y+18-dims['y'])*610/dims['height'])
        assert image.getpixel((center_x,center_y)) == (21,39,29),image.getpixel((center_x,center_y))
        page.screenshot(path=str(ROOT/'tests'/'desktop.png'),full_page=True)
        assert errors==[],errors
        remote=[(method,url) for method,url in requests if url.startswith(('http://','https://')) and (method!='GET' or not url.startswith('http://127.0.0.1:18763/'))]
        assert remote==[],f'Unexpected nonlocal/upload request during screenshot workflow: {remote}'
        print('PASS desktop: demo -> drag -> undo -> redo -> export; exported opaque pixels verified')
        # Check manual path on narrow screen.
        phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
        mobile_requests=[]
        phone.on('request',lambda req: mobile_requests.append((req.method,req.url)))
        phone.goto('http://127.0.0.1:18763/',wait_until='domcontentloaded')
        phone.locator('#demoBtn').click()
        assert phone.locator('#canvas').is_visible()
        phone.screenshot(path=str(ROOT/'tests'/'mobile.png'),full_page=True)
        assert phone.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1')
        assert phone.locator('.hero-actions .hero-button').is_visible()
        nonlocal_mobile=[(method,url) for method,url in mobile_requests if url.startswith(('http://','https://')) and (method!='GET' or not url.startswith('http://127.0.0.1:18763/'))]
        assert nonlocal_mobile==[],f'Unexpected mobile remote requests: {nonlocal_mobile}'
        print('PASS mobile: responsive width, demo loads')
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)
