import type { GatsbyNode, PluginOptions } from "gatsby";
import { getPages } from "./api/getPages";
import { getBooks } from "./api/getBooks";
import { ISourceNodesOptions } from "./types";

export const sourceNodes: GatsbyNode["sourceNodes"] = async (
  gatsbyApi,
  options: ISourceNodesOptions
) => {
  const { actions, reporter, createNodeId, getNode, getCache, cache } =
    gatsbyApi;
  const { createNode, createParentChildLink } = actions;

  const { token, databaseId, bookDatabaseId } = options;

  if (!token || !databaseId) {
    reporter.error(`[ERROR] Missing Notion API token or database ID.`);
    return;
  }

  reporter.info(`[INFO] Fetching pages from Notion database...`);

  try {
    await getBooks({
      bookDatabaseId,
      reporter,
      getCache,
      createNode,
      createNodeId,
      getNode,
      cache,
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
      cache,
    });
  } catch (e) {
    reporter.error(`[ERROR] ${e}`);
  }
};
