import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

const CV_ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const CV_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const cvFileUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: CV_MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (CV_ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  },
};
