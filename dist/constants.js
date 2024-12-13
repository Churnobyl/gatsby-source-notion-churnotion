"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NODE_TYPE = exports.PLUGIN_NAME = exports.NOTION_LIMIT_ERROR = exports.NOTION_API_VERSION = void 0;
exports.NOTION_API_VERSION = `2022-06-28`;
exports.NOTION_LIMIT_ERROR = 429;
exports.PLUGIN_NAME = `gatsby-source-notion-churnotion`;
//////////////////////////////////////////////////
exports.NODE_TYPE = {
    Post: `Churnotion`,
    Category: `NCategory`,
    Tag: `NTag`,
    Book: `NBook`,
};
