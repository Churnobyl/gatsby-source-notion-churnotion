import { instance } from "../api/connector";
import { NOTION_LIMIT_ERROR, PLUGIN_NAME } from "../constants";
import { sleep } from "./timeLimit";

/**
 * Notion API에서 모든 블록 데이터를 가져오는 함수 (next_cursor 지원)
 * @param {string} pageId - Notion 페이지 ID
 * @param {string | null} startCursor - 처음 호출 시 넘길 next_cursor (기본값 null)
 * @returns {Promise<any[]>} 모든 블록 데이터 리스트
 */
export const fetchAllBlocks = async (
  pageId: string,
  startCursor: string | null = null
): Promise<any[]> => {
  let hasMore = true;
  let nextCursor: string | null = startCursor; // 초기 next_cursor를 설정
  let allResults: any[] = [];

  while (hasMore) {
    const pageUrl = `blocks/${pageId}/children?page_size=100${
      nextCursor ? `&start_cursor=${nextCursor}` : ""
    }`;

    const result = await fetchGetWithRetry(pageUrl);

    if (result?.results?.length) {
      allResults = [...allResults, ...result.results]; // 기존 데이터와 병합
    }
    hasMore = result.has_more || false; // 다음 데이터가 있는지 확인
    nextCursor = result.next_cursor || null; // 다음 페이지 커서 업데이트

    // 만약 nextCursor가 계속 null이라면 루프 탈출
    if (!nextCursor) {
      hasMore = false;
    }
  }

  return allResults;
};

/**
 * Notion API에서 GET 요청을 수행하는 함수 (재시도 로직 포함)
 */
export const fetchGetWithRetry = async (
  url: string,
  options: any = {},
  tryCount = 0,
  maxRetries = 5
): Promise<any> => {
  try {
    const response = await instance.get(url);
    let results = response.data.results;

    // Notion API 응답에 has_more가 있으면 추가 블록을 가져와 병합
    if (response.data.has_more) {
      const pageId = url.match(/blocks\/([^\/]*)\/children/)?.[1]; // 정확한 pageId 추출
      if (pageId) {
        const additionalResults = await fetchAllBlocks(
          pageId,
          response.data.next_cursor
        ); // next_cursor도 함께 전달
        results = [...results, ...additionalResults]; // 기존 results에 추가 데이터 병합
      } else {
        console.warn(`[WARNING] Failed to extract pageId from URL: ${url}`);
      }
    }

    return { ...response.data, results }; // 병합된 전체 데이터 반환
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.message || `Unknown error`;

    // Rate limit 오류 처리 (Exponential Backoff)
    if (status === NOTION_LIMIT_ERROR && tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000;
      console.log(
        `[${PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchGetWithRetry(url, options, tryCount + 1, maxRetries);
    }

    // 기타 예외 처리 (Exponential Backoff)
    if (tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000;
      console.log(
        `[${PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchGetWithRetry(url, options, tryCount + 1, maxRetries);
    }

    // 최대 재시도 초과 시 오류 출력 후 throw
    console.error(
      `[${PLUGIN_NAME}] Failed after ${tryCount} retries:`,
      message
    );
    throw error;
  }
};

/**
 * Notion API에서 POST 요청을 수행하는 함수 (재시도 로직 포함)
 * @param {string} url - API endpoint URL
 * @param {any} body - 요청 데이터
 * @param {number} tryCount - 현재 재시도 횟수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @returns {Promise<any>} API 응답 데이터
 */
export const fetchPostWithRetry = async (
  url: string,
  body: any,
  tryCount = 0,
  maxRetries = 5
): Promise<any> => {
  try {
    const response = await instance.post(url, body);

    // 요청 성공 시 데이터 반환
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.message || `Unknown error`;

    // Rate limit 오류 처리 (Exponential Backoff)
    if (status === NOTION_LIMIT_ERROR && tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000;
      console.log(
        `[${PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchPostWithRetry(url, body, tryCount + 1, maxRetries);
    }

    // 기타 예외 처리 (Exponential Backoff)
    if (tryCount < maxRetries) {
      const delay = Math.pow(2, tryCount) * 1000;
      console.log(
        `[${PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
      return fetchPostWithRetry(url, body, tryCount + 1, maxRetries);
    }

    // 최대 재시도 초과 시 오류 출력 후 throw
    console.error(
      `[${PLUGIN_NAME}] Failed after ${tryCount} retries:`,
      message
    );
    throw error;
  }
};
