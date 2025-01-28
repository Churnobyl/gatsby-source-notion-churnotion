import { Actions, GatsbyCache, Reporter } from "gatsby";
import { createRemoteFileNode } from "gatsby-source-filesystem";
import { BaseContentBlock } from "notion-types";
import { processMetadata } from "./metadataProcessor";
import { processTableOfContents } from "./tableOfContent";
import { CustomImageBlock } from "../types";
import fs from "fs-extra";
import path from "path";

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
  const updatedBlocks: BaseContentBlock[] = [];
  let firstImageBlock: BaseContentBlock | null = null;

  for (const block of blocks) {
    if (isImageBlock(block)) {
      firstImageBlock = block;
      break;
    }
  }

  if (firstImageBlock) {
    const updatedBlock = await processImageBlock(
      firstImageBlock as CustomImageBlock,
      actions,
      getCache,
      createNodeId,
      reporter,
      cache
    );

    if (updatedBlock?.image?.fileId) {
      thumbnail = updatedBlock.image.fileId;
    }

    updatedBlocks[blocks.indexOf(firstImageBlock)] =
      updatedBlock || firstImageBlock;
  }

  await Promise.all(
    blocks.map(async (block, index) => {
      if (block === firstImageBlock) return;

      await processTableOfContents(block, tableOfContents);

      const plainText = extractPlainText(block);
      if (plainText) {
        rawText += plainText + " ";
      }

      if (isImageBlock(block)) {
        const updatedBlock = await processImageBlock(
          block as CustomImageBlock,
          actions,
          getCache,
          createNodeId,
          reporter,
          cache
        );

        updatedBlocks[index] = updatedBlock || block;
      } else {
        updatedBlocks[index] = block;
      }
    })
  );

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

    // GIF 파일 처리
    if (imageUrl.endsWith(".gif")) {
      const staticDir = path.join(process.cwd(), "static"); // Gatsby의 static 디렉토리
      const gifFileName = path.basename(imageUrl); // 파일 이름 추출
      const gifFilePath = path.join(staticDir, gifFileName);

      // 이미 static 디렉토리에 파일이 있는지 확인
      if (!fs.existsSync(gifFilePath)) {
        try {
          reporter.info(`[GIF PROCESSING] Downloading GIF: ${imageUrl}`);
          const response = await fetch(imageUrl);

          if (!response.ok) {
            throw new Error(`Failed to download GIF: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.ensureDir(staticDir); // static 디렉토리 생성
          await fs.writeFile(gifFilePath, buffer); // GIF 파일 저장

          reporter.info(`[GIF SUCCESS] Saved GIF to static: ${gifFilePath}`);
        } catch (error) {
          reporter.warn(`[GIF WARNING] Failed to process GIF: ${imageUrl}`);
          return null;
        }
      } else {
        reporter.info(`[GIF CACHE HIT] GIF already exists: ${gifFilePath}`);
      }

      // GIF 파일을 정적 파일로 추가
      const updatedBlock = {
        ...block,
        image: {
          fileId: gifFileName, // static 경로를 기준으로 참조
          caption: block.image.caption,
        },
      } as CustomImageBlock;

      return updatedBlock;
    }

    // GIF가 아닌 경우 기존 로직 유지
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
