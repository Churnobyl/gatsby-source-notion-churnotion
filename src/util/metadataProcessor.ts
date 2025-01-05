import crypto from "crypto";
import { Actions, GatsbyCache, Reporter } from "gatsby";
import metascraper from "metascraper";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperTitle from "metascraper-title";
import metascraperUrl from "metascraper-url";
import { NODE_TYPE } from "../constants";

const scraper = metascraper([
  metascraperUrl(),
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
]);

export const processMetadata = async (
  blocks: any[],
  actions: Actions,
  createNodeId: (input: string) => string,
  reporter: Reporter,
  cache: GatsbyCache
) => {
  const { createNode } = actions;

  for (const block of blocks) {
    if (
      block.type === "text" ||
      block.type === "paragraph" ||
      block.type === "bulleted_list_item" ||
      block.type === "numbered_list_item" ||
      block.type === "quote" ||
      block.type === "callout"
    ) {
      const richText = block[block.type]?.rich_text || [];

      for (const text of richText) {
        const href = text.href;

        if (href) {
          try {
            reporter.info(`[INFO] Processing metadata for URL: ${href}`);

            const cacheKey = `metadata-${crypto
              .createHash("md5")
              .update(href)
              .digest("hex")}`;

            const cachedMetadata = await cache.get(cacheKey);

            if (cachedMetadata) {
              reporter.info(`[INFO] Using cached metadata for URL: ${href}`);
              text.href = cachedMetadata.nodeId;
              continue;
            }

            reporter.info(`[INFO] Fetching metadata for URL: ${href}`);
            const response = await fetch(href, {
              headers: { "User-Agent": "Mozilla/5.0" },
            });
            const html = await response.text();
            const metadata = await scraper({ html, url: href });

            const nodeId = createNodeId(
              `${crypto.createHash("md5").update(href).digest("hex")}-metadata`
            );

            const metadataNode = {
              id: nodeId,
              parent: null,
              children: [],
              internal: {
                type: NODE_TYPE.Metadata,
                contentDigest: crypto
                  .createHash("md5")
                  .update(JSON.stringify(metadata))
                  .digest("hex"),
              },
              title: metadata.title || "",
              description: metadata.description || "",
              image: metadata.image || "",
              url: metadata.url || href,
            };

            createNode(metadataNode);

            reporter.info(`[SUCCESS] Created metadata node for URL: ${href}`);

            await cache.set(cacheKey, { ...metadata, nodeId });

            text.href = nodeId;
          } catch (error: unknown) {
            if (error instanceof Error) {
              reporter.error(
                `[ERROR] Failed to fetch metadata for URL: ${href}`,
                error
              );
            } else {
              console.error("Unknown error fetching metadata:", error);
            }
          }
        }
      }
    }
  }

  return blocks;
};
