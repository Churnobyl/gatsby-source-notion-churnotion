"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_URI = exports.TAG_URI = exports.BOOK_URI = exports.POST_URI = exports.COMMON_URI = exports.NODE_TYPE = exports.PLUGIN_NAME = exports.NOTION_LIMIT_ERROR = exports.NOTION_API_VERSION = void 0;
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
///////////////url resource///////////////////////
exports.COMMON_URI = `blog`;
exports.POST_URI = `post`;
exports.BOOK_URI = `book`;
exports.TAG_URI = `tag`;
exports.CATEGORY_URI = `category`;
