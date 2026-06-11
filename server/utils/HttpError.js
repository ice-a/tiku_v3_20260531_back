export class HttpError extends Error {
  constructor(status, message, { code } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message, code) => new HttpError(400, message, { code });
export const unauthorized = (message = '请先登录', code) => new HttpError(401, message, { code });
export const forbidden = (message = 'Forbidden', code) => new HttpError(403, message, { code });
export const notFound = (message = 'Resource not found', code) => new HttpError(404, message, { code });
export const conflict = (message, code) => new HttpError(409, message, { code });
export const serverError = (message = '服务器内部错误', code) => new HttpError(500, message, { code });
