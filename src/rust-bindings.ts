/**
 * This file provides TypeScript bindings to the Rust implementation
 * of parallel Notion API processing.
 */
import { Reporter } from "gatsby";

// Use dynamic import with try-catch to handle module loading
let notionParallel: any = null;

try {
  // When the compiled Rust library exists, load it
  notionParallel = require("../rust/notion-parallel/index.node");
} catch (error) {
  console.warn(
    "Rust bindings for notion-parallel not found. Using TypeScript fallback implementation."
  );
}

/**
 * Notion Block type from the Notion API
 */
export type NotionBlock = any;

/**
 * Options for the RustNotionService
 */
export interface RustNotionServiceOptions {
  reporter: Reporter;
  notionApiKey: string;
  parallelLimit?: number;
  enableCaching?: boolean;
}

/**
 * A wrapper class that provides access to the Rust implementation
 * of parallel processing for Notion API, with a fallback to the
 * TypeScript implementation if the Rust module is not available.
 */
export class RustNotionService {
  private reporter: Reporter;
  private notionApiKey: string;
  private parallelLimit: number;
  private enableCaching: boolean;
  private cache: Map<string, any>;
  private rustInstance: any | null = null;

  constructor(options: RustNotionServiceOptions) {
    this.reporter = options.reporter;
    this.notionApiKey = options.notionApiKey;
    this.parallelLimit = options.parallelLimit || 5;
    this.enableCaching = options.enableCaching !== false;
    this.cache = new Map();

    // Initialize Rust instance if available
    if (notionParallel) {
      try {
        this.rustInstance = new notionParallel.NotionParallel(
          this.notionApiKey,
          this.parallelLimit
        );
        this.reporter.info(
          `[RUST] Initialized Rust-based parallel processing with limit: ${this.parallelLimit}`
        );
      } catch (error) {
        this.reporter.warn(
          `[RUST] Failed to initialize Rust implementation: ${error}`
        );
        this.rustInstance = null;
      }
    }
  }

  /**
   * Get blocks for a single page, with recursive fetching of child blocks
   */
  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    const cacheKey = `page-blocks-${pageId}`;

    if (this.enableCaching && this.cache.has(cacheKey)) {
      this.reporter.info(`[CACHE] Using cached page blocks for ${pageId}`);
      return this.cache.get(cacheKey);
    }

    // Currently we don't have a direct Rust counterpart for a single page
    // So we use the multiple pages method with a single ID
    const results = await this.getMultiplePagesBlocks([pageId]);
    const blocks = results[pageId] || [];

    if (this.enableCaching) {
      this.cache.set(cacheKey, blocks);
    }

    return blocks;
  }

  /**
   * Get blocks for multiple pages in parallel, using Rust implementation if available
   */
  async getMultiplePagesBlocks(
    pageIds: string[]
  ): Promise<{ [id: string]: NotionBlock[] }> {
    this.reporter.info(
      `[NOTION] Fetching blocks for ${pageIds.length} pages in parallel (limit: ${this.parallelLimit})`
    );

    // If Rust implementation is available and initialized, use it
    if (this.rustInstance) {
      try {
        this.reporter.info(
          `[RUST] Using Rust implementation for parallel processing`
        );
        const results = await this.rustInstance.getMultiplePagesBlocks(pageIds);
        return results;
      } catch (error) {
        this.reporter.warn(
          `[RUST] Error using Rust implementation, falling back to TypeScript: ${error}`
        );
        // Fall back to TypeScript implementation
      }
    }

    // Fallback to TypeScript implementation
    // Import the TypeScript implementation dynamically
    const { NotionService } = await import("./api/service/notionService");

    // Create a NotionService instance with the same configuration
    const tsService = new NotionService({
      reporter: this.reporter,
      parallelLimit: this.parallelLimit,
      enableCaching: this.enableCaching,
    });

    return tsService.getMultiplePagesBlocks(pageIds);
  }

  /**
   * Set the parallel processing limit
   */
  setParallelLimit(limit: number): void {
    this.reporter.info(`[NOTION] Updated parallel request limit to ${limit}`);
    this.parallelLimit = limit;

    // Update the Rust instance if available
    if (this.rustInstance) {
      this.rustInstance.setParallelLimit(limit);
    }
  }
}
