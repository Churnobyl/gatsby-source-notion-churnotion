import { BaseContentBlock } from "notion-types";

export const processTableOfContents = async (
  block: BaseContentBlock,
  tableOfContents: { type: string; hash: string; title: string }[]
) => {
  if (
    ["heading_1", "heading_2", "heading_3"].includes(block.type) &&
    (block as any)[block.type]?.rich_text?.length > 0
  ) {
    const plainText =
      (block as any)[block.type]?.rich_text?.[0]?.plain_text || "";
    const hash = `link-${plainText
      .replace(/[^a-zA-Z0-9가-힣\s-_]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()}`;
    (block as any).hash = hash;

    tableOfContents.push({
      type: block.type,
      hash,
      title: plainText,
    });
  }
};
