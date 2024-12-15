"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBooks = void 0;
const crypto_1 = __importDefault(require("crypto"));
const constants_1 = require("../constants");
const fetchData_1 = require("../util/fetchData");
const getBooks = async ({ bookDatabaseId, reporter, createNode, createNodeId, }) => {
    const databaseUrl = `databases/${bookDatabaseId}/query`;
    const body = {};
    const result = await (0, fetchData_1.fetchPostWithRetry)(databaseUrl, body);
    if (result?.results?.length) {
        reporter.info(`[SUCCESS] total BOOK pages > ${result.results.length}`);
    }
    for (const page of result.results) {
        reporter.info(`[CHECK] BOOK page: ${page.id}`);
        const nodeId = createNodeId(`${page.id}-book`);
        const slug = page.properties?.slug?.rich_text?.[0]?.plain_text || `unnamed-slug`;
        const bookNode = {
            id: nodeId,
            book_name: page.properties?.[`이름`]?.title?.[0]?.plain_text || `Unnamed`,
            slug: slug,
            parent: null,
            children: [],
            internal: {
                type: constants_1.NODE_TYPE.Book,
                contentDigest: crypto_1.default
                    .createHash(`md5`)
                    .update(JSON.stringify(page))
                    .digest(`hex`),
            },
            create_date: page.created_time,
            update_date: page.last_edited_time,
            url: `${constants_1.COMMON_URI}/${constants_1.BOOK_URI}/${slug}`,
        };
        createNode(bookNode);
    }
};
exports.getBooks = getBooks;
