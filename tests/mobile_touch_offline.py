"""Emulated Android-sized Chromium touch regression; synthetic screenshot only.
This is NOT a claim of real iOS Safari testing.
"""
import os,re
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>|<link rel="stylesheet" href="\./style.css">|<script type="module" src="\./app.js"></script>','',html)
code=re.sub(r'^export ','',(ROOT/'detector.js').read_text(),flags=re.M)
code+='\n'+(ROOT/'app.js').read_text().replace("import {boundBox, suggestFromDetections} from './detector.js';",'')

with sync_playwright() as pw:
    kwargs={'executable_path':os.environ['CHROMIUM_BIN']} if os.environ.get('CHROMIUM_BIN') else {}
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],**kwargs)
    page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
        device_scale_factor=1,bypass_csp=True,accept_downloads=True)
    page.set_content(html)
    page.add_style_tag(content=(ROOT/'style.css').read_text())
    page.add_script_tag(content=code)
    page.locator('#demoBtn').click()
    page.locator('#canvas').scroll_into_view_if_needed()
    r=page.locator('#canvas').bounding_box()
    x=r['x']+r['width']*.22;y=r['y']+r['height']*.27
    session=page.context.new_cdp_session(page)
    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for i in range(1,8):
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+3*i,'y':y+4*i}]})
    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert page.locator('#regionCount').inner_text()=='1'
    with page.expect_download() as info:
        page.locator('#downloadBtn').click()
    png=Image.open(info.value.path()).convert('RGB')
    point=page.evaluate('({x:boxes[0].x+8,y:boxes[0].y+8})')
    assert png.getpixel((round(point['x']),round(point['y'])))==(21,39,29)
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
    browser.close()
print('PASS: mobile Chromium emulation touch -> opaque PNG export, no horizontal overflow')
