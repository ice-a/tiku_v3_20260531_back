import * as toolsService from '../services/tools.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/HttpError.js';

export const imageProcess = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest('请上传图片文件');
  }
  const options = req.body.options ? JSON.parse(req.body.options) : {};
  const processedBuffer = await toolsService.processImage(req.file.buffer, options);
  res.set('Content-Type', `image/${options.format || 'png'}`);
  res.send(processedBuffer);
});

export const imageConvert = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest('请上传图片文件');
  }
  const { targetFormat = 'png' } = req.body;
  const processedBuffer = await toolsService.convertImageFormat(req.file.buffer, targetFormat);
  res.set('Content-Type', `image/${targetFormat}`);
  res.send(processedBuffer);
});

export const imageToIco = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest('请上传图片文件');
  }
  const { size = 256 } = req.body;
  const icoBuffer = await toolsService.imageToIco(req.file.buffer, Number(size));
  res.set('Content-Type', 'image/x-icon');
  res.send(icoBuffer);
});

export const textFormat = asyncHandler(async (req, res) => {
  const { text, type } = req.body;
  if (!text || !type) {
    throw badRequest('请提供 text 和 type');
  }
  const result = toolsService.formatText(text, type);
  res.json({ success: true, data: { result } });
});

export const hashGenerate = asyncHandler(async (req, res) => {
  const { text, algorithm = 'sha256' } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.generateHash(text, algorithm);
  res.json({ success: true, data: { result } });
});

export const base64Encode = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.encodeBase64(text);
  res.json({ success: true, data: { result } });
});

export const base64Decode = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.decodeBase64(text);
  res.json({ success: true, data: { result } });
});

export const jsonFormat = asyncHandler(async (req, res) => {
  const { text, indent = 2 } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.formatJSON(text, Number(indent));
  res.json({ success: true, data: { result } });
});

export const xmlFormat = asyncHandler(async (req, res) => {
  const { text, indent = 2 } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.formatXML(text, Number(indent));
  res.json({ success: true, data: { result } });
});

export const htmlFormat = asyncHandler(async (req, res) => {
  const { text, indent = 2 } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.formatHTML(text, Number(indent));
  res.json({ success: true, data: { result } });
});

export const uaGenerate = asyncHandler(async (req, res) => {
  const result = toolsService.generateUA({
    browser: req.query.browser,
    os: req.query.os,
  });
  res.json({ success: true, data: { result } });
});

export const regexTest = asyncHandler(async (req, res) => {
  const { pattern, testString, flags = '' } = req.body;
  if (!pattern || testString === undefined) {
    throw badRequest('请提供 pattern 和 testString');
  }
  const result = toolsService.testRegex(pattern, testString, flags);
  res.json({ success: true, data: result });
});

export const urlEncode = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.encodeURL(text);
  res.json({ success: true, data: { result } });
});

export const urlDecode = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    throw badRequest('请提供 text');
  }
  const result = toolsService.decodeURL(text);
  res.json({ success: true, data: { result } });
});

export const timestampConvert = asyncHandler(async (req, res) => {
  const { input, direction } = req.body;
  if (!input || !direction) {
    throw badRequest('请提供 input 和 direction');
  }
  const result = toolsService.convertTimestamp(input, direction);
  res.json({ success: true, data: result });
});

export const codeFormat = asyncHandler(async (req, res) => {
  const { language, text, indent = 2 } = req.body;
  if (!language || !text) {
    throw badRequest('请提供 language 和 text');
  }
  const result = await toolsService.formatCode(language, text, Number(indent));
  res.json({ success: true, data: { result } });
});

export const jwtEncode = asyncHandler(async (req, res) => {
  const { payload, secret, options = {} } = req.body;
  if (!payload || !secret) {
    throw badRequest('请提供 payload 和 secret');
  }
  const result = toolsService.generateJWT(payload, secret, options);
  res.json({ success: true, data: { result } });
});

export const jwtDecode = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw badRequest('请提供 token');
  }
  const result = toolsService.decodeJWT(token);
  res.json({ success: true, data: { result } });
});

export const passwordGenerate = asyncHandler(async (req, res) => {
  const { length = 16, options = {} } = req.body;
  const result = toolsService.generatePassword(Number(length), options);
  res.json({ success: true, data: { result } });
});

export const uuidGenerate = asyncHandler(async (req, res) => {
  const { count = 1 } = req.body;
  if (count > 100) {
    throw badRequest('单次最多生成 100 个 UUID');
  }
  const result = toolsService.generateUUIDs(Number(count));
  res.json({ success: true, data: { result } });
});
