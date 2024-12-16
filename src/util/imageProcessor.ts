import { Actions, GatsbyCache, Reporter } from "gatsby";
import { createRemoteFileNode } from "gatsby-source-filesystem";
import { MdBlock } from "notion-to-md/build/types";
import path from "path";

export const processBlocks = async (
  blocks: MdBlock[],
  actions: Actions,
  getCache: (this: void, id: string) => GatsbyCache,
  createNodeId: (this: void, input: string) => string,
  reporter: Reporter
) => {
  const { createNode } = actions;
  let thumbnail = null;

  for (const block of blocks) {
    if (
      block.type === `image` &&
      typeof block.parent === `string` &&
      block.parent.includes(`http`)
    ) {
      const match = block.parent.match(/\((https?:\/\/.*?)\)/);
      if (match) {
        const imageUrl = match[1];
        reporter.info(`[Image] got image > ${imageUrl}`);
        try {
          const fileNode = await createRemoteFileNode({
            url: imageUrl,
            parentNodeId: block.blockId,
            getCache,
            createNode,
            createNodeId,
          });

          if (fileNode) {
            block.parent = fileNode.id;
            if (!thumbnail) thumbnail = fileNode.id;

            reporter.info(`[SUCCESS] Image processed: ${fileNode.id}`);
          }
        } catch (error) {
          reporter.warn(`[WARNING] Failed to download image: ${imageUrl}`);
        }
      }
    }
  }

  return thumbnail;
};
