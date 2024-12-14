"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPages = void 0;
const crypto_1 = __importDefault(require("crypto"));
const constants_1 = require("../constants");
const fetchData_1 = require("../util/fetchData");
const imageProcessor_1 = require("../util/imageProcessor");
const slugify_1 = require("../util/slugify");
const connector_1 = require("./connector");
const getPages = async ({ databaseId, reporter, getCache, actions, createNode, createNodeId, createParentChildLink, getNode, }) => {
    let hasMore = true;
    /**
     * 데이터베이스 내에 페이지들을 읽어서 재귀적으로 추가하는 서브 메서드드
     * @param databaseId 데이터베이스 아이디
     * @param parentCategoryId 부모 데이터베이스 아이디
     */
    const processDatabase = async (databaseId, parentCategoryId = null, categoryPath = [], tagMap = {}) => {
        try {
            while (hasMore) {
                const databaseUrl = `databases/${databaseId}/query`;
                const body = {};
                const result = await (0, fetchData_1.fetchPostWithRetry)(databaseUrl, body);
                if (result?.results?.length) {
                    reporter.info(`[SUCCESS] total pages > ${result.results.length}`);
                }
                for (const page of result.results) {
                    reporter.info(`[CHECK] page: ${page.id}`);
                    const pageUrl = `blocks/${page.id}/children?page_size=100`;
                    // 페이지 데이터
                    const pageData = await (0, fetchData_1.fetchGetWithRetry)(pageUrl);
                    if (pageData.results[0].type === `child_database`) {
                        const categoryJsonData = pageData.results[0];
                        const title = categoryJsonData.child_database?.title || `Unnamed Category`;
                        const slug = (0, slugify_1.slugify)(title);
                        if (!title) {
                            reporter.warn(`[WARNING] Category without a title detected: ${categoryJsonData.id}`);
                        }
                        const nodeId = createNodeId(`${categoryJsonData.id}-category`);
                        const categoryNode = {
                            id: nodeId,
                            category_name: title,
                            parent: parentCategoryId,
                            slug: slug || `no-title-${categoryJsonData.id}`,
                            children: [],
                            internal: {
                                type: constants_1.NODE_TYPE.Category,
                                contentDigest: crypto_1.default
                                    .createHash(`md5`)
                                    .update(JSON.stringify(categoryJsonData))
                                    .digest(`hex`),
                            },
                        };
                        createNode(categoryNode);
                        if (parentCategoryId && categoryNode) {
                            const parentNode = getNode(parentCategoryId); // Gatsby에서 노드를 검색
                            if (parentNode) {
                                createParentChildLink({
                                    parent: parentNode,
                                    child: categoryNode,
                                });
                                reporter.info(`[SUCCESS] Linked parent: ${parentNode.category_name} -> child: ${categoryNode.category_name}`);
                            }
                            else {
                                reporter.warn(`[WARNING] Parent node not found for ID: ${parentCategoryId}`);
                            }
                        }
                        const newCategoryPath = [...categoryPath, categoryNode];
                        await processDatabase(categoryJsonData.id, nodeId, newCategoryPath, tagMap);
                    }
                    else {
                        // 페이지인 경우
                        const title = page.properties?.[`이름`]?.title?.[0]?.plain_text || `Unnamed`;
                        const slug = (0, slugify_1.slugify)(page.properties?.[`slug`]?.rich_text?.[0]?.plain_text ||
                            crypto_1.default
                                .createHash(`md5`)
                                .update(JSON.stringify(title))
                                .digest(`hex`));
                        if (!title) {
                            reporter.warn(`[WARNING] Category without a title detected: ${page.id}`);
                        }
                        const nodeId = createNodeId(`${page.id}-page`);
                        // Tag 노드 만들기
                        const tagIds = [];
                        if (page.properties.tags && page.properties.tags.multi_select) {
                            page.properties.tags.multi_select.forEach((tagData) => {
                                if (tagMap[tagData.name]) {
                                    // 이미 존재하는 태그라면 tagMap에서 가져오기
                                    const existingTagId = tagMap[tagData.name];
                                    tagIds.push(existingTagId); // 기존 태그 ID 추가
                                    reporter.info(`[INFO] Reusing existing tag: ${tagData.name}`);
                                }
                                else {
                                    // 새로운 태그 생성
                                    const tagNodeId = createNodeId(`${tagData.id}-tag`);
                                    tagMap[tagData.name] = tagNodeId; // tagMap에 저장
                                    tagIds.push(tagNodeId); // 새로운 태그 ID 추가
                                    // 태그 노드 생성
                                    const tagNode = {
                                        id: tagNodeId,
                                        tag_name: tagData.name,
                                        color: tagData.color,
                                        churnotions: [], // 연결된 페이지 리스트 초기화
                                        internal: {
                                            type: constants_1.NODE_TYPE.Tag,
                                            contentDigest: crypto_1.default
                                                .createHash(`md5`)
                                                .update(JSON.stringify(tagData))
                                                .digest(`hex`),
                                        },
                                    };
                                    createNode(tagNode);
                                    reporter.info(`[SUCCESS] Created new tag: ${tagData.name}`);
                                }
                            });
                        }
                        const bookId = page.properties?.book?.relation?.[0]?.id || null;
                        const markdownContent = await connector_1.n2m.pageToMarkdown(page.id);
                        await (0, imageProcessor_1.processBlocks)(markdownContent, actions, getCache, createNodeId, reporter);
                        const postNode = {
                            id: nodeId,
                            category: parentCategoryId,
                            book: getNode(`${bookId}-book`),
                            book_index: page.properties?.bookIndex?.number || 0,
                            title: title,
                            content: markdownContent,
                            create_date: page.created_time,
                            update_date: page.last_edited_time,
                            version: page.properties?.version?.number || null,
                            description: null,
                            slug: slug || `no-title-${nodeId}`,
                            category_list: categoryPath,
                            children: [],
                            internal: {
                                type: constants_1.NODE_TYPE.Post,
                                contentDigest: crypto_1.default
                                    .createHash(`md5`)
                                    .update(JSON.stringify(nodeId))
                                    .digest(`hex`),
                            },
                            tags: tagIds,
                            parent: null,
                        };
                        await createNode(postNode);
                        // book과 post 부모-자식 관계 설정
                        const bookNode = getNode(bookId);
                        if (bookNode) {
                            createParentChildLink({
                                parent: bookNode,
                                child: postNode,
                            });
                        }
                        // tag와 post 부모-자식 관계 설정
                        tagIds.forEach((tagId) => {
                            const tagNode = getNode(tagId);
                            if (tagNode) {
                                createParentChildLink({
                                    parent: tagNode,
                                    child: postNode,
                                });
                                reporter.info(`[SUCCESS] Linked tag: ${tagNode.tag_name} -> page: ${postNode.title}`);
                            }
                            else {
                                reporter.warn(`[WARNING] Tag node not found for ID: ${tagId}`);
                            }
                        });
                        // category와 post 부모-자식 관계 설정
                        if (parentCategoryId && postNode) {
                            const parentNode = getNode(parentCategoryId); // Gatsby에서 노드를 검색
                            if (parentNode) {
                                createParentChildLink({
                                    parent: parentNode,
                                    child: postNode,
                                });
                                reporter.info(`[SUCCESS] Linked parent: ${parentNode.category_name} -> child: ${postNode.title}`);
                            }
                            else {
                                reporter.warn(`[WARNING] Parent node not found for ID: ${parentCategoryId}`);
                            }
                        }
                    }
                }
                hasMore = result.has_more;
            }
        }
        catch (error) {
            reporter.error(`[ERROR] fetching page`);
        }
    };
    await processDatabase(databaseId);
};
exports.getPages = getPages;