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
  } catch (e) {
    data = await res.text();
  }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  console.log('🔍 Testing Add Member API...\n');

  const phone = '+84900000001';
  const otp = '999999';
  const device = 'devhash-test';
  const platform = 'web';

  try {
    // Step 1: Send OTP
    console.log('1️⃣ Sending OTP...');
    let r = await req('/api/v1/auth/phone/send-otp', {
      method: 'POST',
      body: { phone, platform },
    });
    console.log(`   Status: ${r.status}`, r.data?.code);

    // Step 2: Verify OTP
    console.log('\n2️⃣ Verifying OTP...');
    r = await req('/api/v1/auth/phone/verify-otp', {
      method: 'POST',
      body: { phone, otp, deviceId: device, platform },
    });
    console.log(`   Status: ${r.status}`);
    const token = r.data?.data?.accessToken;
    const workspaceId = r.data?.data?.workspace?.id;
    console.log(`   Got token: ${token ? '✅' : '❌'}`);
    console.log(`   Got workspaceId: ${workspaceId ? '✅' : '❌'}`);

    if (!token || !workspaceId) {
      console.error('❌ Failed to get token or workspace');
      return;
    }

    // Step 3: Get departments
    console.log('\n3️⃣ Getting departments...');
    r = await req(`/api/v1/workspaces/${workspaceId}/departments`, { token });
    console.log(`   Status: ${r.status}`);
    const dept = r.data?.data?.[0];
    console.log(`   Found ${r.data?.data?.length || 0} departments`);

    if (!dept) {
      console.log('\n❌ No departments found. Creating one...');
      r = await req(`/api/v1/workspaces/${workspaceId}/departments`, {
        method: 'POST',
        token,
        body: { name: 'Test Dept', code: 'TEST' },
      });
      console.log(`   Created: ${r.status}`);
      const newDept = r.data?.data;
      if (!newDept) {
        console.error('❌ Failed to create department');
        return;
      }
      console.log(`   Dept ID: ${newDept.id}`);
    } else {
      console.log(`   Dept ID: ${dept.id}`);
    }

    const departmentId = dept?.id || r.data?.data?.id;

    // Step 4: Get member options
    console.log('\n4️⃣ Getting member options...');
    r = await req(`/api/v1/workspaces/${workspaceId}/departments/member-options`, { token });
    console.log(`   Status: ${r.status}`);
    console.log(`   Found ${r.data?.data?.length || 0} members`);
    const member = r.data?.data?.[0];
    if (!member) {
      console.error('❌ No members available');
      return;
    }
    console.log(`   Member userId: ${member.userId}`);

    // Step 5: Get role options
    console.log('\n5️⃣ Getting role options...');
    r = await req(`/api/v1/workspaces/${workspaceId}/departments/role-options`, { token });
    console.log(`   Status: ${r.status}`);
    console.log(`   Found ${r.data?.data?.length || 0} roles`);
    const role = r.data?.data?.[0];
    if (!role) {
      console.error('❌ No roles available');
      console.log('   Response:', JSON.stringify(r.data, null, 2));
      return;
    }
    console.log(`   Role ID: ${role.id}, Name: ${role.name}`);

    // Step 6: Try to add member
    console.log('\n6️⃣ Adding member to department...');
    console.log(`   Dept: ${departmentId}`);
    console.log(`   User: ${member.userId}`);
    console.log(`   Role: ${role.id}`);
    r = await req(`/api/v1/workspaces/${workspaceId}/departments/${departmentId}/members`, {
      method: 'POST',
      token,
      body: { userId: member.userId, roleId: role.id },
    });
    console.log(`   Status: ${r.status}`);
    if (r.status !== 201) {
      console.error('❌ Failed to add member');
      console.log('   Response:', JSON.stringify(r.data, null, 2));
    } else {
      console.log('✅ Member added successfully');
    }
  } catch (e) {
    console.error('💥 Error:', e.message);
  }
})();
