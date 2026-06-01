const HITOKOTO_API = 'https://v1.hitokoto.cn/';
const CACHE_TTL = 5 * 60 * 1000;

const fallbackHitokoto = {
  text: '生活不止眼前的苟且，还有诗和远方。',
  from: '高晓松',
  fromWho: '',
  from_who: '',
  creator: '',
  uuid: '',
  fallback: true,
};

let cachedHitokoto = null;
let cachedAt = 0;

function normalizeHitokoto(data = {}) {
  const fromWho = data.from_who || data.fromWho || '';

  return {
    text: data.hitokoto || data.text || fallbackHitokoto.text,
    from: data.from || '',
    fromWho,
    from_who: fromWho,
    creator: data.creator || '',
    uuid: data.uuid || '',
  };
}

async function requestHitokoto() {
  const response = await fetch(HITOKOTO_API, {
    signal: AbortSignal.timeout(3000),
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Hitokoto request failed (${response.status})`);
  }

  return normalizeHitokoto(await response.json());
}

export async function getHitokoto(options = {}) {
  const { refresh = false } = options;

  if (!refresh && cachedHitokoto && Date.now() - cachedAt < CACHE_TTL) {
    return cachedHitokoto;
  }

  try {
    const hitokoto = await requestHitokoto();
    cachedHitokoto = hitokoto;
    cachedAt = Date.now();
    return hitokoto;
  } catch (err) {
    console.warn(`Hitokoto fetch failed: ${err.message}`);
    return cachedHitokoto || fallbackHitokoto;
  }
}

export function getFallbackHitokoto() {
  return fallbackHitokoto;
}
