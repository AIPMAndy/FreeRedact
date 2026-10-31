"""Browser regression: private PNG text metadata and source filename must not survive export."""
import os,io
from pathlib import Path
from PIL import Image,PngImagePlugin
from playwright.sync_api import sync_playwright
from offline_browser_regression import setup

secret='FAKE_PRIVATE_LOCATION_123_456_ABCD'
img=Image.new('RGB',(220,120),'#e9e9e9')
meta=PngImagePlugin.PngInfo();meta.add_text('location',secret)
buf=io.BytesIO();img.save(buf,format='PNG',pnginfo=meta)
with sync_playwright() as pw:
    kw={'executable_path':os.environ['CHROMIUM_BIN']} if os.environ.get('CHROMIUM_BIN') else {}
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],**kw)
    page=setup(browser)
    page.locator('#fileInput').set_input_files({'name':'user-name-private.png','mimeType':'image/png','buffer':buf.getvalue()})
    page.wait_for_function('imageWidth===220&&imageHeight===120')
    box=page.locator('#canvas').bounding_box()
    page.mouse.move(box['x']+25,box['y']+25);page.mouse.down()
    page.mouse.move(box['x']+90,box['y']+50,steps=3);page.mouse.up()
    with page.expect_download() as dl:
        page.locator('#downloadBtn').click()
    download=dl.value
    assert download.suggested_filename=='freeredact-safe.png'
    payload=Path(download.path()).read_bytes()
    assert secret.encode() not in payload
    assert b'user-name-private' not in payload
    exported=Image.open(io.BytesIO(payload))
    assert exported.size==(220,120)
    assert exported.info.get('location') is None
    assert exported.convert('RGB').getpixel((40,35))==(21,39,29)
    browser.close()
print('PASS: PNG text metadata, source filename absent; opaque mask pixels verified')
