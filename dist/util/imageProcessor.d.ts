import { Actions, GatsbyCache, Reporter } from "gatsby";
import { BaseContentBlock } from "notion-types";
export declare const processBlocks: (blocks: BaseContentBlock[], actions: Actions, getCache: (this: void, id: string) => GatsbyCache, createNodeId: (this: void, input: string) => string, reporter: Reporter) => Promise<string | null>;
