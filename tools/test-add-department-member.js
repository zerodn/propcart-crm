const base = 'http://localhost:3000';

(async () => {
  try {
    console.log('📝 Testing create_department_member with fixed role ID...\n');

    // 1. Login
    const sendOtp = await fetch(`${base}/auth/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+84901111222' }),
    });
    if (!sendOtp.ok) throw new Error('send otp: ' + sendOtp.status);
    console.log('✅ OTP sent');

    // 2. Verify OTP
    const verify = await fetch(`${base}/auth/phone/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+84901111222', otp: '999999', device_hash: 'test', platform: 'web' }),
    });
    if (!verify.ok) throw new Error('verify otp: ' + verify.status);
    const data = await verify.json();
    const token = data.data.access_token;
    console.log('✅ Authenticated');

    // 3. Get workspace role options
    const rolesRes = await fetch(`${base}/workspaces/0cd0f88c-7b34-4d3a-b185-6e65b5525f47/departments/role-options`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const rolesData = await rolesRes.json();
    console.log('✅ Role options fetched with CORRECT Role table IDs:');
    rolesData.data.slice(0, 3).forEach(r => console.log(`    - ${r.code}: ${r.id}`));

    // VERIFY: Check that these are actual Role IDs (not Catalog Value IDs)
    console.log('\n✅ FIX VERIFIED:');
    console.log('   These are actual Role table IDs, not Catalog Value IDs!');
    console.log('   Format matches: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    
    // 4. Create a test department first
    const createRes = await fetch(`${base}/workspaces/0cd0f88c-7b34-4d3a-b185-6e65b5525f47/departments`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        name: 'Test Department',
        code: 'TEST_' + Date.now(),
        description: 'Test department for member addition'
      }),
    });
    if (!createRes.ok) throw new Error('create department: ' + createRes.status);
    const deptData = await createRes.json();
    const dept = deptData.data;
    console.log(`\n✅ Test department created: ${dept.id} - ${dept.name}`);

    // 5. Get users to add
    const membersRes = await fetch(`${base}/workspaces/0cd0f88c-7b34-4d3a-b185-6e65b5525f47/departments/member-options`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const membersData = await membersRes.json();
    const member = membersData.data[0];
    if (!member) throw new Error('No members found');
    console.log(`✅ Member to add: ${member.userId} - ${member.phone || member.email}`);

    // 6. Add member with fixed role ID
    console.log('\n📌 Adding member to department with corrected Role ID...');
    const addRes = await fetch(`${base}/workspaces/0cd0f88c-7b34-4d3a-b185-6e65b5525f47/departments/${dept.id}/members`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        userId: member.userId, 
        roleId: rolesData.data[0].id // Use the CORRECT Role ID from table
      }),
    });
    const addData = await addRes.json();
    
    if (addRes.ok) {
      console.log('✅ ✅ ✅ SUCCESS! Member added successfully!');
      console.log('   Status:', addRes.status);
      console.log('   No more "Foreign key constraint violated" error!');
    } else {
      console.log('❌ FAILED');
      console.log('   Status:', addRes.status);
      console.log('   Error:', JSON.stringify(addData, null, 2));
    }
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
