"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.n2m = void 0;
const client_1 = require("@notionhq/client");
const axios_1 = __importDefault(require("axios"));
const notion_to_md_1 = require("notion-to-md");
const constants_1 = require("../constants");
const notion = new client_1.Client({
    auth: process.env.GATSBY_INTEGRATION_TOKEN,
});
/**
 * Page to Markdown Instance
 */
exports.n2m = new notion_to_md_1.NotionToMarkdown({ notionClient: notion });
/**
 * Notion API Instance
 */
exports.instance = axios_1.default.create({
    baseURL: `https://api.notion.com/v1/`,
    headers: {
        "Content-Type": `application/json`,
        "Notion-Version": constants_1.NOTION_API_VERSION,
        Authorization: `Bearer ${process.env.GATSBY_INTEGRATION_TOKEN}`,
    },
});
