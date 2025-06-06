"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBooks = void 0;
const crypto_1 = __importDefault(require("crypto"));
const constants_1 = require("../constants");
const gatsby_source_filesystem_1 = require("gatsby-source-filesystem");
const bookCategoryMap_1 = __importDefault(require("../util/bookCategoryMap"));
const formatDate_1 = require("../util/formatDate");
const service_1 = require("./service");
const getBooks = async ({ bookDatabaseId, reporter, getCache, createNode, createNodeId, getNode, cache, }) => {
    // Initialize the TypeScript Notion Service for database queries
    const notionService = new service_1.NotionService({
        reporter,
        parallelLimit: 5,
        enableCaching: true,
    });
    const cacheKey = `booksDatabase-${bookDatabaseId}`;
    let result = await cache.get(cacheKey);
    if (!result) {
        const body = {};
        result = await notionService.queryDatabase(bookDatabaseId, body);
        await cache.set(cacheKey, result);
    }
    if (result?.results?.length) {
        reporter.info(`[SUCCESS] total BOOK pages > ${result.results.length}`);
    }
    for (const page of result.results) {
        reporter.info(`[CHECK] BOOK page: ${page.id}`);
        const nodeId = createNodeId(`${page.id}-book`);
        const cachedNode = await cache.get(nodeId);
        if (cachedNode) {
            reporter.info(`[CACHE HIT] Skipping already created node: ${nodeId}`);
            continue;
        }
        const slug = page.properties?.slug?.rich_text?.[0]?.plain_text || `unnamed-slug`;
        const categoryId = page.properties?.category?.relation?.[0]?.id || null;
        let book_category = null;
        if (categoryId) {
            const bookCategoryId = createNodeId(`${categoryId}-category`);
            book_category = bookCategoryId;
            if (!bookCategoryMap_1.default.has(bookCategoryId)) {
                bookCategoryMap_1.default.set(bookCategoryId, []);
            }
            bookCategoryMap_1.default.get(bookCategoryId).push(nodeId);
        }
        const bookImage = page.properties?.bookImage?.files?.[0]?.file.url;
        const description = page.properties?.description?.rich_text?.[0]?.plain_text;
        const bookImageNode = await (0, gatsby_source_filesystem_1.createRemoteFileNode)({
            url: bookImage,
            parentNodeId: page.id,
            getCache,
            createNode,
            createNodeId,
        });
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
            create_date: (0, formatDate_1.useFormatDate)(page.created_time),
            update_date: (0, formatDate_1.useFormatDate)(page.last_edited_time),
            url: `${constants_1.COMMON_URI}/${constants_1.BOOK_URI}/${slug}`,
            book_category: book_category,
            book_image: bookImageNode.id,
            description: description,
        };
        reporter.info(`[DEBUG] Book ${bookNode.book_name} has book_category: ${bookNode.book_category}`);
        createNode(bookNode);
        await cache.set(nodeId, bookNode);
    }
};
exports.getBooks = getBooks;
