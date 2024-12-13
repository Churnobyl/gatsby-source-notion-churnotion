import { createRemoteFileNode } from "gatsby-source-filesystem";
import path from "path";
import crypto from "crypto";
import { Actions, GatsbyCache, Reporter } from "gatsby";
import { MdBlock } from "notion-to-md/build/types";

export const processBlocks = async (
  blocks: MdBlock[],
  actions: Actions,
  getCache: (this: void, id: string) => GatsbyCache,
  createNodeId: (this: void, input: string) => string,
  reporter: Reporter
) => {
  const { createNode } = actions;

  for (const block of blocks) {
    // 이미지 블록 처리
    if (
      block.type === `image` &&
      typeof block.parent === `string` &&
      block.parent.includes(`http`)
    ) {
      const match = block.parent.match(
        /\((https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))\)/
      );
      if (match) {
        const imageUrl = match[1]; // 이미지 URL 추출
        try {
          // 해싱된 파일명 생성
          const fileExtension = path.extname(imageUrl); // 확장자 추출
          const hashedFileName =
            crypto.createHash(`md5`).update(imageUrl).digest(`hex`) +
            fileExtension;

          // 파일 생성
          const fileNode = await createRemoteFileNode({
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
            reporter.info(
              `[SUCCESS] Updated block with new hashed image path: ${block.parent}`
            );
          }
        } catch (error) {
          reporter.warn(`[WARNING] Failed to download image: ${imageUrl}`);
        }
      }
    }
  }
};
