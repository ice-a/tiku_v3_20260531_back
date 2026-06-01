import crypto from 'crypto';
import sharp from 'sharp';
import * as prettier from 'prettier';
import { format as sqlFormat } from 'sql-formatter';
import jwt from 'jsonwebtoken';

/**
 * Process image: resize and convert format
 * @param {Buffer} input - source image buffer
 * @param {Object} options - { width, height, format }
 * @returns {Buffer} processed image buffer
 */
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
    gif: 'png', // sharp 不支持 gif 输出，降级为 png
  };
  const outputFormat = formatMap[format] || 'png';

  return pipeline.toFormat(outputFormat).toBuffer();
}

/**
 * Format text with given type
 * @param {string} text
 * @param {string} type - uppercase|lowercase|capitalize|trim|reverse
 * @returns {string}
 */
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
    default: {
      const error = new Error('Invalid format type. Use: uppercase, lowercase, capitalize, trim, reverse');
      error.statusCode = 400;
      throw error;
    }
  }
}

/**
 * Generate hash from text
 * @param {string} text
 * @param {string} algorithm - md5|sha1|sha256
 * @returns {string}
 */
export function generateHash(text, algorithm = 'sha256') {
  const supported = ['md5', 'sha1', 'sha256'];
  if (!supported.includes(algorithm)) {
    const error = new Error('Invalid algorithm. Use: md5, sha1, sha256');
    error.statusCode = 400;
    throw error;
  }
  return crypto.createHash(algorithm).update(text, 'utf8').digest('hex');
}

/**
 * Encode text to Base64
 * @param {string} text
 * @returns {string}
 */
export function encodeBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

/**
 * Decode Base64 to text
 * @param {string} encoded
 * @returns {string}
 */
export function decodeBase64(encoded) {
  try {
    return Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    const error = new Error('Invalid Base64 string');
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Format JSON string
 * @param {string} text
 * @param {number} indent - spaces (default 2)
 * @returns {string}
 */
export function formatJSON(text, indent = 2) {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, indent);
  } catch {
    const error = new Error('Invalid JSON');
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Format XML string with indentation
 * @param {string} text
 * @param {number} indent - spaces (default 2)
 * @returns {string}
 */
export function formatXML(text, indent = 2) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const pad = ' '.repeat(indent);
  let formatted = '';
  let level = 0;

  // Split into tags and text content
  const tokens = trimmed.replace(/>\s+</g, '><').split(/(<[^>]+>)/);

  for (const token of tokens) {
    if (!token.trim()) continue;

    if (token.startsWith('</')) {
      // Closing tag - decrease indent
      level = Math.max(0, level - 1);
      formatted += pad.repeat(level) + token.trim() + '\n';
    } else if (token.startsWith('<?')) {
      // XML declaration
      formatted += token.trim() + '\n';
    } else if (token.startsWith('<')) {
      // Opening tag
      formatted += pad.repeat(level) + token.trim() + '\n';
      // Check if it's self-closing
      if (!token.endsWith('/>')) {
        level++;
      }
    } else {
      // Text content
      const textContent = token.trim();
      if (textContent) {
        formatted += pad.repeat(level) + textContent + '\n';
      }
    }
  }

  return formatted.trimEnd();
}

/**
 * Format HTML string with indentation
 * @param {string} text
 * @param {number} indent - spaces (default 2)
 * @returns {string}
 */
export function formatHTML(text, indent = 2) {
  // HTML formatting reuses the same logic as XML
  return formatXML(text, indent);
}

/**
 * Generate a random User-Agent string
 * @param {Object} options - { browser, os }
 * @returns {string}
 */
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

/**
 * Convert image format
 * @param {Buffer} input - source image buffer
 * @param {string} targetFormat - png|jpeg|webp
 * @returns {Buffer} converted image buffer
 */
export async function convertImageFormat(input, targetFormat = 'png') {
  const supported = ['png', 'jpeg', 'webp'];
  if (!supported.includes(targetFormat)) {
    const error = new Error('Unsupported format. Use: png, jpeg, webp');
    error.statusCode = 400;
    throw error;
  }
  return sharp(input).toFormat(targetFormat).toBuffer();
}

/**
 * Convert image to ICO format
 * @param {Buffer} input - source image buffer
 * @param {number} size - icon size (16|32|48|64|128|256)
 * @returns {Buffer} ICO file buffer
 */
export async function imageToIco(input, size = 256) {
  const validSizes = [16, 32, 48, 64, 128, 256];
  if (!validSizes.includes(size)) {
    const error = new Error('Invalid size. Use: 16, 32, 48, 64, 128, 256');
    error.statusCode = 400;
    throw error;
  }

  // Generate PNG at the target size
  const pngBuffer = await sharp(input)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Construct ICO binary format
  // ICO Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: 1 = ICO
  header.writeUInt16LE(1, 4);      // number of images

  // ICO Directory Entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);   // width (0 means 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1);   // height
  entry.writeUInt8(0, 2);                         // color palette
  entry.writeUInt8(0, 3);                         // reserved
  entry.writeUInt16LE(1, 4);                      // color planes
  entry.writeUInt16LE(32, 6);                     // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);       // image data size
  entry.writeUInt32LE(22, 12);                    // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

/**
 * Encode text for URL
 * @param {string} text
 * @returns {string}
 */
export function encodeURL(text) {
  return encodeURIComponent(text);
}

/**
 * Decode URL-encoded text
 * @param {string} encoded
 * @returns {string}
 */
export function decodeURL(encoded) {
  try {
    return decodeURIComponent(encoded);
  } catch {
    const error = new Error('Invalid URL-encoded string');
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Convert between timestamp and date
 * @param {string|number} input - timestamp or date string
 * @param {string} direction - 'toTimestamp' or 'toDate'
 * @returns {Object} { timestamp, date, iso }
 */
export function convertTimestamp(input, direction) {
  if (direction === 'toTimestamp') {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      const error = new Error('Invalid date string');
      error.statusCode = 400;
      throw error;
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
      const error = new Error('Invalid timestamp');
      error.statusCode = 400;
      throw error;
    }
    // Auto-detect seconds vs milliseconds (>1e12 means ms)
    if (ts < 1e12) ts = ts * 1000;
    const date = new Date(ts);
    return {
      timestamp: Math.floor(date.getTime() / 1000),
      timestampMs: date.getTime(),
      date: date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      iso: date.toISOString()
    };
  }

  const error = new Error('Invalid direction. Use: toTimestamp, toDate');
  error.statusCode = 400;
  throw error;
}

/**
 * Test regex pattern against a string
 * @param {string} pattern - regex pattern
 * @param {string} testString
 * @param {string} flags - regex flags (e.g. 'gi')
 * @returns {Object} { matches, isMatch, details }
 */
export function testRegex(pattern, testString, flags = '') {
  let regex;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    const error = new Error('Invalid regex pattern');
    error.statusCode = 400;
    throw error;
  }

  const isMatch = regex.test(testString);

  // Reset lastIndex for global flag
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
      // Prevent infinite loop on zero-length matches
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

// ============ Code Formatting (F5) ============

/**
 * Format code with given language
 * @param {string} language - js|sql|python|java
 * @param {string} text - source code
 * @param {number} indent - spaces (default 2)
 * @returns {Promise<string>}
 */
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
    default: {
      const error = new Error('Unsupported language. Use: js, sql, python, java');
      error.statusCode = 400;
      throw error;
    }
  }
}

/**
 * Simple indentation formatter for Python/Java
 * @param {string} text
 * @param {number} indent
 * @returns {string}
 */
function simpleIndentFormat(text, indent = 2) {
  const lines = text.split('\n');
  const result = [];
  let level = 0;
  const pad = ' '.repeat(indent);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result.push(''); continue; }

    // Decrease indent for closing brackets/keywords
    if (/^[}\])]/.test(trimmed) || /^(elif |else:|except |finally:|case )/.test(trimmed)) {
      level = Math.max(0, level - 1);
    }

    result.push(pad.repeat(level) + trimmed);

    // Increase indent for opening brackets/keywords
    if (/[{(\[]\s*$/.test(trimmed) || /:\s*$/.test(trimmed)) {
      level++;
    }
  }
  return result.join('\n');
}

// ============ Generator Tools (F7) ============

/**
 * Generate JWT token
 * @param {Object} payload
 * @param {string} secret
 * @param {Object} options - { expiresIn, algorithm }
 * @returns {string}
 */
export function generateJWT(payload, secret, options = {}) {
  const { expiresIn = '1h', algorithm = 'HS256' } = options;
  return jwt.sign(payload, secret, { expiresIn, algorithm });
}

/**
 * Decode JWT token without verification
 * @param {string} token
 * @returns {Object|null}
 */
export function decodeJWT(token) {
  return jwt.decode(token, { complete: true });
}

/**
 * Generate random password
 * @param {number} length
 * @param {Object} options - { uppercase, lowercase, numbers, symbols }
 * @returns {string}
 */
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

/**
 * Generate UUIDs
 * @param {number} count
 * @returns {string[]}
 */
export function generateUUIDs(count = 1) {
  const uuids = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    uuids.push(crypto.randomUUID());
  }
  return uuids;
}
