import { Router } from 'express';
import * as toolsController from '../controllers/tools.js';
import { auth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

// Image processing (file upload)
router.post('/image/process', auth, upload.single('image'), toolsController.imageProcess);

// Image format conversion
router.post('/image/convert', auth, upload.single('image'), toolsController.imageConvert);

// Image to ICO
router.post('/image/to-ico', auth, upload.single('image'), toolsController.imageToIco);

// Text formatting
router.post('/text/format', auth, toolsController.textFormat);

// Hash generation
router.post('/hash/generate', auth, toolsController.hashGenerate);

// Base64 encode/decode
router.post('/base64/encode', auth, toolsController.base64Encode);
router.post('/base64/decode', auth, toolsController.base64Decode);

// Code/Text formatting
router.post('/format/json', auth, toolsController.jsonFormat);
router.post('/format/xml', auth, toolsController.xmlFormat);
router.post('/format/html', auth, toolsController.htmlFormat);

// User-Agent generation
router.get('/ua/generate', auth, toolsController.uaGenerate);

// Regex testing
router.post('/regex/test', auth, toolsController.regexTest);

// URL encode/decode
router.post('/url/encode', auth, toolsController.urlEncode);
router.post('/url/decode', auth, toolsController.urlDecode);

// Timestamp conversion
router.post('/timestamp/convert', auth, toolsController.timestampConvert);

// Code formatting (F5)
router.post('/format/code', auth, toolsController.codeFormat);

// Generator tools (F7)
router.post('/generate/jwt/encode', auth, toolsController.jwtEncode);
router.post('/generate/jwt/decode', auth, toolsController.jwtDecode);
router.post('/generate/password', auth, toolsController.passwordGenerate);
router.post('/generate/uuid', auth, toolsController.uuidGenerate);

export default router;
