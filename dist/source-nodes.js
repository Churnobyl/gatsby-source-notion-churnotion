"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceNodes = void 0;
const getPage_1 = require("./api/getPage");
const sourceNodes = async (gatsbyApi, options) => {
    const { actions, reporter, createNodeId, getNode, getCache } = gatsbyApi;
    const { createNode, createParentChildLink } = actions;
    const { token, databaseId } = options;
    if (!token || !databaseId) {
        reporter.error(`[ERROR] Missing Notion API token or database ID.`);
        return;
    }
    reporter.info(`[INFO] Fetching pages from Notion database...`);
    try {
        await (0, getPage_1.getPages)({
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
    }
    catch (e) {
        reporter.error(`[ERROR] ${e}`);
    }
};
exports.sourceNodes = sourceNodes;
