"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBlocks = void 0;
const gatsby_source_filesystem_1 = require("gatsby-source-filesystem");
const processBlocks = async (blocks, actions, getCache, createNodeId, reporter) => {
    const { createNode } = actions;
    let thumbnail = null;
    for (const block of blocks) {
        if (block.type === `image` &&
            typeof block.parent === `string` &&
            block.parent.includes(`http`)) {
            const match = block.parent.match(/\((https?:\/\/.*?)\)/);
            if (match) {
                const imageUrl = match[1];
                reporter.info(`[Image] got image > ${imageUrl}`);
                try {
                    const fileNode = await (0, gatsby_source_filesystem_1.createRemoteFileNode)({
                        url: imageUrl,
                        parentNodeId: block.blockId,
                        getCache,
                        createNode,
                        createNodeId,
                    });
                    if (fileNode) {
                        block.parent = fileNode.id;
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
    }
    return thumbnail;
};
exports.processBlocks = processBlocks;
