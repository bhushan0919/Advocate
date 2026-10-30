import multer from 'multer';
import path from 'path';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_DOCUMENT_FILE_SIZE } from '../services/storage.service.js';

// Memory storage keeps the buffer in memory to write directly to workspace storage
const storage = multer.memoryStorage();

export const uploadDocumentMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(
          `Unsupported file type: ${ext}. Supported formats are: ${ALLOWED_EXTENSIONS.join(', ')}`
        )
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // Some Windows docx uploads might present application/zip or application/octet-stream; check extension
      if (
        (ext === '.docx' || ext === '.xlsx') &&
        (file.mimetype === 'application/zip' || file.mimetype === 'application/octet-stream')
      ) {
        return cb(null, true);
      }

      return cb(
        new Error(
          `Invalid MIME type: ${file.mimetype}. File does not match permitted legal document formats.`
        )
      );
    }

    cb(null, true);
  },
});

