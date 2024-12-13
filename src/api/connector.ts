import { Client } from "@notionhq/client";
import axios from "axios";
import { NotionToMarkdown } from "notion-to-md";
import { NOTION_API_VERSION } from "../constants";

const notion = new Client({
  auth: process.env.GATSBY_INTEGRATION_TOKEN,
});

/**
 * Page to Markdown Instance
 */
export const n2m = new NotionToMarkdown({ notionClient: notion });

/**
 * Notion API Instance
 */
export const instance = axios.create({
  baseURL: `https://api.notion.com/v1/`,
  headers: {
    "Content-Type": `application/json`,
    "Notion-Version": NOTION_API_VERSION,
    Authorization: `Bearer ${process.env.GATSBY_INTEGRATION_TOKEN}`,
  },
});
