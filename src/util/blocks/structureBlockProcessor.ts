import { BaseContentBlock } from "notion-types";
import { BlockProcessor, ProcessBlockResult } from "./blockProcessor";

export class StructureBlockProcessor extends BlockProcessor {
  canProcess(block: BaseContentBlock): boolean {
    return [
      "column",
      "column_list",
      "table",
      "table_row",
      "divider",
      "breadcrumb",
      "table_of_contents",
      "equation",
      "synced_block",
      "template",
      "link_to_page",
      "link_preview",
    ].includes(block.type);
  }

  async process(block: BaseContentBlock): Promise<ProcessBlockResult> {
    const { reporter } = this.context;

    // 구조 블록 타입 처리 로직
    const blockType = block.type;

    // 각 블록 타입에 맞는 특별한 처리가 필요한 경우 여기에 추가
    switch (blockType) {
      case "column":
        reporter.info(`Processing column block`);
        break;
      case "column_list":
        reporter.info(`Processing column_list block`);
        break;
      case "table":
        reporter.info(
          `Processing table block: table_width=${JSON.stringify(
            (block as any).table?.table_width
          )}`
        );
        break;
      case "table_row":
        const cellCount = (block as any).table_row?.cells?.length || 0;
        reporter.info(`Processing table_row block with ${cellCount} cells`);
        break;
      case "divider":
        reporter.info(`Processing divider block`);
        break;
      case "breadcrumb":
        reporter.info(`Processing breadcrumb block`);
        break;
      case "table_of_contents":
        reporter.info(`Processing table_of_contents block`);
        break;
      case "equation":
        reporter.info(
          `Processing equation block: ${JSON.stringify(
            (block as any).equation?.expression
          )}`
        );
        break;
      case "synced_block":
        reporter.info(`Processing synced_block`);
        break;
      case "template":
        reporter.info(`Processing template block`);
        break;
      case "link_to_page":
        reporter.info(`Processing link_to_page block`);
        break;
      case "link_preview":
        reporter.info(
          `Processing link_preview block: ${JSON.stringify(
            (block as any).link_preview?.url
          )}`
        );
        break;
    }

    // 일부 구조 블록은 텍스트를 포함할 수 있음
    let plainText = "";

    // 테이블 셀에서 텍스트 추출 예시
    if (blockType === "table_row" && (block as any).table_row?.cells) {
      plainText = (block as any).table_row.cells
        .flat()
        .map((cell: any) => cell.plain_text || "")
        .join(" ");
    }

    return {
      plainText,
      updatedBlock: block,
    };
  }
}
