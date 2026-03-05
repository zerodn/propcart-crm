const fs = require('fs');
const path = require('path');

const base = 'http://localhost:3000';

async function req(url, options = {}) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  const phone = '+84901111333';
  const otp = '999999';
  const device_hash = 'doc-upload-smoke';
  const platform = 'web';

  const sendOtp = await req(`${base}/auth/phone/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!sendOtp.ok) {
    throw new Error(`send otp failed: ${sendOtp.status}`);
  }

  const verify = await req(`${base}/auth/phone/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp, device_hash, platform }),
  });
  if (!verify.ok) {
    throw new Error(`verify otp failed: ${verify.status}`);
  }

  const token = verify.data?.data?.access_token;
  if (!token) {
    throw new Error('missing token');
  }

  const tmpPath = path.join('/tmp', 'profile-smoke.pdf');
  fs.writeFileSync(tmpPath, '%PDF-1.4\n% Fake PDF for smoke test\n');
  const fileBuffer = fs.readFileSync(tmpPath);

  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  form.append('file', blob, 'profile-smoke.pdf');
  form.append('documentType', 'CCCD');

  const upload = await req(`${base}/me/profile/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!upload.ok) {
    throw new Error(`upload failed: ${upload.status} ${JSON.stringify(upload.data)}`);
  }

  const docId = upload.data?.data?.id;

  const list = await req(`${base}/me/profile/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!list.ok) {
    throw new Error(`list failed: ${list.status}`);
  }

  let download = { ok: false, status: 0 };
  if (docId) {
    download = await req(`${base}/me/profile/documents/${docId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  let del = { ok: false, status: 0 };
  if (docId) {
    del = await req(`${base}/me/profile/documents/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  console.log(
    JSON.stringify(
      {
        sendOtp: sendOtp.status,
        verifyOtp: verify.status,
        upload: upload.status,
        list: list.status,
        download: download.status,
        listCount: Array.isArray(list.data?.data) ? list.data.data.length : -1,
        delete: del.status,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e.message || String(e));
  process.exit(1);
});
