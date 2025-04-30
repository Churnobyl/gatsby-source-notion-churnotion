export type { IPluginOptions } from "./types";

export { onPluginInit } from "./onPluginInit";
export { sourceNodes } from "./source-nodes";
export { createSchemaCustomization } from "./createSchemaCustomization";
export { onPostBootstrap } from "./onPostBootstrap";

// Set priority to ensure onPostBootstrap runs before any createPages functions
export const createPagesStatefully = async (...args: any[]) => {
  // This is a placeholder function that does nothing
  // It exists only to set the waitFor property
};

// Wait for onPostBootstrap to complete before running createPages
createPagesStatefully.waitFor = ["onPostBootstrap"];
