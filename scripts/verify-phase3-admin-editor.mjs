/**
 * 阶段 3 后台编辑链路只读冒烟（浏览器）
 * 登录 admin:3001 → 进入博客列表 → 打开一篇含 prose-boxed-heading 的文章编辑器
 * 验证：编辑器能加载已清洗内容（不报错、受控 class 保留、无内联样式垃圾）
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('C:/Users/Administrator/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const ADMIN = 'http://localhost:3001';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const password = readFileSync('D:/com.bailingwooden/bailing-backend/.env', 'utf8')
  .split('\n').find((l) => l.startsWith('ADMIN_PASSWORD='))
  .slice('ADMIN_PASSWORD='.length).trim();

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 150)));

// 1. 登录
await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"], input[name="email"]', 'admin@bailingwooden.com');
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 }).catch(() => {});
console.log('after login url:', page.url());

// 2. 博客列表
await page.goto(`${ADMIN}/blog`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);
const rows = await page.$$eval('table tbody tr, a[href*="/blog/"]', (els) =>
  els.slice(0, 5).map((e) => (e.getAttribute('href') || e.textContent || '').trim().slice(0, 60)),
);
console.log('blog list rows/links:', JSON.stringify(rows));

// 3. 打开目标文章编辑器（含 prose-boxed-heading）
const target = 'cmvetz0rb00gepuykokvbvhoe'; // how-to-choose-the-best-plywood-for-marine-and-humid-environments
await page.goto(`${ADMIN}/blog/${target}/edit`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(2500);
const editorInfo = await page.evaluate(() => {
  const textarea = document.querySelector('textarea');
  const editables = [...document.querySelectorAll('[contenteditable="true"]')];
  const main = editables[editables.length - 1];
  const html = (main && main.innerHTML) || '';
  return {
    textareaLen: textarea?.value?.length ?? -1,
    editableCount: editables.length,
    htmlLen: html.length,
    boxed: html.includes('prose-boxed-heading'),
    hasInlineStyle: html.includes('style='),
    hasSwordOrg: html.includes('s.w.org'),
    hasDsParagraph: html.includes('ds-markdown-paragraph'),
    url: location.pathname,
    title: document.querySelector('h1,h2')?.textContent?.trim().slice(0, 40) || '',
  };
});
console.log('editor:', JSON.stringify(editorInfo));
console.log('errors:', JSON.stringify(errors, null, 2));
await browser.close();
