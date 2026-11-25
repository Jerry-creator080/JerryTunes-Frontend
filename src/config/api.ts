
export const API_URL = 'http://129.225.70.239:3001';

/**
 * A fetch wrapper that supports timeout and abort signals.
 */
export const fetchWithTimeout = async (
  resource: string,
  options: RequestInit & { timeout?: number } = {}
) => {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      if (!options.signal?.aborted) {
        throw new Error('Request Timeout');
      }
    }
    throw error;
  }
};
