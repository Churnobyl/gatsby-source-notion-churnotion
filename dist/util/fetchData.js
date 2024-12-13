"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGetWithRetry = exports.fetchPostWithRetry = void 0;
const connector_1 = require("../api/connector");
const constants_1 = require("../constants");
const timeLimit_1 = require("./timeLimit");
/**
 * POST request with retry logic using axios instance
 * @param {string} url - API endpoint URL
 * @param {any} body - Request body
 * @param {number} tryCount - Current retry count
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
const fetchPostWithRetry = async (url, body, tryCount = 0, maxRetries = 5) => {
    try {
        const response = await connector_1.instance.post(url, body);
        // Return data if the request was successful
        return response.data;
    }
    catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || `Unknown error`;
        // Handle rate limit errors with exponential backoff
        if (status === constants_1.NOTION_LIMIT_ERROR && tryCount < maxRetries) {
            const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff: 1s, 2s, 4s...
            console.log(`[${constants_1.PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`);
            await (0, timeLimit_1.sleep)(delay);
            return (0, exports.fetchPostWithRetry)(url, body, tryCount + 1, maxRetries);
        }
        // Handle unexpected errors with retry
        if (tryCount < maxRetries) {
            const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff
            console.log(`[${constants_1.PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`);
            await (0, timeLimit_1.sleep)(delay);
            return (0, exports.fetchPostWithRetry)(url, body, tryCount + 1, maxRetries);
        }
        // Log and throw the error if all retries fail
        console.error(`[${constants_1.PLUGIN_NAME}] Failed after ${tryCount} retries:`, message);
        throw error;
    }
};
exports.fetchPostWithRetry = fetchPostWithRetry;
/**
 * General GET/PUT/DELETE request with retry logic using axios instance
 * @param {string} url - API endpoint URL
 * @param {any} options - Axios request options
 * @param {number} tryCount - Current retry count
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
const fetchGetWithRetry = async (url, options = {}, tryCount = 0, maxRetries = 5) => {
    try {
        const response = await connector_1.instance.get(url);
        // Return data if the request was successful
        return response.data;
    }
    catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || `Unknown error`;
        // Handle rate limit errors with exponential backoff
        if (status === constants_1.NOTION_LIMIT_ERROR && tryCount < maxRetries) {
            const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff: 1s, 2s, 4s...
            console.log(`[${constants_1.PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`);
            await (0, timeLimit_1.sleep)(delay);
            return (0, exports.fetchGetWithRetry)(url, options, tryCount + 1, maxRetries);
        }
        // Handle unexpected errors with retry
        if (tryCount < maxRetries) {
            const delay = Math.pow(2, tryCount) * 1000; // Exponential backoff
            console.log(`[${constants_1.PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`);
            await (0, timeLimit_1.sleep)(delay);
            return (0, exports.fetchGetWithRetry)(url, options, tryCount + 1, maxRetries);
        }
        // Log and throw the error if all retries fail
        console.error(`[${constants_1.PLUGIN_NAME}] Failed after ${tryCount} retries:`, message);
        throw error;
    }
};
exports.fetchGetWithRetry = fetchGetWithRetry;
