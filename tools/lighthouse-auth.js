#!/usr/bin/env node
// Script to perform a login via OTP and run Lighthouse on authenticated routes.
// The app reads a token from the query string (lh_token) and stores it in
// localStorage/cookie on first load, so this script simply appends the token
// to the URLs we audit.  No Puppeteer or other tooling is required.
// Usage: node tools/lighthouse-auth.js

import { execSync } from 'child_process';
import http from 'http';

const API_BASE = 'http://localhost:3000';
const WEB_BASE = 'http://localhost:3001';

async function login() {
  const phone = '+1234567890'; // any number in E.164 format, OTP is fixed in dev
  console.log('Requesting OTP for', phone);
  await fetch(`${API_BASE}/auth/phone/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  console.log('Verifying OTP (999999)');
  const res = await fetch(`${API_BASE}/auth/phone/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '999999', device_hash: 'devhash', platform: 'web' }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`login failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return data.data.access_token;
}

async function runAuthenticatedLighthouse(paths) {
  if (process.env.LH_SKIP_AUTH === '1') {
    console.log('LH_SKIP_AUTH set, skipping login/proxy and running normal Lighthouse');
    for (const p of paths) {
      const out = `apps/web/lighthouse-${p.replace(/[^a-z0-9]/gi, '_')}-auth.json`;
      const url = `${WEB_BASE}${p}`;
      console.log(`Running Lighthouse for ${url} (output ${out})`);
      const cmd = `npx -y lighthouse ${url} --chrome-flags=\"--headless --no-sandbox\" --output=json --output-path=${out} --only-categories=performance,accessibility,best-practices,seo --no-enable-error-reporting`;
      execSync(cmd, { stdio: 'inherit' });
    }
    return;
  }

  const token = await login();

  const PROXY_PORT = 4000;
  const targetHost = 'localhost';
  const targetPort = 3001;

  console.log(`Starting proxy on http://localhost:${PROXY_PORT} -> http://${targetHost}:${targetPort}`);

  const server = http.createServer((req, res) => {
    const options = {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        cookie: `access_token=${token}`,
        host: `${targetHost}:${targetPort}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      delete headers['transfer-encoding'];
      res.writeHead(proxyRes.statusCode || 200, headers);
      proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Proxy request failed: ${err.message}`);
    });
  });

  await new Promise((resolve, reject) => server.listen(PROXY_PORT, (err) => (err ? reject(err) : resolve())));

  try {
    for (const p of paths) {
      const out = `apps/web/lighthouse-${p.replace(/[^a-z0-9]/gi, '_')}-auth.json`;
      const url = `http://localhost:${PROXY_PORT}${p}`;
      console.log(`Running Lighthouse for ${url} (output ${out})`);
      const cmd = `npx -y lighthouse ${url} --chrome-flags=\"--headless --no-sandbox\" --output=json --output-path=${out} --only-categories=performance,accessibility,best-practices,seo --no-enable-error-reporting`;
      execSync(cmd, { stdio: 'inherit' });
    }
  } finally {
    server.close();
  }
}

async function main() {
  await runAuthenticatedLighthouse(['/workspace/members', '/dashboard']);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
