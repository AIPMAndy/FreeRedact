"""Additional screenshot privacy checks: output must match the latest edits.
Synthetic local fixtures: NO customer images; actual HTTP test runs separately.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from offline_browser_regression import setup, mask

ROOT=Path(__file__).resolve().parents[1]

def hold_export(page):
    page.evaluate("""() => {
      const real=HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob=function(cb,...args){
        real.call(this,blob=>{
          window.finishOld=()=>cb(blob);window.oldReady=true
        },...args)
      }
    }""")
    downloaded=[]
    page.on('download',lambda d:downloaded.append(d.suggested_filename))
    page.locator('#downloadBtn').click()
    page.wait_for_function('window.oldReady===true')
    return downloaded

def case_clear(browser):
    p=setup(browser);mask(p)
    downloaded=hold_export(p)
    p.locator('#clearBtn').click()
    assert p.locator('#regionCount').inner_text()=='0'
    p.evaluate('window.finishOld()');p.wait_for_timeout(120)
    assert downloaded==[],downloaded
    assert '遮挡区域已更改' in p.locator('#status').inner_text()
    p.close()

def case_add(browser):
    p=setup(browser);rect=mask(p)
    downloaded=hold_export(p)
    p.mouse.move(rect['x']+rect['width']*.8,rect['y']+rect['height']*.8)
    p.mouse.down()
    p.mouse.move(rect['x']+rect['width']*.9,rect['y']+rect['height']*.9,steps=4)
    p.mouse.up()
    assert p.locator('#regionCount').inner_text()=='2'
    p.evaluate('window.finishOld()');p.wait_for_timeout(120)
    assert downloaded==[],downloaded
    assert '遮挡区域已更改' in p.locator('#status').inner_text()
    p.close()

def case_copy_swap(browser):
    p=setup(browser);mask(p)
    p.evaluate("""() => {
      window.ClipboardItem=class {constructor(data){this.data=data}};
      Object.defineProperty(navigator,'clipboard',{configurable:true,
        value:{write:()=>new Promise(resolve=>window.finishCopy=resolve)}})
    }""")
    p.locator('#copyBtn').click()
    p.wait_for_function('typeof window.finishCopy==="function"')
    p.locator('#demoBtn').click()
    p.evaluate('window.finishCopy()');p.wait_for_timeout(120)
    assert '剪贴板中可能是旧版本' in p.locator('#status').inner_text()
    p.close()

def main():
    with sync_playwright() as pw:
        kw={'executable_path':os.environ['CHROMIUM_BIN']} if os.environ.get('CHROMIUM_BIN') else {}
        b=pw.chromium.launch(headless=True,args=['--no-sandbox'],**kw)
        try:
            case_clear(b);case_add(b);case_copy_swap(b)
        finally:b.close()
    print('PASS 3/3 additional privacy race regressions')

if __name__=='__main__':main()
