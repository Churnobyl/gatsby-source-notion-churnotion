import { instance } from "../api/connector";
import { NOTION_LIMIT_ERROR, PLUGIN_NAME } from "../constants";
import { sleep } from "./timeLimit";

/**
 * POST request with retry logic using axios instance
 * @param {string} url - API endpoint URL
 * @param {any} body - Request body
 * @param {number} tryCount - Current retry count
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
export const fetchPostWithRetry = async (
  url: string,
  body: any,
  tryCount = 0,
  maxRetries = 5
): Promise<any> => {
  try {
    const response = await instance.post(url, body);

    // Return data if the request was successful
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.message || `Unknown error`;

    // Handle rate limit errors with exponential backoff
    if (status === NOTION_LIMIT_ERROR && tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff: 1s, 2s, 4s...
      console.log(
        `[${PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchPostWithRetry(url, body, tryCount + 1, maxRetries);
    }

    // Handle unexpected errors with retry
    if (tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff
      console.log(
        `[${PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchPostWithRetry(url, body, tryCount + 1, maxRetries);
    }

    // Log and throw the error if all retries fail
    console.error(
      `[${PLUGIN_NAME}] Failed after ${tryCount} retries:`,
      message
    );
    throw error;
  }
};

/**
 * General GET/PUT/DELETE request with retry logic using axios instance
 * @param {string} url - API endpoint URL
 * @param {any} options - Axios request options
 * @param {number} tryCount - Current retry count
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
export const fetchGetWithRetry = async (
  url: string,
  options: any = {},
  tryCount = 0,
  maxRetries = 5
): Promise<any> => {
  try {
    const response = await instance.get(url);
    const results = response.data.results;

    for (const block of results) {
      if (block.has_children) {
        block.children = [];

        const pageUrl = `blocks/${block.id}/children?page_size=100`;

        const childData = await fetchGetWithRetry(pageUrl);
        const childResults = childData.results;

        block.children.push(...childResults);
      }
    }

    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.message || `Unknown error`;

    // Handle rate limit errors with exponential backoff
    if (status === NOTION_LIMIT_ERROR && tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff: 1s, 2s, 4s...
      console.log(
        `[${PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchGetWithRetry(url, options, tryCount + 1, maxRetries);
    }

    // Handle unexpected errors with retry
    if (tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff
      console.log(
        `[${PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchGetWithRetry(url, options, tryCount + 1, maxRetries);
    }

    // Log and throw the error if all retries fail
    console.error(
      `[${PLUGIN_NAME}] Failed after ${tryCount} retries:`,
      message
    );
    throw error;
  }
};
