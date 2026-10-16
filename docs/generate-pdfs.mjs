import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;

const jobs = [
  {
    html: path.join(__dirname, 'university-briefing.html'),
    pdf: path.join(__dirname, 'نادي التمريض - ملف المنصة لإدارة الجامعة.pdf'),
    title: 'المنصة الإلكترونية لنادي التمريض | ملف لإدارة الجامعة',
  },
  {
    html: path.join(__dirname, 'partnership-proposal.html'),
    pdf: path.join(__dirname, 'نادي التمريض - مقترح الشراكة والرعاية.pdf'),
    title: 'مقترح الشراكة والرعاية | نادي التمريض',
  },
];

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
  close() {
    this.ws.close();
  }
}

async function waitForCdp(retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      return await getJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await wait(150);
    }
  }
  throw new Error('Chrome DevTools did not start');
}

async function printPdf(browserWs, job) {
  const browser = new Cdp(browserWs);
  await browser.ready;

  const { targetId } = await browser.send('Target.createTarget', {
    url: 'about:blank',
  });
  const { sessionId } = await browser.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });

  const session = {
    send: (method, params = {}) => {
      const id = ++browser.id;
      browser.ws.send(JSON.stringify({ id, method, sessionId, params }));
      return new Promise((resolve, reject) => {
        browser.pending.set(id, { resolve, reject });
      });
    },
  };

  await session.send('Page.enable');
  await session.send('Network.enable');
  const fileUrl = pathToFileURL(job.html).href;

  const loaded = new Promise(async (resolve) => {
    // Poll ready state after navigate
    await session.send('Page.navigate', { url: fileUrl });
    for (let i = 0; i < 80; i++) {
      const evalResult = await session.send('Runtime.evaluate', {
        expression: `document.readyState === 'complete' && document.fonts.status === 'loaded'`,
        returnByValue: true,
      });
      if (evalResult.result?.value) {
        resolve();
        return;
      }
      await wait(200);
    }
    resolve();
  });
  await loaded;
  await wait(800);

  const pdf = await session.send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size:8px;width:100%;padding:0 14mm;color:#630517;font-family:'Readex Pro',Tahoma,sans-serif;display:flex;justify-content:space-between;direction:rtl">
        <span>${job.title}</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
    marginTop: 0.2,
    marginBottom: 0.45,
    marginLeft: 0,
    marginRight: 0,
    generateTaggedPDF: true,
    generateDocumentOutline: true,
  });

  await writeFile(job.pdf, Buffer.from(pdf.data, 'base64'));
  await browser.send('Target.closeTarget', { targetId });
  browser.close();
  return job.pdf;
}

const chrome = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  'about:blank',
], { stdio: 'ignore' });

try {
  const version = await waitForCdp();
  for (const job of jobs) {
    const out = await printPdf(version.webSocketDebuggerUrl, job);
    console.log('PDF written:', out);
  }
} finally {
  chrome.kill();
}
