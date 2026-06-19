function success(statusCode, data) {
  return {
    statusCode,
    body: JSON.stringify(data),
  };
}

function error(statusCode, message) {
  return {
    statusCode,
    body: JSON.stringify({
      error: message,
    }),
  };
}

module.exports = {
  success,
  error,
};