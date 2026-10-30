import multer from 'multer';
import path from 'path';

export const ALLOWED_AVATAR_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

export const uploadAvatarMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_AVATAR_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_AVATAR_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(
          `Unsupported file extension: ${ext}. Supported formats are: ${ALLOWED_AVATAR_EXTENSIONS.join(', ')}`
        )
      );
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          `Invalid MIME type: ${file.mimetype}. Allowed image formats are JPEG, PNG, and WebP.`
        )
      );
    }

    cb(null, true);
  },
});

