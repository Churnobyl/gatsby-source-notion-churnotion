import { Actions, GatsbyCache, Reporter } from "gatsby";
import { createRemoteFileNode } from "gatsby-source-filesystem";
import { BaseContentBlock } from "notion-types";
import { processMetadata } from "./metadataProcessor";
import { processTableOfContents } from "./tableOfContent";
import { CustomImageBlock } from "../types";

export const processor = async (
  blocks: BaseContentBlock[],
  actions: Actions,
  getCache: (this: void, id: string) => GatsbyCache,
  createNodeId: (this: void, input: string) => string,
  reporter: Reporter,
  cache: GatsbyCache
): Promise<
  [
    string | null,
    { type: string; hash: string; title: string }[],
    BaseContentBlock[],
    string
  ]
> => {
  const { thumbnail, tableOfContents, updatedBlocks, rawText } =
    await processBlocksForContent(
      blocks,
      actions,
      getCache,
      createNodeId,
      reporter,
      cache
    );

  await processMetadata(blocks, actions, createNodeId, reporter, cache);

  return [thumbnail, tableOfContents, updatedBlocks, rawText];
};

const processBlocksForContent = async (
  blocks: BaseContentBlock[],
  actions: Actions,
  getCache: (this: void, id: string) => GatsbyCache,
  createNodeId: (this: void, input: string) => string,
  reporter: Reporter,
  cache: GatsbyCache
) => {
  const tableOfContents: { type: string; hash: string; title: string }[] = [];
  let thumbnail: string | null = null;
  let rawText = "";

  const updatedBlocks = (
    await Promise.all(
      blocks.map(async (block) => {
        await processTableOfContents(block, tableOfContents);

        const plainText = extractPlainText(block);
        if (plainText) {
          rawText += plainText + " ";
        }

        if (isImageBlock(block)) {
          const updatedBlock = await processImageBlock(
            block,
            actions,
            getCache,
            createNodeId,
            reporter,
            cache
          );

          if (!thumbnail && updatedBlock?.image?.fileId) {
            thumbnail = updatedBlock.image.fileId;
          }

          return updatedBlock;
        }
        return block;
      })
    )
  ).filter((block): block is BaseContentBlock => block !== null);

  return { thumbnail, tableOfContents, updatedBlocks, rawText };
};

const isTextContentBlock = (
  block: BaseContentBlock
): block is BaseContentBlock & {
  [key in
    | "paragraph"
    | "heading_1"
    | "heading_2"
    | "heading_3"
    | "quote"
    | "bulleted_list_item"
    | "numbered_list_item"
    | "callout"
    | "code"]?: {
    rich_text: { plain_text: string }[];
  };
} => {
  return [
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "quote",
    "bulleted_list_item",
    "numbered_list_item",
    "callout",
    "code",
  ].includes(block.type);
};

const extractPlainText = (block: BaseContentBlock): string | null => {
  if (isTextContentBlock(block)) {
    const richTextArray = (block as any)[block.type]?.rich_text || [];
    return richTextArray
      .map((text: any) =>
        block.type === "code" // code의 \n 제거
          ? text.plain_text.replace(/\\n/g, "")
          : text.plain_text
      )
      .join(" ");
  }
  return null;
};

const isImageBlock = (block: BaseContentBlock): block is CustomImageBlock => {
  return block.type === "image" && "image" in block;
};

const processImageBlock = async (
  block: CustomImageBlock,
  actions: Actions,
  getCache: (this: void, id: string) => GatsbyCache,
  createNodeId: (this: void, input: string) => string,
  reporter: Reporter,
  cache: GatsbyCache
) => {
  const { createNode } = actions;

  if (block.type === "image" && "image" in block) {
    const imageSourceType = block.image.type;
    const imageUrl =
      imageSourceType === `external`
        ? block.image.external?.url
        : block.image?.file?.url;

    if (!imageUrl) return null;

    const cacheKey = `${imageUrl}-post-image`;
    const cachedFileNodeId = await cache.get(cacheKey);

    if (cachedFileNodeId) {
      reporter.info(`[CACHE HIT] Image already processed: ${imageUrl}`);
      const updatedBlock = {
        ...block,
        image: {
          fileId: cachedFileNodeId,
          caption: block.image.caption,
        },
      } as CustomImageBlock;

      return updatedBlock;
    }

    try {
      const fileNode = await createRemoteFileNode({
        url: imageUrl,
        parentNodeId: block.id,
        getCache,
        createNode,
        createNodeId,
      });

      if (fileNode) {
        const updatedBlock = {
          ...block,
          image: {
            fileId: fileNode.id,
            caption: block.image.caption,
          },
        } as CustomImageBlock;

        reporter.info(`[SUCCESS] Image processed: ${fileNode.id}`);

        await cache.set(cacheKey, fileNode.id);

        return updatedBlock;
      }
    } catch (error) {
      reporter.warn(`[WARNING] Failed to download image: ${imageUrl}`);
    }
  }

  return null;
};
