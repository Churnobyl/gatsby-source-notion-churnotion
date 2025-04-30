import { Actions, GatsbyCache, Reporter } from "gatsby";
import { BaseContentBlock } from "notion-types";
import { processMetadata } from "./metadataProcessor";
import { BlockProcessorRegistry, BlockProcessorContext } from "./blocks";

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
  const context: BlockProcessorContext = {
    actions,
    getCache,
    createNodeId,
    reporter,
    cache,
  };

  // 블록 프로세서 레지스트리 생성
  const processorRegistry = new BlockProcessorRegistry(context);

  const tableOfContents: { type: string; hash: string; title: string }[] = [];
  let thumbnail: string | null = null;
  let rawText = "";
  const updatedBlocks: BaseContentBlock[] = [];

  // 첫 번째 이미지 블록을 찾아 썸네일로 사용
  let firstImageIndex = blocks.findIndex((block) => block.type === "image");

  // 블록 처리
  const processResults = await Promise.all(
    blocks.map(async (block, index) => {
      const result = await processorRegistry.processBlock(block);

      // 썸네일 처리
      if (index === firstImageIndex && result.thumbnail) {
        thumbnail = result.thumbnail;
      }

      // 텍스트 데이터 추가
      if (result.plainText) {
        rawText += result.plainText + " ";
      }

      // 목차 데이터 추가
      if (result.tableOfContents) {
        tableOfContents.push(...result.tableOfContents);
      }

      return result;
    })
  );

  // 업데이트된 블록 적용
  processResults.forEach((result, index) => {
    if (result.updatedBlock) {
      updatedBlocks[index] = result.updatedBlock;
    } else {
      updatedBlocks[index] = blocks[index];
    }
  });

  return { thumbnail, tableOfContents, updatedBlocks, rawText };
};
