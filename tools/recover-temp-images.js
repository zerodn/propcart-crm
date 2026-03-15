/**
 * Recovery script: Copy surviving temp files to permanent storage
 * and update all DB references from /temp/ to /properties/ paths.
 *
 * Usage: node tools/recover-temp-images.js
 */
const Minio = require('minio');
const { execSync } = require('child_process');

const BUCKET = 'propcart-crm';
const WORKSPACE_ID = '53f608db-f68d-4179-90ad-71321e6026ed';
const DATE_FOLDER = new Date().toISOString().slice(0, 10).replace(/-/g, '');

const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin_local',
  region: 'us-east-1',
});

function listTempFiles() {
  return new Promise((resolve, reject) => {
    const files = [];
    const prefix = `${WORKSPACE_ID}/temp/`;
    const stream = minioClient.listObjectsV2(BUCKET, prefix, true);
    stream.on('data', (obj) => files.push(obj));
    stream.on('error', reject);
    stream.on('end', () => resolve(files));
  });
}

async function copyObject(srcKey, destKey) {
  const conds = new Minio.CopyConditions();
  await minioClient.copyObject(BUCKET, destKey, `/${BUCKET}/${srcKey}`, conds);
  console.log(`  Copied: ${srcKey} → ${destKey}`);
}

function dbQuery(sql) {
  const fs = require('fs');
  const tmpFile = '/tmp/recover-sql.sql';
  fs.writeFileSync(tmpFile, sql);
  const cmd = `docker exec -i propcart_mariadb mariadb -upropcart -ppropcart_local propcart_crm -N < ${tmpFile}`;
  try {
    return execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    console.error('DB query error:', e.stderr || e.message);
    return '';
  }
}

function dbExec(sql) {
  // Write SQL to a temp file to avoid shell escaping issues
  const fs = require('fs');
  const tmpFile = '/tmp/recover-sql.sql';
  fs.writeFileSync(tmpFile, sql);
  const cmd = `docker exec -i propcart_mariadb mariadb -upropcart -ppropcart_local propcart_crm < ${tmpFile}`;
  try {
    execSync(cmd, { encoding: 'utf-8' });
  } catch (e) {
    console.error('DB exec error:', e.stderr || e.message);
  }
}

async function run() {
  // 1) List surviving temp files
  console.log('=== Step 1: Listing surviving temp files ===');
  const tempFiles = await listTempFiles();
  console.log(`Found ${tempFiles.length} temp files still in MinIO`);

  if (tempFiles.length === 0) {
    console.log('No temp files to recover!');
    return;
  }

  // 2) Copy each to permanent path
  console.log('\n=== Step 2: Copying to permanent storage ===');
  const urlMap = {};
  for (const file of tempFiles) {
    const fileName = file.name.split('/').pop();
    const newKey = `${WORKSPACE_ID}/properties/${DATE_FOLDER}/${fileName}`;
    const oldTempPath = `/temp/${fileName}`;
    const newPermPath = `/properties/${DATE_FOLDER}/${fileName}`;
    urlMap[oldTempPath] = newPermPath;
    await copyObject(file.name, newKey);
  }

  // Verify one copy
  const firstNew = `${WORKSPACE_ID}/properties/${DATE_FOLDER}/${tempFiles[0].name.split('/').pop()}`;
  try {
    const stat = await minioClient.statObject(BUCKET, firstNew);
    console.log(`  Verified: ${firstNew} (${stat.size} bytes)`);
  } catch {
    console.error('  ERROR: Copy verification failed!');
    return;
  }

  // 3) Update DB references using string replace in all relevant columns
  console.log('\n=== Step 3: Updating DB references ===');
  
  const urlColumns = ['bannerUrl', 'zoneImageUrl', 'productImageUrl', 'amenityImageUrl'];
  const jsonColumns = ['bannerUrls', 'zoneImages', 'productImages', 'amenityImages', 'progressUpdates'];
  const allColumns = [...urlColumns, ...jsonColumns];
  
  for (const [oldPath, newPath] of Object.entries(urlMap)) {
    for (const col of allColumns) {
      const sql = `UPDATE projects SET ${col} = REPLACE(${col}, '${oldPath}', '${newPath}') WHERE workspaceId = '${WORKSPACE_ID}' AND ${col} LIKE '%${oldPath}%'`;
      console.log(`  Replacing in ${col}: ...${oldPath} → ...${newPath}`);
      dbExec(sql);
    }
  }

  console.log('\n=== Step 4: Verifying updates ===');
  // Check if any temp references remain
  const remaining = dbQuery(
    `SELECT COUNT(*) FROM projects WHERE workspaceId = '${WORKSPACE_ID}' AND (bannerUrl LIKE '%/temp/%' OR zoneImageUrl LIKE '%/temp/%' OR productImageUrl LIKE '%/temp/%' OR amenityImageUrl LIKE '%/temp/%' OR bannerUrls LIKE '%/temp/%' OR zoneImages LIKE '%/temp/%' OR productImages LIKE '%/temp/%' OR amenityImages LIKE '%/temp/%' OR progressUpdates LIKE '%/temp/%')`
  ).trim();
  
  console.log(`Projects still referencing /temp/: ${remaining}`);
  
  if (parseInt(remaining) > 0) {
    console.log('\nNote: Some projects reference temp files that no longer exist in MinIO.');
    console.log('These images were already cleaned up and cannot be recovered from MinIO.');
    console.log('The portal may still show them from its Next.js image cache.');
  }
  
  console.log(`\n=== Done: ${tempFiles.length} files copied to permanent storage ===`);
}

run().catch(console.error);
