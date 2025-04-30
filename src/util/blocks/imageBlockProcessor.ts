import { BaseContentBlock } from "notion-types";
import { BlockProcessor, ProcessBlockResult } from "./blockProcessor";
import { CustomImageBlock } from "../../types";
import fs from "fs-extra";
import path from "path";
import { createRemoteFileNode } from "gatsby-source-filesystem";

export class ImageBlockProcessor extends BlockProcessor {
  canProcess(block: BaseContentBlock): boolean {
    return this.isImageBlock(block);
  }

  async process(block: BaseContentBlock): Promise<ProcessBlockResult> {
    const { actions, getCache, createNodeId, reporter, cache } = this.context;
    const { createNode } = actions;

    const imageBlock = block as CustomImageBlock;

    if (block.type === "image" && "image" in block) {
      const imageSourceType = imageBlock.image.type;
      const imageUrl =
        imageSourceType === `external`
          ? imageBlock.image.external?.url
          : imageBlock.image?.file?.url;

      if (!imageUrl) return { updatedBlock: block };

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
            return { updatedBlock: block };
          }
        } else {
          reporter.info(`[GIF CACHE HIT] GIF already exists: ${gifFilePath}`);
        }

        // GIF 파일을 정적 파일로 추가
        const updatedBlock = {
          ...imageBlock,
          image: {
            fileId: gifFileName, // static 경로를 기준으로 참조
            caption: imageBlock.image.caption,
          },
        } as CustomImageBlock;

        return {
          updatedBlock: updatedBlock,
          thumbnail: gifFileName,
        };
      }

      // GIF가 아닌 경우 기존 로직 유지
      const cacheKey = `${imageUrl}-post-image`;
      const cachedFileNodeId = await cache.get(cacheKey);

      if (cachedFileNodeId) {
        reporter.info(`[CACHE HIT] Image already processed: ${imageUrl}`);
        const updatedBlock = {
          ...imageBlock,
          image: {
            fileId: cachedFileNodeId,
            caption: imageBlock.image.caption,
          },
        } as CustomImageBlock;

        return {
          updatedBlock: updatedBlock,
          thumbnail: cachedFileNodeId,
        };
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
          await cache.set(cacheKey, fileNode.id);

          const updatedBlock = {
            ...imageBlock,
            image: {
              fileId: fileNode.id,
              caption: imageBlock.image.caption,
            },
          } as CustomImageBlock;

          return {
            updatedBlock: updatedBlock,
            thumbnail: fileNode.id,
          };
        }
      } catch (error) {
        reporter.warn(
          `[WARNING] Failed to download or process image: ${imageUrl}`
        );
      }
    }

    return { updatedBlock: block };
  }
}
