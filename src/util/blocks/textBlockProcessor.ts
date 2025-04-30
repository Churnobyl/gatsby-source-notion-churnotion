import { BaseContentBlock } from "notion-types";
import { BlockProcessor, ProcessBlockResult } from "./blockProcessor";
import { processTableOfContents } from "../tableOfContent";

export class TextBlockProcessor extends BlockProcessor {
  canProcess(block: BaseContentBlock): boolean {
    return this.isTextContentBlock(block);
  }

  async process(block: BaseContentBlock): Promise<ProcessBlockResult> {
    const tableOfContents: { type: string; hash: string; title: string }[] = [];

    // 목차 처리
    await processTableOfContents(block, tableOfContents);

    // 텍스트 추출
    const plainText = this.extractPlainText(block);

    return {
      plainText: plainText || "",
      updatedBlock: block,
      tableOfContents: tableOfContents.length > 0 ? tableOfContents : undefined,
    };
  }
}
