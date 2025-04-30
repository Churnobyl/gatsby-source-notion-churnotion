import { fetchGetWithRetry, fetchPostWithRetry } from "../../util/fetchData";
import { Reporter } from "gatsby";
import { BaseContentBlock } from "notion-types";

export interface NotionServiceOptions {
  reporter: Reporter;
  parallelLimit?: number;
  enableCaching?: boolean;
}

export class NotionService {
  private reporter: Reporter;
  private parallelLimit: number;
  private enableCaching: boolean;
  private cache: Map<string, any>;
  private limiter: any;

  constructor(options: NotionServiceOptions) {
    this.reporter = options.reporter;
    this.parallelLimit = options.parallelLimit || 5; // 기본 동시 요청 수
    this.enableCaching = options.enableCaching !== false; // 기본값은 캐싱 활성화
    this.cache = new Map();
    this.initLimiter();
  }

  private async initLimiter() {
    try {
      const pLimitModule = await import("p-limit");
      const pLimit = pLimitModule.default;
      this.limiter = pLimit(this.parallelLimit);
    } catch (error) {
      this.reporter.error(`Failed to initialize p-limit: ${error}`);
      this.limiter = this.createSimpleLimiter(this.parallelLimit);
    }
  }

  private createSimpleLimiter(limit: number) {
    let running = 0;
    const queue: Array<() => void> = [];

    const next = () => {
      running--;
      if (queue.length > 0) {
        const run = queue.shift();
        if (run) run();
      }
    };

    return (fn: () => Promise<any>) => {
      return new Promise((resolve, reject) => {
        const run = () => {
          running++;
          fn().then(resolve).catch(reject).finally(next);
        };

        if (running < limit) {
          run();
        } else {
          queue.push(run);
        }
      });
    };
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
      const result = await fetchPostWithRetry(databaseUrl, body);

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
   * 페이지의 자식 블록 가져오기
   */
  async getPageBlocks(pageId: string): Promise<BaseContentBlock[]> {
    const cacheKey = `page-blocks-${pageId}`;

    if (this.enableCaching && this.cache.has(cacheKey)) {
      this.reporter.info(`[CACHE] Using cached page blocks for ${pageId}`);
      return this.cache.get(cacheKey);
    }

    const pageUrl = `blocks/${pageId}/children?page_size=100`;

    try {
      const data = await fetchGetWithRetry(pageUrl);
      const blocks = data.results;

      if (this.enableCaching) {
        this.cache.set(cacheKey, blocks);
      }

      return blocks;
    } catch (error) {
      this.reporter.error(
        `[ERROR] Failed to get page blocks ${pageId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * 여러 페이지의 블록 병렬 처리
   */
  async getMultiplePagesBlocks(
    pageIds: string[]
  ): Promise<{ [id: string]: BaseContentBlock[] }> {
    if (!this.limiter) {
      await this.initLimiter();
    }

    this.reporter.info(
      `[NOTION] Fetching blocks for ${pageIds.length} pages in parallel (limit: ${this.parallelLimit})`
    );

    const tasks = pageIds.map((pageId) =>
      this.limiter(async () => {
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

    return results.reduce((acc, { pageId, blocks }) => {
      acc[pageId] = blocks;
      return acc;
    }, {} as { [id: string]: BaseContentBlock[] });
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
  async setParallelLimit(limit: number): Promise<void> {
    this.parallelLimit = limit;
    await this.initLimiter();
    this.reporter.info(`[NOTION] Updated parallel request limit to ${limit}`);
  }
}
