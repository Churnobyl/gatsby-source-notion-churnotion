import { BaseContentBlock } from "notion-types";
import {
  BlockProcessor,
  BlockProcessorContext,
  ProcessBlockResult,
} from "./blockProcessor";
import { TextBlockProcessor } from "./textBlockProcessor";
import { ImageBlockProcessor } from "./imageBlockProcessor";
import { MediaBlockProcessor } from "./mediaBlockProcessor";
import { StructureBlockProcessor } from "./structureBlockProcessor";

export class BlockProcessorRegistry {
  private processors: BlockProcessor[] = [];
  private context: BlockProcessorContext;

  constructor(context: BlockProcessorContext) {
    this.context = context;
    this.registerDefaultProcessors();
  }

  private registerDefaultProcessors() {
    // 기본 프로세서 등록
    this.registerProcessor(new TextBlockProcessor(this.context));
    this.registerProcessor(new ImageBlockProcessor(this.context));
    this.registerProcessor(new MediaBlockProcessor(this.context));
    this.registerProcessor(new StructureBlockProcessor(this.context));
  }

  public registerProcessor(processor: BlockProcessor) {
    this.processors.push(processor);
  }

  public async processBlock(
    block: BaseContentBlock
  ): Promise<ProcessBlockResult> {
    for (const processor of this.processors) {
      if (processor.canProcess(block)) {
        return await processor.process(block);
      }
    }

    // 어떤 프로세서도 처리할 수 없는 경우 (디버깅을 위해 타입 로그)
    this.context.reporter.warn(`Unsupported block type: ${block.type}`);

    // 기본 결과 반환
    return {
      updatedBlock: block,
      plainText: "",
    };
  }
}
