const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const ws = await p.workspace.findMany({
    where: { name: { contains: 'RESDII' } },
    select: { id: true, name: true, type: true, requireKyc: true }
  });
  console.log('=== WORKSPACE ===');
  console.log(JSON.stringify(ws, null, 2));

  if (ws.length === 0) {
    console.log('No RESDII workspace found!');
    await p.$disconnect();
    return;
  }

  const user = await p.user.findFirst({
    where: { phone: '+84765016165' },
    select: { id: true, phone: true, fullName: true }
  });
  console.log('\n=== USER ===');
  console.log(JSON.stringify(user, null, 2));

  if (user) {
    const member = await p.workspaceMember.findFirst({
      where: { workspaceId: ws[0].id, userId: user.id },
      select: {
        id: true, userId: true, workspaceId: true, status: true,
        kycStatus: true, kycSubmittedAt: true, kycReviewedAt: true,
        kycRejectionReason: true,
        role: { select: { code: true } }
      }
    });
    console.log('\n=== MEMBERSHIP ===');
    console.log(JSON.stringify(member, null, 2));
  }

  await p.$disconnect();
})();
