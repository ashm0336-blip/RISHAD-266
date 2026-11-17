function cuCursor(x) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(x))))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
function cuUncursor(s) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')))));
  } catch (e) {
    throw cuError('custody-cursor');
  }
}
