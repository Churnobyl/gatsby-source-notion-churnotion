/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
