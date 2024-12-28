"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBlocks = void 0;
const gatsby_source_filesystem_1 = require("gatsby-source-filesystem");
function isImageBlock(block) {
    return block.type === "image" && "image" in block;
}
const processBlocks = async (blocks, actions, getCache, createNodeId, reporter) => {
    const { createNode } = actions;
    let thumbnail = null;
    for (const block of blocks) {
        if (isImageBlock(block)) {
            const imageSourceType = block.image.type;
            const imageUrl = imageSourceType === `external`
                ? block.image.external?.url
                : block.image?.file?.url;
            if (!imageUrl)
                continue;
            reporter.info(`[Image] got image > ${imageUrl}`);
            try {
                const fileNode = await (0, gatsby_source_filesystem_1.createRemoteFileNode)({
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
                    };
                    if (!thumbnail)
                        thumbnail = fileNode.id;
                    reporter.info(`[SUCCESS] Image processed: ${fileNode.id}`);
                }
            }
            catch (error) {
                reporter.warn(`[WARNING] Failed to download image: ${imageUrl}`);
            }
        }
    }
    return thumbnail;
};
exports.processBlocks = processBlocks;
