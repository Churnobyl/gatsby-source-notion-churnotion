"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceNodes = void 0;
const getPages_1 = require("./api/getPages");
const getBooks_1 = require("./api/getBooks");
const sourceNodes = async (gatsbyApi, options) => {
    const { actions, reporter, createNodeId, getNode, getCache, cache } = gatsbyApi;
    const { createNode, createParentChildLink } = actions;
    const { token, databaseId, bookDatabaseId } = options;
    if (!token || !databaseId) {
        reporter.error(`[ERROR] Missing Notion API token or database ID.`);
        return;
    }
    reporter.info(`[INFO] Fetching pages from Notion database...`);
    try {
        await (0, getBooks_1.getBooks)({
            bookDatabaseId,
            reporter,
            getCache,
            createNode,
            createNodeId,
            getNode,
            cache,
        });
        await (0, getPages_1.getPages)({
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
    }
    catch (e) {
        reporter.error(`[ERROR] ${e}`);
    }
};
exports.sourceNodes = sourceNodes;
