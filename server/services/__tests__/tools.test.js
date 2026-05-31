import { describe, it, expect } from 'vitest';
import {
  formatText,
  generateHash,
  encodeBase64,
  decodeBase64,
  formatJSON,
  formatXML,
  formatHTML,
  generateUA,
  encodeURL,
  decodeURL,
  convertTimestamp,
  testRegex,
  generatePassword,
  generateUUIDs,
  generateJWT,
  decodeJWT,
} from '../tools.js';

// ============ formatText ============
describe('formatText', () => {
  it('uppercase', () => {
    expect(formatText('hello', 'uppercase')).toBe('HELLO');
  });

  it('lowercase', () => {
    expect(formatText('HELLO', 'lowercase')).toBe('hello');
  });

  it('capitalize', () => {
    expect(formatText('hello world', 'capitalize')).toBe('Hello World');
  });

  it('trim', () => {
    expect(formatText('  hello  ', 'trim')).toBe('hello');
  });

  it('reverse', () => {
    expect(formatText('abc', 'reverse')).toBe('cba');
  });

  it('throws on invalid type', () => {
    expect(() => formatText('x', 'unknown')).toThrow('Invalid format type');
  });
});

// ============ generateHash ============
describe('generateHash', () => {
  it('md5', () => {
    expect(generateHash('test', 'md5')).toBe('098f6bcd4621d373cade4e832627b4f6');
  });

  it('sha1', () => {
    expect(generateHash('test', 'sha1')).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3');
  });

  it('sha256 default', () => {
    const hash = generateHash('test');
    expect(hash).toHaveLength(64);
    expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  it('throws on unsupported algorithm', () => {
    expect(() => generateHash('test', 'md4')).toThrow('Invalid algorithm');
  });
});

// ============ Base64 ============
describe('Base64', () => {
  it('encode', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=');
  });

  it('decode', () => {
    expect(decodeBase64('aGVsbG8=')).toBe('hello');
  });

  it('roundtrip', () => {
    const text = '你好世界 Hello';
    expect(decodeBase64(encodeBase64(text))).toBe(text);
  });
});

// ============ formatJSON ============
describe('formatJSON', () => {
  it('formats valid JSON', () => {
    expect(formatJSON('{"a":1,"b":2}')).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('custom indent', () => {
    expect(formatJSON('{"a":1}', 4)).toBe('{\n    "a": 1\n}');
  });

  it('throws on invalid JSON', () => {
    expect(() => formatJSON('{invalid}')).toThrow('Invalid JSON');
  });
});

// ============ formatXML / formatHTML ============
describe('formatXML', () => {
  it('formats simple XML', () => {
    const result = formatXML('<root><item>text</item></root>');
    expect(result).toContain('<root>');
    expect(result).toContain('  <item>');
  });

  it('handles self-closing tags', () => {
    const result = formatXML('<root><br/><item/></root>');
    expect(result).toContain('<br/>');
  });

  it('empty input returns empty', () => {
    expect(formatXML('')).toBe('');
  });
});

describe('formatHTML', () => {
  it('delegates to formatXML', () => {
    const html = '<div><p>hello</p></div>';
    expect(formatHTML(html)).toBe(formatXML(html));
  });
});

// ============ generateUA ============
describe('generateUA', () => {
  it('returns a valid UA string', () => {
    const ua = generateUA();
    expect(ua).toContain('Mozilla/5.0');
    expect(ua.length).toBeGreaterThan(20);
  });

  it('returns different UAs (probabilistic)', () => {
    const uas = new Set(Array.from({ length: 20 }, () => generateUA()));
    expect(uas.size).toBeGreaterThan(1);
  });
});

// ============ URL encode/decode ============
describe('URL encode/decode', () => {
  it('encode', () => {
    expect(encodeURL('hello world')).toBe('hello%20world');
  });

  it('decode', () => {
    expect(decodeURL('hello%20world')).toBe('hello world');
  });

  it('roundtrip', () => {
    const text = '参数=值&key=hello world';
    expect(decodeURL(encodeURL(text))).toBe(text);
  });
});

// ============ convertTimestamp ============
describe('convertTimestamp', () => {
  it('toTimestamp from date string', () => {
    const result = convertTimestamp('2024-01-01T00:00:00Z', 'toTimestamp');
    expect(result.timestamp).toBe(1704067200);
    expect(result.iso).toBe('2024-01-01T00:00:00.000Z');
  });

  it('toDate from seconds timestamp', () => {
    const result = convertTimestamp(1704067200, 'toDate');
    expect(result.timestamp).toBe(1704067200);
    expect(result.iso).toBe('2024-01-01T00:00:00.000Z');
  });

  it('toDate from milliseconds timestamp', () => {
    const result = convertTimestamp(1704067200000, 'toDate');
    expect(result.timestamp).toBe(1704067200);
  });

  it('throws on invalid date', () => {
    expect(() => convertTimestamp('not-a-date', 'toTimestamp')).toThrow('Invalid date');
  });

  it('throws on invalid direction', () => {
    expect(() => convertTimestamp('123', 'invalid')).toThrow('Invalid direction');
  });
});

// ============ testRegex ============
describe('testRegex', () => {
  it('basic match', () => {
    const result = testRegex('\\d+', 'abc123def');
    expect(result.isMatch).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].value).toBe('123');
  });

  it('global flag', () => {
    const result = testRegex('\\d+', 'a1b2c3', 'g');
    expect(result.matches).toHaveLength(3);
  });

  it('no match', () => {
    const result = testRegex('\\d+', 'abc');
    expect(result.isMatch).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it('throws on invalid pattern', () => {
    expect(() => testRegex('[invalid', 'test')).toThrow('Invalid regex pattern');
  });
});

// ============ generatePassword ============
describe('generatePassword', () => {
  it('default length 16', () => {
    expect(generatePassword()).toHaveLength(16);
  });

  it('custom length', () => {
    expect(generatePassword(32)).toHaveLength(32);
  });

  it('only lowercase', () => {
    const pwd = generatePassword(100, { uppercase: false, numbers: false, symbols: false, lowercase: true });
    expect(pwd).toMatch(/^[a-z]+$/);
  });

  it('only numbers', () => {
    const pwd = generatePassword(100, { uppercase: false, lowercase: false, symbols: false, numbers: true });
    expect(pwd).toMatch(/^[0-9]+$/);
  });
});

// ============ generateUUIDs ============
describe('generateUUIDs', () => {
  it('generates requested count', () => {
    expect(generateUUIDs(5)).toHaveLength(5);
  });

  it('max 100', () => {
    expect(generateUUIDs(200)).toHaveLength(100);
  });

  it('valid UUID format', () => {
    const [uuid] = generateUUIDs(1);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

// ============ JWT ============
describe('JWT', () => {
  const secret = 'test-secret';

  it('generate and decode', () => {
    const token = generateJWT({ user: 'test' }, secret);
    const decoded = decodeJWT(token);
    expect(decoded.payload.user).toBe('test');
    expect(decoded.header.alg).toBe('HS256');
  });

  it('custom expiry', () => {
    const token = generateJWT({ user: 'test' }, secret, { expiresIn: '7d' });
    const decoded = decodeJWT(token);
    expect(decoded.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
