import { BaseContentBlock } from "notion-types";
import { BlockProcessor, ProcessBlockResult } from "./blockProcessor";

export class MediaBlockProcessor extends BlockProcessor {
  canProcess(block: BaseContentBlock): boolean {
    return ["bookmark", "embed", "video", "audio", "pdf", "file"].includes(
      block.type
    );
  }

  async process(block: BaseContentBlock): Promise<ProcessBlockResult> {
    const { reporter } = this.context;

    // 미디어 블록 타입 처리 로직
    const blockType = block.type;

    // 각 블록 타입에 맞는 특별한 처리가 필요한 경우 여기에 추가
    switch (blockType) {
      case "bookmark":
        reporter.info(
          `Processing bookmark block: ${JSON.stringify(
            (block as any).bookmark?.url
          )}`
        );
        break;
      case "embed":
        reporter.info(
          `Processing embed block: ${JSON.stringify((block as any).embed?.url)}`
        );
        break;
      case "video":
        reporter.info(
          `Processing video block with type: ${JSON.stringify(
            (block as any).video?.type
          )}`
        );
        break;
      case "audio":
        reporter.info(
          `Processing audio block with type: ${JSON.stringify(
            (block as any).audio?.type
          )}`
        );
        break;
      case "pdf":
        reporter.info(
          `Processing pdf block with type: ${JSON.stringify(
            (block as any).pdf?.type
          )}`
        );
        break;
      case "file":
        reporter.info(
          `Processing file block with type: ${JSON.stringify(
            (block as any).file?.type
          )}`
        );
        break;
    }

    // 블록의 텍스트 컨텐츠를 추출하려고 시도합니다.
    let plainText = "";

    // bookmark와 같은 일부 블록은 캡션에 텍스트가 있을 수 있습니다.
    if (blockType === "bookmark" && (block as any).bookmark?.caption) {
      plainText = (block as any).bookmark.caption
        .map((item: any) => item.plain_text)
        .join(" ");
    }

    return {
      plainText,
      updatedBlock: block,
    };
  }
}
