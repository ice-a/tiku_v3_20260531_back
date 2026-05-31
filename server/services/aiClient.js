import dns from 'dns/promises';
import net from 'net';

function isPrivateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  );
}

function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return false;
}

async function validateHost(hostname) {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1'
  ) {
    throw Object.assign(new Error('AI baseUrl must not point to a local address'), { statusCode: 400 });
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw Object.assign(new Error('AI baseUrl must not point to a private address'), { statusCode: 400 });
    }
    return;
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    throw Object.assign(new Error('AI baseUrl host could not be resolved'), { statusCode: 400 });
  }

  if (records.some(({ address }) => isPrivateAddress(address))) {
    throw Object.assign(new Error('AI baseUrl resolves to a private address'), { statusCode: 400 });
  }
}

export async function normalizeAndValidateBaseUrl(baseUrl) {
  if (!baseUrl) {
    throw Object.assign(new Error('AI baseUrl is required'), { statusCode: 400 });
  }

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw Object.assign(new Error('Invalid AI baseUrl'), { statusCode: 400 });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('AI baseUrl must use http or https'), { statusCode: 400 });
  }

  if (url.username || url.password) {
    throw Object.assign(new Error('AI baseUrl must not contain credentials'), { statusCode: 400 });
  }

  await validateHost(url.hostname);

  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

export function buildChatCompletionsUrl(baseUrl) {
  const url = new URL(baseUrl);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (pathname.endsWith('/chat/completions')) {
    return url.toString();
  }

  if (!pathname || pathname === '/') {
    url.pathname = '/v1/chat/completions';
  } else if (pathname.endsWith('/v1')) {
    url.pathname = `${pathname}/chat/completions`;
  } else {
    url.pathname = `${pathname}/chat/completions`;
  }

  return url.toString();
}

export function buildModelsUrl(baseUrl) {
  const url = new URL(baseUrl);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (pathname.endsWith('/models')) {
    return url.toString();
  }

  if (!pathname || pathname === '/') {
    url.pathname = '/v1/models';
  } else if (pathname.endsWith('/v1')) {
    url.pathname = `${pathname}/models`;
  } else {
    url.pathname = `${pathname}/models`;
  }

  return url.toString();
}

export async function callChatCompletions(aiConfig, messages, options = {}) {
  const baseUrl = await normalizeAndValidateBaseUrl(aiConfig.baseUrl);
  const endpoint = buildChatCompletionsUrl(baseUrl);
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 60000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || aiConfig.model || 'gpt-3.5-turbo',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2000
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.error?.message || data.error || response.statusText;
      throw Object.assign(new Error(`AI API request failed (${response.status}): ${detail}`), { status: 502 });
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('AI API request timed out'), { status: 504 });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
