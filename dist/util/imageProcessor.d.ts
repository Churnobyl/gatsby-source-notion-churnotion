import { Actions, GatsbyCache, Reporter } from "gatsby";
import { MdBlock } from "notion-to-md/build/types";
export declare const processBlocks: (blocks: MdBlock[], actions: Actions, getCache: (this: void, id: string) => GatsbyCache, createNodeId: (this: void, input: string) => string, reporter: Reporter) => Promise<string | null>;
