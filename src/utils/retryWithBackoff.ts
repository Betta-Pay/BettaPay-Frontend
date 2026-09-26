export async function retryWithBackoff(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error?.response?.status === 400 || error?.response?.status === 401 || error?.response?.status === 403) {
        // Non-retryable errors
        throw error;
      }
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
}
