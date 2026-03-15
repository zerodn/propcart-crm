import { diskStorage } from 'multer';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Shared Multer diskStorage config.
 * Files are written to the OS temp directory with a UUID filename.
 * Callers are responsible for deleting the file after upload to MinIO.
 */
export const multerDiskStorage = diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});
