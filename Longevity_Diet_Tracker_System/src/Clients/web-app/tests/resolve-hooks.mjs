export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier)) {
      for (const suffix of ['.js', '.jsx', '/index.js']) {
        try {
          return await nextResolve(specifier + suffix, context);
        } catch {
          /* thử đuôi tiếp theo */
        }
      }
    }
    throw err;
  }
}
