const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const WID = '53f608db-f68d-4179-90ad-71321e6026ed';
  const PID = '3800bade-b6eb-47b6-8eb4-323ab9b1edc1';

  // Find the project that has this product (we know it's LANDMARK 3)
  const projects = await prisma.project.findMany({
    where: { workspaceId: WID, name: { contains: 'LANDMARK 3' } },
    select: { id: true, name: true },
  });
  console.log('Projects found:', projects.length, projects.map(p => p.name));

  for (const prj of projects) {
    // Test 1: JSON_SEARCH with $.**.productId
    const r1 = await prisma.$queryRawUnsafe(
      `SELECT JSON_SEARCH(subdivisions, 'one', ?, NULL, '$.**.productId') as res FROM projects WHERE id = ?`,
      PID, prj.id
    );
    console.log('Test $.**.productId:', r1[0]?.res);

    // Test 2: JSON_SEARCH without path
    const r2 = await prisma.$queryRawUnsafe(
      `SELECT JSON_SEARCH(subdivisions, 'one', ?) as res FROM projects WHERE id = ?`,
      PID, prj.id
    );
    console.log('Test no path:', r2[0]?.res);

    // Test 3: JSON_CONTAINS approach
    const r3 = await prisma.$queryRawUnsafe(
      `SELECT JSON_CONTAINS(subdivisions, JSON_QUOTE(?), '$') as res FROM projects WHERE id = ?`,
      PID, prj.id
    );
    console.log('Test JSON_CONTAINS:', r3[0]?.res);

    // Test 4: Look at actual JSON path of productId
    const r4 = await prisma.$queryRawUnsafe(
      `SELECT JSON_EXTRACT(subdivisions, '$[0].towers[0].fundProducts[0].productId') as fp0 FROM projects WHERE id = ?`,
      prj.id
    );
    console.log('Sample fundProducts[0].productId:', r4[0]?.fp0);

    // Test 5: LIKE approach
    const r5 = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM projects WHERE id = ? AND subdivisions LIKE ?`,
      prj.id, '%' + PID + '%'
    );
    console.log('LIKE match:', r5[0]?.cnt);
  }

  await prisma.$disconnect();
})();
