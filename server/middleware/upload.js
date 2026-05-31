import multer from 'multer';

const IMPORT_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);

const fileFilter = (_req, file, cb) => {
  if (file.fieldname === 'import') {
    if (IMPORT_TYPES.has(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
  }

  if (file.fieldname === 'avatar' || file.fieldname === 'image') {
    if (IMAGE_TYPES.has(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP images are allowed.'), false);
  }

  return cb(new Error('Unexpected upload field.'), false);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export default upload;
