const base = 'http://localhost:3000';

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function pick(obj, path, fallback = undefined) {
  return (
    path
      .split('.')
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj) ??
    fallback
  );
}

(async () => {
  const phone1 = '+84900000001';
  const phone2 = '+84900000002';
  const otp = '999999';
  const device1 = 'devhash-owner';
  const device2 = 'devhash-member';
  const platform = 'web';

  const out = [];

  const step = async (name, fn) => {
    try {
      const value = await fn();
      out.push({ name, ok: true, value });
      return value;
    } catch (e) {
      out.push({ name, ok: false, error: e.message || String(e) });
      throw e;
    }
  };

  try {
    await step('1) Send OTP owner', async () => {
      const r = await req('/auth/phone/send-otp', { method: 'POST', body: { phone: phone1 } });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return 'OK';
    });

    const ownerAuth = await step('2) Verify OTP owner', async () => {
      const r = await req('/auth/phone/verify-otp', {
        method: 'POST',
        body: { phone: phone1, otp, device_hash: device1, platform },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      const token = pick(r.data, 'data.access_token');
      const workspaceId = pick(r.data, 'data.workspace.id');
      if (!token || !workspaceId) throw new Error('Missing owner token/workspace');
      return { token, workspaceId };
    });

    const roles = await step('3) Get role options for invite', async () => {
      const r = await req(`/workspaces/${ownerAuth.workspaceId}/roles`, { token: ownerAuth.token });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      const roleList = Array.isArray(r.data?.data)
        ? r.data.data
        : Array.isArray(r.data)
          ? r.data
          : [];
      if (!roleList.length) throw new Error('No roles');
      return roleList;
    });

    const inviteRole = roles.find((x) => x.code === 'SALES') || roles[0];

    await step('4) Invite member phone2', async () => {
      const r = await req(`/workspaces/${ownerAuth.workspaceId}/invitations`, {
        method: 'POST',
        token: ownerAuth.token,
        body: { phone: phone2, role_code: inviteRole.code },
      });
      if (!r.ok && r.status !== 409) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return r.status === 409 ? 'Already invited (OK for rerun)' : 'Invited';
    });

    await step('5) Send OTP member', async () => {
      const r = await req('/auth/phone/send-otp', { method: 'POST', body: { phone: phone2 } });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return 'OK';
    });

    const memberAuth = await step('6) Verify OTP member', async () => {
      const r = await req('/auth/phone/verify-otp', {
        method: 'POST',
        body: { phone: phone2, otp, device_hash: device2, platform },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      const token = pick(r.data, 'data.access_token');
      if (!token) throw new Error('Missing member token');
      return { token };
    });

    const pending = await step('7) Member fetch pending invitations', async () => {
      const r = await req('/me/invitations', { token: memberAuth.token });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      const list = Array.isArray(r.data?.data)
        ? r.data.data
        : Array.isArray(r.data)
          ? r.data
          : [];
      const inv = list.find((i) => i.workspaceId === ownerAuth.workspaceId && i.status === 0) || list[0];
      if (!inv) throw new Error('No pending invitation for member');
      if (!inv.token) throw new Error('Invitation token not present in response');
      return inv;
    });

    await step('8) Member accept invitation', async () => {
      const r = await req(`/invitations/${pending.token}/accept`, {
        method: 'POST',
        token: memberAuth.token,
      });
      if (!r.ok && r.status !== 409) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return r.status === 409 ? 'Already accepted (OK for rerun)' : 'Accepted';
    });

    const deptCode = `DPT${Date.now().toString().slice(-6)}`;
    const createdDept = await step('9) Create department (name+code)', async () => {
      const r = await req(`/workspaces/${ownerAuth.workspaceId}/departments`, {
        method: 'POST',
        token: ownerAuth.token,
        body: {
          name: 'Phòng Kinh Doanh E2E',
          code: deptCode,
          description: 'E2E test department',
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      const dept = r.data?.data ?? r.data;
      if (!dept?.id) throw new Error('Missing department id');
      return dept;
    });

    const memberOptions = await step('10) Get department member-options', async () => {
      const r = await req(`/workspaces/${ownerAuth.workspaceId}/departments/member-options`, {
        token: ownerAuth.token,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      const list = Array.isArray(r.data?.data)
        ? r.data.data
        : Array.isArray(r.data)
          ? r.data
          : [];
      if (!list.length) throw new Error('No member options');
      return list;
    });

    const roleOptions = await step('11) Get department role-options', async () => {
      const r = await req(`/workspaces/${ownerAuth.workspaceId}/departments/role-options`, {
        token: ownerAuth.token,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      const list = Array.isArray(r.data?.data)
        ? r.data.data
        : Array.isArray(r.data)
          ? r.data
          : [];
      if (!list.length) throw new Error('No role options');
      return list;
    });

    const memberInWorkspace =
      memberOptions.find((m) => m.user?.phone === phone2) || memberOptions.find((m) => m.userId);
    if (!memberInWorkspace) throw new Error('No target member found in workspace member options');

    const roleA = roleOptions.find((r) => r.code === 'SALES') || roleOptions[0];
    const roleB = roleOptions.find((r) => r.id !== roleA.id) || roleA;

    await step('12) Add member into department', async () => {
      const r = await req(`/workspaces/${ownerAuth.workspaceId}/departments/${createdDept.id}/members`, {
        method: 'POST',
        token: ownerAuth.token,
        body: { userId: memberInWorkspace.userId, roleId: roleA.id },
      });
      if (!r.ok && r.status !== 409) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return r.status === 409 ? 'Already in department (OK for rerun)' : 'Added';
    });

    await step('13) Update member role in department', async () => {
      const r = await req(
        `/workspaces/${ownerAuth.workspaceId}/departments/${createdDept.id}/members/${memberInWorkspace.userId}/role`,
        {
          method: 'PATCH',
          token: ownerAuth.token,
          body: { roleId: roleB.id },
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return 'Updated role';
    });

    await step('14) Remove member from department', async () => {
      const r = await req(
        `/workspaces/${ownerAuth.workspaceId}/departments/${createdDept.id}/members/${memberInWorkspace.userId}`,
        {
          method: 'DELETE',
          token: ownerAuth.token,
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return 'Removed';
    });

    await step('15) Delete empty department', async () => {
      const r = await req(`/workspaces/${ownerAuth.workspaceId}/departments/${createdDept.id}`, {
        method: 'DELETE',
        token: ownerAuth.token,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.data)}`);
      return 'Deleted';
    });
  } catch {
    // handled in output
  }

  console.log('=== E2E Department Checklist Result ===');
  for (const row of out) {
    if (row.ok) {
      const value =
        typeof row.value === 'string' ? row.value : JSON.stringify(row.value).slice(0, 180);
      console.log(`✅ ${row.name}: ${value}`);
    } else {
      console.log(`❌ ${row.name}: ${row.error}`);
      break;
    }
  }
})();
