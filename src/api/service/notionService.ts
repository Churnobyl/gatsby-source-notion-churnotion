import { Reporter } from "gatsby";
import { BaseContentBlock } from "notion-types";
import { instance } from "../connector";
import { NOTION_LIMIT_ERROR, PLUGIN_NAME } from "../../constants";
import { sleep } from "../../util/timeLimit";

// Extended block type with has_children property
interface NotionBlock extends BaseContentBlock {
  has_children?: boolean;
}

export interface NotionServiceOptions {
  reporter: Reporter;
  parallelLimit?: number;
  enableCaching?: boolean;
}

/**
 * 간단한 병렬 제한 큐
 */
class ParallelLimiter {
  private running: number = 0;
  private queue: Array<() => void> = [];
  private limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.running++;
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running--;
            this.next();
          });
      };

      if (this.running < this.limit) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  private next() {
    if (this.queue.length > 0 && this.running < this.limit) {
      const run = this.queue.shift();
      if (run) run();
    }
  }

  setLimit(limit: number) {
    this.limit = limit;

    // 새 제한 설정 후 큐에서 가능한 작업 실행
    while (this.running < this.limit && this.queue.length > 0) {
      this.next();
    }
  }
}

export class NotionService {
  private reporter: Reporter;
  private parallelLimit: number;
  private enableCaching: boolean;
  private cache: Map<string, any>;
  private limiter: ParallelLimiter;

  constructor(options: NotionServiceOptions) {
    this.reporter = options.reporter;
    this.parallelLimit = options.parallelLimit || 5; // 기본 동시 요청 수
    this.enableCaching = options.enableCaching !== false; // 기본값은 캐싱 활성화
    this.cache = new Map();
    this.limiter = new ParallelLimiter(this.parallelLimit);
  }

  /**
   * GET 요청을 수행하는 함수 (재시도 로직 포함)
   */
  private async fetchGetWithRetry(
    url: string,
    tryCount = 0,
    maxRetries = 5
  ): Promise<any> {
    try {
      const response = await instance.get(url);
      let results = response.data.results;

      // Notion API 응답에 has_more가 있으면 추가 블록을 가져와 병합
      if (response.data.has_more) {
        const pageId = url.match(/blocks\/([^\/]*)\/children/)?.[1]; // 정확한 pageId 추출
        if (pageId) {
          const additionalResults = await this.fetchAllBlocks(
            pageId,
            response.data.next_cursor
          );
          results = [...results, ...additionalResults]; // 기존 results에 추가 데이터 병합
        } else {
          this.reporter.warn(
            `[WARNING] Failed to extract pageId from URL: ${url}`
          );
        }
      }

      return { ...response.data, results }; // 병합된 전체 데이터 반환
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || `Unknown error`;

      // Rate limit 오류 처리 (Exponential Backoff)
      if (status === NOTION_LIMIT_ERROR && tryCount < maxRetries) {
        const delay = Math.pow(2, tryCount) * 1000;
        this.reporter.info(
          `[${PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
        return this.fetchGetWithRetry(url, tryCount + 1, maxRetries);
      }

      // 기타 예외 처리 (Exponential Backoff)
      if (tryCount < maxRetries) {
        const delay = Math.pow(2, tryCount) * 1000;
        this.reporter.info(
          `[${PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
        return this.fetchGetWithRetry(url, tryCount + 1, maxRetries);
      }

      // 최대 재시도 초과 시 오류 출력 후 throw
      this.reporter.error(
        `[${PLUGIN_NAME}] Failed after ${tryCount} retries:`,
        message
      );
      throw error;
    }
  }

  /**
   * POST 요청을 수행하는 함수 (재시도 로직 포함)
   */
  private async fetchPostWithRetry(
    url: string,
    body: any,
    tryCount = 0,
    maxRetries = 5
  ): Promise<any> {
    try {
      const response = await instance.post(url, body);
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || `Unknown error`;

      // Rate limit 오류 처리 (Exponential Backoff)
      if (status === NOTION_LIMIT_ERROR && tryCount < maxRetries) {
        const delay = Math.pow(2, tryCount) * 1000;
        this.reporter.info(
          `[${PLUGIN_NAME}] Rate limit hit. Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
        return this.fetchPostWithRetry(url, body, tryCount + 1, maxRetries);
      }

      // 기타 예외 처리 (Exponential Backoff)
      if (tryCount < maxRetries) {
        const delay = Math.pow(2, tryCount) * 1000;
        this.reporter.info(
          `[${PLUGIN_NAME}] Unexpected error. Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
        return this.fetchPostWithRetry(url, body, tryCount + 1, maxRetries);
      }

      // 최대 재시도 초과 시 오류 출력 후 throw
      this.reporter.error(
        `[${PLUGIN_NAME}] Failed after ${tryCount} retries:`,
        message
      );
      throw error;
    }
  }

  /**
   * 모든 블록 데이터를 가져오는 함수 (next_cursor 지원)
   */
  private async fetchAllBlocks(
    pageId: string,
    startCursor: string | null = null
  ): Promise<any[]> {
    let hasMore = true;
    let nextCursor: string | null = startCursor;
    let allResults: any[] = [];

    while (hasMore) {
      const pageUrl = `blocks/${pageId}/children?page_size=100${
        nextCursor ? `&start_cursor=${nextCursor}` : ""
      }`;

      const result = await this.fetchGetWithRetry(pageUrl);

      if (result?.results?.length) {
        allResults = [...allResults, ...result.results];
      }
      hasMore = result.has_more || false;
      nextCursor = result.next_cursor || null;

      if (!nextCursor) {
        hasMore = false;
      }
    }

    return allResults;
  }

  /**
   * 데이터베이스 쿼리
   */
  async queryDatabase(databaseId: string, body: any = {}): Promise<any> {
    const cacheKey = `database-${databaseId}-${JSON.stringify(body)}`;

    if (this.enableCaching && this.cache.has(cacheKey)) {
      this.reporter.info(
        `[CACHE] Using cached database query for ${databaseId}`
      );
      return this.cache.get(cacheKey);
    }

    const databaseUrl = `databases/${databaseId}/query`;

    try {
      const result = await this.fetchPostWithRetry(databaseUrl, body);

      if (this.enableCaching) {
        this.cache.set(cacheKey, result);
      }

      this.reporter.info(
        `[SUCCESS] Database query ${databaseId} - results: ${
          result?.results?.length || 0
        }`
      );
      return result;
    } catch (error) {
      this.reporter.error(
        `[ERROR] Failed to query database ${databaseId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * 페이지의 자식 블록 가져오기 (재귀적 처리)
   */
  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    const cacheKey = `page-blocks-${pageId}`;

    if (this.enableCaching && this.cache.has(cacheKey)) {
      this.reporter.info(`[CACHE] Using cached page blocks for ${pageId}`);
      return this.cache.get(cacheKey);
    }

    const pageUrl = `blocks/${pageId}/children?page_size=100`;

    try {
      const data = await this.fetchGetWithRetry(pageUrl);
      const blocks = data.results as NotionBlock[];

      // 재귀적으로 has_children이 true인 블록의 자식들을 가져옴
      const blocksWithChildren = await this.fetchChildBlocks(blocks);

      if (this.enableCaching) {
        this.cache.set(cacheKey, blocksWithChildren);
      }

      return blocksWithChildren;
    } catch (error) {
      this.reporter.error(
        `[ERROR] Failed to get page blocks ${pageId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * has_children이 true인 블록들의 자식을 재귀적으로 가져옴
   */
  private async fetchChildBlocks(
    blocks: NotionBlock[]
  ): Promise<NotionBlock[]> {
    if (!blocks || blocks.length === 0) return blocks;

    const tasks = blocks.map(async (block) => {
      if (block.has_children) {
        try {
          this.reporter.info(
            `[NOTION] Fetching children for block ${block.id} of type ${block.type}`
          );

          const childBlocks = await this.getPageBlocks(block.id);

          // 자식 블록을 부모 블록에 추가
          (block as any).children = childBlocks;

          // 특별히 table 타입의 경우 row 정보 추가
          if (block.type === "table") {
            (block as any).table.rows = childBlocks;
          }

          return block;
        } catch (error) {
          this.reporter.warn(
            `[WARNING] Failed to fetch children for block ${block.id}: ${error}`
          );
          return block;
        }
      }
      return block;
    });

    return Promise.all(tasks);
  }

  /**
   * 여러 페이지의 블록 병렬 처리
   */
  async getMultiplePagesBlocks(
    pageIds: string[]
  ): Promise<{ [id: string]: NotionBlock[] }> {
    this.reporter.info(
      `[NOTION] Fetching blocks for ${pageIds.length} pages in parallel (limit: ${this.parallelLimit})`
    );

    const tasks = pageIds.map((pageId) =>
      this.limiter.add(async () => {
        try {
          const blocks = await this.getPageBlocks(pageId);
          return { pageId, blocks };
        } catch (error) {
          this.reporter.warn(
            `[WARNING] Failed to fetch blocks for page ${pageId}: ${error}`
          );
          return { pageId, blocks: [] };
        }
      })
    );

    const results = await Promise.all(tasks);

    return results.reduce(
      (acc: { [id: string]: NotionBlock[] }, { pageId, blocks }) => {
        acc[pageId] = blocks;
        return acc;
      },
      {}
    );
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.reporter.info(
      `[NOTION] Clearing service cache - entries: ${this.cache.size}`
    );
    this.cache.clear();
  }

  /**
   * 병렬 처리 제한 설정
   */
  setParallelLimit(limit: number): void {
    this.reporter.info(`[NOTION] Updated parallel request limit to ${limit}`);
    this.parallelLimit = limit;
    this.limiter.setLimit(limit);
  }
}
