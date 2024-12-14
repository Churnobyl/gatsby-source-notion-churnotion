import type { GatsbyNode, PluginOptions } from "gatsby";
import { getPages } from "./api/getPage";

interface ISourceNodesOptions extends PluginOptions {
  token: string;
  databaseId: string;
}

export const sourceNodes: GatsbyNode["sourceNodes"] = async (
  gatsbyApi,
  options: ISourceNodesOptions
) => {
  const { actions, reporter, createNodeId, getNode, getCache } = gatsbyApi;
  const { createNode, createParentChildLink } = actions;

  const { token, databaseId } = options;

  if (!token || !databaseId) {
    reporter.error(`[ERROR] Missing Notion API token or database ID.`);
    return;
  }

  reporter.info(`[INFO] Fetching pages from Notion database...`);

  try {
    await getBooks({
      token,
      databaseId,
      reporter,
      getCache,
      actions,
      createNode,
      createNodeId,
      createParentChildLink,
      getNode,
    });
    await getPages({
      token,
      databaseId,
      reporter,
      getCache,
      actions,
      createNode,
      createNodeId,
      createParentChildLink,
      getNode,
    });
  } catch (e) {
    reporter.error(`[ERROR] ${e}`);
  }
};
