import * as toolsService from '../services/tools.js';

/**
 * POST /api/tools/image/process
 * Multipart form: image file + width, height, format fields
 */
export async function imageProcess(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required',
      });
    }

    const { width, height, format } = req.body;
    const options = {};

    if (width) options.width = parseInt(width, 10);
    if (height) options.height = parseInt(height, 10);
    if (format) options.format = format;

    const buffer = await toolsService.processImage(req.file.buffer, options);

    const mimeMap = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    const mime = mimeMap[options.format || 'png'] || 'image/png';

    res.set('Content-Type', mime);
    res.send(buffer);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/text/format
 */
export async function textFormat(req, res) {
  try {
    const { text, type } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Format type is required',
      });
    }

    const result = toolsService.formatText(text, type);

    res.json({
      success: true,
      data: { result },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/hash/generate
 */
export async function hashGenerate(req, res) {
  try {
    const { text, algorithm } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const hash = toolsService.generateHash(text, algorithm);

    res.json({
      success: true,
      data: { hash },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/base64/encode
 */
export async function base64Encode(req, res) {
  try {
    const { text } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const encoded = toolsService.encodeBase64(text);

    res.json({
      success: true,
      data: { encoded },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/base64/decode
 */
export async function base64Decode(req, res) {
  try {
    const { encoded } = req.body;

    if (!encoded) {
      return res.status(400).json({
        success: false,
        error: 'Encoded string is required',
      });
    }

    const decoded = toolsService.decodeBase64(encoded);

    res.json({
      success: true,
      data: { decoded },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/format/json
 */
export async function jsonFormat(req, res) {
  try {
    const { text, indent } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const formatted = toolsService.formatJSON(text, indent);

    res.json({
      success: true,
      data: { formatted },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/format/xml
 */
export async function xmlFormat(req, res) {
  try {
    const { text, indent } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const formatted = toolsService.formatXML(text, indent);

    res.json({
      success: true,
      data: { formatted },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/format/html
 */
export async function htmlFormat(req, res) {
  try {
    const { text, indent } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const formatted = toolsService.formatHTML(text, indent);

    res.json({
      success: true,
      data: { formatted },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * GET /api/tools/ua/generate
 */
export async function uaGenerate(_req, res) {
  try {
    const ua = toolsService.generateUA();

    res.json({
      success: true,
      data: { ua },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/regex/test
 */
export async function regexTest(req, res) {
  try {
    const { pattern, testString, flags } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required',
      });
    }

    if (testString === undefined || testString === null) {
      return res.status(400).json({
        success: false,
        error: 'Test string is required',
      });
    }

    const result = toolsService.testRegex(pattern, testString, flags);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * POST /api/tools/image/convert
 */
export async function imageConvert(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const { format } = req.body;
    const buffer = await toolsService.convertImageFormat(req.file.buffer, format);

    const mimeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
    const mime = mimeMap[format || 'png'] || 'image/png';

    res.set('Content-Type', mime);
    res.send(buffer);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/tools/image/to-ico
 */
export async function imageToIco(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const size = parseInt(req.body.size, 10) || 256;
    const buffer = await toolsService.imageToIco(req.file.buffer, size);

    res.set('Content-Type', 'image/x-icon');
    res.set('Content-Disposition', `attachment; filename="icon-${size}.ico"`);
    res.send(buffer);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/tools/url/encode
 */
export async function urlEncode(req, res) {
  try {
    const { text } = req.body;
    if (text === undefined || text === null) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    const encoded = toolsService.encodeURL(text);
    res.json({ success: true, data: { encoded } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/tools/url/decode
 */
export async function urlDecode(req, res) {
  try {
    const { encoded } = req.body;
    if (!encoded) {
      return res.status(400).json({ success: false, error: 'Encoded string is required' });
    }
    const decoded = toolsService.decodeURL(encoded);
    res.json({ success: true, data: { decoded } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/tools/timestamp/convert
 */
export async function timestampConvert(req, res) {
  try {
    const { input, direction } = req.body;
    if (input === undefined || input === null) {
      return res.status(400).json({ success: false, error: 'Input is required' });
    }
    if (!direction) {
      return res.status(400).json({ success: false, error: 'Direction is required' });
    }
    const result = toolsService.convertTimestamp(input, direction);
    res.json({ success: true, data: result });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

// ============ Code Formatting (F5) ============

/**
 * POST /api/tools/format/code
 */
export const codeFormat = async (req, res) => {
  try {
    const { language, text, indent } = req.body;
    if (!text) return res.status(400).json({ success: false, error: '请输入代码' });
    if (text.length > 200000) return res.status(400).json({ success: false, error: '代码过长，最大支持 200KB' });
    const formatted = await toolsService.formatCode(language, text, indent);
    res.json({ success: true, data: { formatted } });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============ Generator Tools (F7) ============

/**
 * POST /api/tools/generate/jwt/encode
 */
export const jwtEncode = async (req, res) => {
  try {
    const { payload, secret, expiresIn, algorithm } = req.body;
    if (!payload || !secret) return res.status(400).json({ success: false, error: '请提供 payload 和 secret' });
    let parsedPayload;
    try { parsedPayload = JSON.parse(payload); } catch { return res.status(400).json({ success: false, error: 'payload 不是有效的 JSON' }); }
    const token = toolsService.generateJWT(parsedPayload, secret, { expiresIn, algorithm });
    res.json({ success: true, data: { token } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tools/generate/jwt/decode
 */
export const jwtDecode = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: '请提供 token' });
    const decoded = toolsService.decodeJWT(token);
    res.json({ success: true, data: { decoded } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tools/generate/password
 */
export const passwordGenerate = async (req, res) => {
  try {
    const { length = 16, uppercase = true, lowercase = true, numbers = true, symbols = true } = req.body;
    const password = toolsService.generatePassword(length, { uppercase, lowercase, numbers, symbols });
    res.json({ success: true, data: { password } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tools/generate/uuid
 */
export const uuidGenerate = async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const uuids = toolsService.generateUUIDs(count);
    res.json({ success: true, data: { uuids } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
