/**
 * Notion API에서 모든 블록 데이터를 가져오는 함수 (next_cursor 지원)
 * @param {string} pageId - Notion 페이지 ID
 * @param {string | null} startCursor - 처음 호출 시 넘길 next_cursor (기본값 null)
 * @returns {Promise<any[]>} 모든 블록 데이터 리스트
 */
export declare const fetchAllBlocks: (pageId: string, startCursor?: string | null) => Promise<any[]>;
/**
 * Notion API에서 GET 요청을 수행하는 함수 (재시도 로직 포함)
 */
export declare const fetchGetWithRetry: (url: string, options?: any, tryCount?: number, maxRetries?: number) => Promise<any>;
/**
 * Notion API에서 POST 요청을 수행하는 함수 (재시도 로직 포함)
 * @param {string} url - API endpoint URL
 * @param {any} body - 요청 데이터
 * @param {number} tryCount - 현재 재시도 횟수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @returns {Promise<any>} API 응답 데이터
 */
export declare const fetchPostWithRetry: (url: string, body: any, tryCount?: number, maxRetries?: number) => Promise<any>;
