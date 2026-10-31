import test from 'node:test';
import assert from 'node:assert/strict';
import {luhnValid,classifyText,boundBox,suggestFromDetections} from '../detector.js';

test('Chinese phone, email and API key suggestions',()=>{
  assert.ok(classifyText('请联系 13812345678').includes('手机号'));
  assert.ok(classifyText('demo@example.com').includes('邮箱'));
  assert.ok(classifyText('sk-abcdef0123456789abcdef01234').includes('令牌 / 密钥'));
});
test('Luhn recognizes typical demo card but rejects mismatches',()=>{
  assert.equal(luhnValid('4111111111111111'),true);
  assert.equal(luhnValid('4111111111111112'),false);
  assert.ok(classifyText('4111 1111 1111 1111').includes('银行卡号'));
});
test('no obvious sensitive values yields no categories',()=>{
  assert.deepEqual(classifyText('你好，这是一段普通演示文本'),[]);
});
test('boxes safely clamp to original image',()=>{
  assert.deepEqual(boundBox({x:-5,y:-10,w:80,h:80},50,50,3),{x:0,y:0,w:50,h:50});
});
test('OCR detection never returns the original recognized text',()=>{
  const found=suggestFromDetections([{rawValue:'demo@example.com',boundingBox:{x:10,y:20,width:180,height:24}}],500,300);
  assert.equal(found[0].category,'邮箱');
  assert.equal(JSON.stringify(found).includes('demo@example.com'),false);
  assert.equal(found.length,1);
});
