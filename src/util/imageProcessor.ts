import { Actions, GatsbyCache, Reporter } from "gatsby";
import { createRemoteFileNode } from "gatsby-source-filesystem";
import { BaseContentBlock } from "notion-types";
import { CustomImageBlock } from "../types";

function isImageBlock(block: BaseContentBlock): block is CustomImageBlock {
  return block.type === "image" && "image" in block;
}

export const processBlocks = async (
  blocks: BaseContentBlock[],
  actions: Actions,
  getCache: (this: void, id: string) => GatsbyCache,
  createNodeId: (this: void, input: string) => string,
  reporter: Reporter
) => {
  const { createNode } = actions;
  let thumbnail = null;

  for (const block of blocks) {
    if (isImageBlock(block)) {
      const imageSourceType = block.image.type;

      const imageUrl =
        imageSourceType === `external`
          ? block.image.external?.url
          : block.image?.file?.url;

      if (!imageUrl) continue;

      reporter.info(`[Image] got image > ${imageUrl}`);
      try {
        const fileNode = await createRemoteFileNode({
          url: imageUrl,
          parentNodeId: block.id,
          getCache,
          createNode,
          createNodeId,
        });

        if (fileNode) {
          block.image = {
            fileId: fileNode.id,
            caption: block.image.caption,
          } as any;

          if (!thumbnail) thumbnail = fileNode.id;

          reporter.info(`[SUCCESS] Image processed: ${fileNode.id}`);
        }
      } catch (error) {
        reporter.warn(`[WARNING] Failed to download image: ${imageUrl}`);
      }
    }
  }

  return thumbnail;
};
