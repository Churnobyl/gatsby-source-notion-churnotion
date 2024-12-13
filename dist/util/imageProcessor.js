"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBlocks = void 0;
const gatsby_source_filesystem_1 = require("gatsby-source-filesystem");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const processBlocks = async (blocks, actions, getCache, createNodeId, reporter) => {
    const { createNode } = actions;
    for (const block of blocks) {
        // 이미지 블록 처리
        if (block.type === `image` &&
            typeof block.parent === `string` &&
            block.parent.includes(`http`)) {
            const match = block.parent.match(/\((https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))\)/);
            if (match) {
                const imageUrl = match[1]; // 이미지 URL 추출
                try {
                    // 해싱된 파일명 생성
                    const fileExtension = path_1.default.extname(imageUrl); // 확장자 추출
                    const hashedFileName = crypto_1.default.createHash(`md5`).update(imageUrl).digest(`hex`) +
                        fileExtension;
                    // 파일 생성
                    const fileNode = await (0, gatsby_source_filesystem_1.createRemoteFileNode)({
                        url: imageUrl,
                        parentNodeId: block.blockId, // 블록 ID를 부모로 설정
                        getCache,
                        createNode,
                        createNodeId,
                        name: hashedFileName,
                    });
                    if (fileNode) {
                        const relativePath = `/static/images/${hashedFileName}`; // 해싱된 파일명을 사용
                        block.parent = `![${hashedFileName}](${relativePath})`; // Markdown 형식으로 업데이트
                        reporter.info(`[SUCCESS] Updated block with new hashed image path: ${block.parent}`);
                    }
                }
                catch (error) {
                    reporter.warn(`[WARNING] Failed to download image: ${imageUrl}`);
                }
            }
        }
    }
};
exports.processBlocks = processBlocks;
