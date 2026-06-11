const DEV = process.env.NODE_ENV === 'development';

const errorHandler = (err, req, res, _next) => {
  if (DEV) {
    console.error(err);
  }

  let statusCode = 500;
  let message = '服务器内部错误';
  let code;

  if (err && err.status && Number.isInteger(err.status) && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
    message = err.message || message;
    code = err.code;
  } else if (err && err.statusCode && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
    message = err.message || message;
    code = err.code;
  } else if (err) {
    if (err.name === 'CastError') {
      statusCode = 404;
      message = 'Resource not found';
    } else if (err.code === 11000) {
      statusCode = 400;
      message = 'Duplicate field value entered';
    } else if (err.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(err.errors || {}).map((val) => val.message).join(', ');
    } else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    } else if (DEV) {
      message = err.message || message;
    }
  }

  const body = { success: false, error: message };
  if (code) body.code = code;
  if (DEV && err && err.stack) body.stack = err.stack;

  res.status(statusCode).json(body);
};

export default errorHandler;
