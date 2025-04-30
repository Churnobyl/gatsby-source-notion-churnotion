import { BaseContentBlock } from "notion-types";
import { Actions, GatsbyCache, Reporter } from "gatsby";
import { CustomImageBlock } from "../../types";

export interface BlockProcessorContext {
  actions: Actions;
  getCache: (this: void, id: string) => GatsbyCache;
  createNodeId: (this: void, input: string) => string;
  reporter: Reporter;
  cache: GatsbyCache;
}

export interface ProcessBlockResult {
  thumbnail?: string | null;
  plainText?: string;
  updatedBlock?: BaseContentBlock;
  tableOfContents?: { type: string; hash: string; title: string }[];
}

export abstract class BlockProcessor {
  protected context: BlockProcessorContext;

  constructor(context: BlockProcessorContext) {
    this.context = context;
  }

  abstract canProcess(block: BaseContentBlock): boolean;

  abstract process(block: BaseContentBlock): Promise<ProcessBlockResult>;

  protected extractPlainText(block: BaseContentBlock): string | null {
    if (this.isTextContentBlock(block)) {
      const richTextArray = (block as any)[block.type]?.rich_text || [];
      return richTextArray
        .map((text: any) =>
          block.type === "code" // code의 \n 제거
            ? text.plain_text.replace(/\\n/g, "")
            : text.plain_text
        )
        .join(" ");
    }
    return null;
  }

  protected isTextContentBlock(
    block: BaseContentBlock
  ): block is BaseContentBlock & {
    [key in
      | "paragraph"
      | "heading_1"
      | "heading_2"
      | "heading_3"
      | "quote"
      | "bulleted_list_item"
      | "numbered_list_item"
      | "callout"
      | "code"
      | "toggle"
      | "to_do"
      | "bookmark"
      | "table_of_contents"
      | "breadcrumb"
      | "divider"
      | "embed"]?: {
      rich_text: { plain_text: string }[];
    };
  } {
    return [
      "paragraph",
      "heading_1",
      "heading_2",
      "heading_3",
      "quote",
      "bulleted_list_item",
      "numbered_list_item",
      "callout",
      "code",
      "toggle",
      "to_do",
      "bookmark",
      "table_of_contents",
      "breadcrumb",
      "divider",
      "embed",
    ].includes(block.type);
  }

  protected isImageBlock(block: BaseContentBlock): block is CustomImageBlock {
    return block.type === "image" && "image" in block;
  }
}
