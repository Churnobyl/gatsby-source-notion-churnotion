/**
 * POST request with retry logic using axios instance
 * @param {string} url - API endpoint URL
 * @param {any} body - Request body
 * @param {number} tryCount - Current retry count
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
export declare const fetchPostWithRetry: (url: string, body: any, tryCount?: number, maxRetries?: number) => Promise<any>;
/**
 * General GET/PUT/DELETE request with retry logic using axios instance
 * @param {string} url - API endpoint URL
 * @param {any} options - Axios request options
 * @param {number} tryCount - Current retry count
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
export declare const fetchGetWithRetry: (url: string, options?: any, tryCount?: number, maxRetries?: number) => Promise<any>;
