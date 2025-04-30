export type { IPluginOptions } from "./types";
export { onPluginInit } from "./onPluginInit";
export { sourceNodes } from "./source-nodes";
export { createSchemaCustomization } from "./createSchemaCustomization";
export { onPostBootstrap } from "./onPostBootstrap";
export declare const createPagesStatefully: {
    (...args: any[]): Promise<void>;
    waitFor: string[];
};
