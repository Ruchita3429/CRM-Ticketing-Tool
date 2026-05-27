function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message);

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'A record with that value already exists.',
    });
  }

  if (err.code === '23503' || err.code === '22P02') {
    return res.status(400).json({
      error: 'Invalid related data. Please refresh and sign in again.',
    });
  }

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
