import crypto from 'crypto';
import sharp from 'sharp';
import * as prettier from 'prettier';
import { format as sqlFormat } from 'sql-formatter';
import jwt from 'jsonwebtoken';
import { badRequest } from '../utils/HttpError.js';

export async function processImage(input, options = {}) {
  const { width, height, format } = options;

  let pipeline = sharp(input);

  if (width || height) {
    pipeline = pipeline.resize(width, height, { fit: 'fill' });
  }

  const formatMap = {
    png: 'png',
    jpeg: 'jpeg',
    webp: 'webp',
    gif: 'png',
  };
  const outputFormat = formatMap[format] || 'png';

  return pipeline.toFormat(outputFormat).toBuffer();
}

export function formatText(text, type) {
  switch (type) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'trim':
      return text.trim();
    case 'reverse':
      return [...text].reverse().join('');
    default:
      throw badRequest('Invalid format type. Use: uppercase, lowercase, capitalize, trim, reverse');
  }
}

export function generateHash(text, algorithm = 'sha256') {
  const supported = ['md5', 'sha1', 'sha256'];
  if (!supported.includes(algorithm)) {
    throw badRequest('Invalid algorithm. Use: md5, sha1, sha256');
  }
  return crypto.createHash(algorithm).update(text, 'utf8').digest('hex');
}

export function encodeBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

export function decodeBase64(encoded) {
  try {
    return Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    throw badRequest('Invalid Base64 string');
  }
}

export function formatJSON(text, indent = 2) {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, indent);
  } catch {
    throw badRequest('Invalid JSON');
  }
}

export function formatXML(text, indent = 2) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const pad = ' '.repeat(indent);
  let formatted = '';
  let level = 0;

  const tokens = trimmed.replace(/>\s+</g, '><').split(/(<[^>]+>)/);

  for (const token of tokens) {
    if (!token.trim()) continue;

    if (token.startsWith('</')) {
      level = Math.max(0, level - 1);
      formatted += pad.repeat(level) + token.trim() + '\n';
    } else if (token.startsWith('<?')) {
      formatted += token.trim() + '\n';
    } else if (token.startsWith('<')) {
      formatted += pad.repeat(level) + token.trim() + '\n';
      if (!token.endsWith('/>')) {
        level++;
      }
    } else {
      const textContent = token.trim();
      if (textContent) {
        formatted += pad.repeat(level) + textContent + '\n';
      }
    }
  }

  return formatted.trimEnd();
}

export function formatHTML(text, indent = 2) {
  return formatXML(text, indent);
}

export function generateUA(options = {}) {
  const { browser, os } = options;

  const chromeVersions = ['120.0.6099.109', '121.0.6167.85', '122.0.6261.69', '123.0.6312.86', '124.0.6367.91'];
  const firefoxVersions = ['121.0', '122.0', '123.0', '124.0', '125.0'];
  const safariVersions = ['17.2', '17.3', '17.4', '17.5'];
  const edgeVersions = ['120.0.2210.91', '121.0.2277.83', '122.0.2365.59', '123.0.2420.65', '124.0.2478.51'];

  const allPlatforms = [
    { os: 'windows', browsers: [
      { name: 'chrome', gen: () => { const v = chromeVersions[Math.floor(Math.random() * chromeVersions.length)]; return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`; } },
      { name: 'firefox', gen: () => { const v = firefoxVersions[Math.floor(Math.random() * firefoxVersions.length)]; return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${v}) Gecko/20100101 Firefox/${v}`; } },
      { name: 'edge', gen: () => { const v = edgeVersions[Math.floor(Math.random() * edgeVersions.length)]; return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36 Edg/${v}`; } },
    ]},
    { os: 'macos', browsers: [
      { name: 'chrome', gen: () => { const v = chromeVersions[Math.floor(Math.random() * chromeVersions.length)]; return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`; } },
      { name: 'safari', gen: () => { const v = safariVersions[Math.floor(Math.random() * safariVersions.length)]; return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Safari/605.1.15`; } },
      { name: 'firefox', gen: () => { const v = firefoxVersions[Math.floor(Math.random() * firefoxVersions.length)]; return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:${v}) Gecko/20100101 Firefox/${v}`; } },
      { name: 'edge', gen: () => { const v = edgeVersions[Math.floor(Math.random() * edgeVersions.length)]; return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36 Edg/${v}`; } },
    ]},
    { os: 'linux', browsers: [
      { name: 'chrome', gen: () => { const v = chromeVersions[Math.floor(Math.random() * chromeVersions.length)]; return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`; } },
      { name: 'firefox', gen: () => { const v = firefoxVersions[Math.floor(Math.random() * firefoxVersions.length)]; return `Mozilla/5.0 (X11; Linux x86_64; rv:${v}) Gecko/20100101 Firefox/${v}`; } },
    ]},
    { os: 'android', browsers: [
      { name: 'chrome', gen: () => { const v = chromeVersions[Math.floor(Math.random() * chromeVersions.length)]; return `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Mobile Safari/537.36`; } },
      { name: 'firefox', gen: () => { const v = firefoxVersions[Math.floor(Math.random() * firefoxVersions.length)]; return `Mozilla/5.0 (Android 14; Mobile; rv:${v}) Gecko/${v} Firefox/${v}`; } },
    ]},
    { os: 'ios', browsers: [
      { name: 'safari', gen: () => { const v = safariVersions[Math.floor(Math.random() * safariVersions.length)]; return `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`; } },
      { name: 'chrome', gen: () => { const v = chromeVersions[Math.floor(Math.random() * chromeVersions.length)]; return `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${v} Mobile/15E148 Safari/604.1`; } },
    ]},
  ];

  let filtered = allPlatforms;
  if (os) {
    const osLower = os.toLowerCase();
    filtered = allPlatforms.filter(p => p.os === osLower);
    if (filtered.length === 0) filtered = allPlatforms;
  }

  const platform = filtered[Math.floor(Math.random() * filtered.length)];

  let browsers = platform.browsers;
  if (browser) {
    const browserLower = browser.toLowerCase();
    const filteredBrowsers = browsers.filter(b => b.name === browserLower);
    if (filteredBrowsers.length > 0) browsers = filteredBrowsers;
  }

  const picked = browsers[Math.floor(Math.random() * browsers.length)];
  return picked.gen();
}

export async function convertImageFormat(input, targetFormat = 'png') {
  const supported = ['png', 'jpeg', 'webp'];
  if (!supported.includes(targetFormat)) {
    throw badRequest('Unsupported format. Use: png, jpeg, webp');
  }
  return sharp(input).toFormat(targetFormat).toBuffer();
}

export async function imageToIco(input, size = 256) {
  const validSizes = [16, 32, 48, 64, 128, 256];
  if (!validSizes.includes(size)) {
    throw badRequest('Invalid size. Use: 16, 32, 48, 64, 128, 256');
  }

  const pngBuffer = await sharp(input)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

export function encodeURL(text) {
  return encodeURIComponent(text);
}

export function decodeURL(encoded) {
  try {
    return decodeURIComponent(encoded);
  } catch {
    throw badRequest('Invalid URL-encoded string');
  }
}

export function convertTimestamp(input, direction) {
  if (direction === 'toTimestamp') {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      throw badRequest('Invalid date string');
    }
    return {
      timestamp: Math.floor(date.getTime() / 1000),
      timestampMs: date.getTime(),
      date: date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      iso: date.toISOString()
    };
  }

  if (direction === 'toDate') {
    let ts = Number(input);
    if (isNaN(ts)) {
      throw badRequest('Invalid timestamp');
    }
    if (ts < 1e12) ts = ts * 1000;
    const date = new Date(ts);
    return {
      timestamp: Math.floor(date.getTime() / 1000),
      timestampMs: date.getTime(),
      date: date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      iso: date.toISOString()
    };
  }

  throw badRequest('Invalid direction. Use: toTimestamp, toDate');
}

export function testRegex(pattern, testString, flags = '') {
  let regex;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    throw badRequest('Invalid regex pattern');
  }

  const isMatch = regex.test(testString);

  regex.lastIndex = 0;

  const matches = [];
  let match;
  if (flags.includes('g')) {
    while ((match = regex.exec(testString)) !== null) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.slice(1),
      });
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
  } else {
    match = regex.exec(testString);
    if (match) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.slice(1),
      });
    }
  }

  return {
    matches,
    isMatch,
    details: {
      pattern,
      flags,
      testString,
      matchCount: matches.length,
    },
  };
}

export async function formatCode(language, text, indent = 2) {
  switch (language) {
    case 'js':
    case 'javascript':
      return await prettier.format(text, { parser: 'babel', tabWidth: indent, semi: true, singleQuote: true });
    case 'sql':
      return sqlFormat(text, { indent: ' '.repeat(indent), language: 'sql' });
    case 'python':
    case 'java':
      return simpleIndentFormat(text, indent);
    default:
      throw badRequest('Unsupported language. Use: js, sql, python, java');
  }
}

function simpleIndentFormat(text, indent = 2) {
  const lines = text.split('\n');
  const result = [];
  let level = 0;
  const pad = ' '.repeat(indent);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result.push(''); continue; }

    if (/^[}\])]/.test(trimmed) || /^(elif |else:|except |finally:|case )/.test(trimmed)) {
      level = Math.max(0, level - 1);
    }

    result.push(pad.repeat(level) + trimmed);

    if (/[{(\[]\s*$/.test(trimmed) || /:\s*$/.test(trimmed)) {
      level++;
    }
  }
  return result.join('\n');
}

export function generateJWT(payload, secret, options = {}) {
  const { expiresIn = '1h', algorithm = 'HS256' } = options;
  return jwt.sign(payload, secret, { expiresIn, algorithm });
}

export function decodeJWT(token) {
  return jwt.decode(token, { complete: true });
}

export function generatePassword(length = 16, options = {}) {
  const { uppercase = true, lowercase = true, numbers = true, symbols = true } = options;
  let chars = '';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function generateUUIDs(count = 1) {
  const uuids = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    uuids.push(crypto.randomUUID());
  }
  return uuids;
}
