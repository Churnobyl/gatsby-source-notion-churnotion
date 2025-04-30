import crypto from "crypto";
import {
  CATEGORY_URI,
  COMMON_URI,
  NODE_TYPE,
  POST_URI,
  TAG_URI,
} from "../constants";
import { ICategory, IGetPagesParams, IPost, ITag } from "../types";
import { processor } from "../util/processor";
import { slugify } from "../util/slugify";
import bookCategoryMap from "../util/bookCategoryMap";
import { useFormatDate } from "../util/formatDate";
import { NotionService } from "./service";
import { timeLimit } from "../util/timeLimit";

// 최대 동시 요청 수 설정
const MAX_CONCURRENT_REQUESTS = 5;

export const getPages = async ({
  databaseId,
  reporter,
  getCache,
  actions,
  createNode,
  createNodeId,
  createParentChildLink,
  getNode,
  cache,
}: IGetPagesParams) => {
  // Notion Service 초기화
  const notionService = new NotionService({
    reporter,
    parallelLimit: MAX_CONCURRENT_REQUESTS,
    enableCaching: true,
  });

  // 태그 매핑을 위한 객체
  const tagMap: Record<string, string> = {};

  /**
   * 데이터베이스 내에 페이지들을 읽어서 재귀적으로 추가하는 서브 메서드드
   * @param databaseId 데이터베이스 아이디
   * @param parentCategoryId 부모 데이터베이스 아이디
   */
  const processDatabase = async (
    databaseId: string,
    parentCategoryId: string | null = null,
    categoryPath: ICategory[] = [],
    parentCategoryUrl: string = ``
  ) => {
    let hasMore = true;
    try {
      // 동시에 처리될 페이지 목록
      const pagesToProcess: any[] = [];

      while (hasMore) {
        // 데이터베이스 쿼리
        const result = await notionService.queryDatabase(databaseId);
        hasMore = false; // Notion API가 페이지네이션을 완전히 지원하지 않으므로 일단 한 번만 처리

        if (result?.results?.length) {
          reporter.info(
            `[SUCCESS] Database ${databaseId} has ${result.results.length} pages`
          );

          // 페이지 ID 목록 수집
          const pageIds = result.results.map((page: any) => page.id);

          // 페이지 블록들을 병렬로 가져오기 - 최대 20개씩 배치 처리
          for (let i = 0; i < pageIds.length; i += 20) {
            const batch = pageIds.slice(i, i + 20);
            reporter.info(
              `[BATCH] Processing pages ${i + 1} to ${i + batch.length} of ${
                pageIds.length
              }`
            );
            const batchBlocks = await notionService.getMultiplePagesBlocks(
              batch
            );

            // 페이지 데이터와 블록 결합
            for (const pageId of batch) {
              const page = result.results.find((p: any) => p.id === pageId);
              if (page) {
                const pageData = {
                  page,
                  blocks: batchBlocks[pageId] || [],
                };
                pagesToProcess.push(pageData);
              }
            }
          }
        }
      }

      reporter.info(
        `[PROCESS] Processing ${pagesToProcess.length} pages from database ${databaseId}`
      );

      // 모든 페이지 처리
      for (const { page, blocks } of pagesToProcess) {
        try {
          // 첫 번째 블록이 child_database인지 확인
          if (blocks?.[0]?.type === `child_database`) {
            // 카테고리 처리
            const categoryJsonData = blocks[0];

            const title =
              categoryJsonData.child_database?.title || `Unnamed Category`;
            const slug = slugify(title) || `no-title-${categoryJsonData.id}`;

            if (!title) {
              reporter.warn(
                `[WARNING] Category without a title detected: ${categoryJsonData.id}`
              );
            }

            const nodeId = createNodeId(`${categoryJsonData.id}-category`);
            const categoryUrl = `${parentCategoryUrl}/${slug}`;

            const categoryNode: ICategory = {
              id: nodeId,
              category_name: title,
              parent: parentCategoryId,
              slug: slug,
              children: [],
              internal: {
                type: NODE_TYPE.Category,
                contentDigest: crypto
                  .createHash(`md5`)
                  .update(JSON.stringify(categoryJsonData))
                  .digest(`hex`),
              },
              url: `${COMMON_URI}/${CATEGORY_URI}${categoryUrl}`,
              books: [],
            };
            await createNode(categoryNode);

            // Book 관계 처리
            const bookRelations = page.properties?.book?.relation || null;
            if (bookRelations) {
              bookRelations.forEach((relation: { id: string }) => {
                const bookId = relation.id;
                const bookNodeId = createNodeId(`${bookId}-book`);
                const bookNode = getNode(bookNodeId);

                if (bookNode) {
                  createParentChildLink({
                    parent: categoryNode,
                    child: bookNode,
                  });

                  const updatedBookNode = {
                    ...bookNode,
                    book_category: categoryNode.id,
                    internal: {
                      type: bookNode.internal.type,
                      contentDigest: crypto
                        .createHash(`md5`)
                        .update(JSON.stringify(bookNode))
                        .digest(`hex`),
                    },
                  };
                  createNode(updatedBookNode);

                  reporter.info(
                    `[SUCCESS] Linked Category-Book: ${categoryNode.category_name} -> child: ${bookNode.book_name}`
                  );
                }
              });
            }

            // 부모-자식 카테고리 관계 설정
            if (parentCategoryId && categoryNode) {
              const parentNode = getNode(parentCategoryId);
              if (parentNode) {
                createParentChildLink({
                  parent: parentNode,
                  child: categoryNode,
                });
                reporter.info(
                  `[SUCCESS] Linked parent: ${parentNode.category_name} -> child: ${categoryNode.category_name}`
                );
              } else {
                reporter.warn(
                  `[WARNING] Parent node not found for ID: ${parentCategoryId}`
                );
              }
            }

            const newCategoryPath = [...categoryPath, categoryNode];

            // 해당 데이터베이스의 하위 페이지들을 처리
            // 여기서 재귀적으로 자식 데이터베이스 처리
            await processDatabase(
              categoryJsonData.id,
              nodeId,
              newCategoryPath,
              categoryUrl
            );
          } else {
            // 일반 포스트 처리
            await timeLimit(
              processPost(
                page,
                blocks,
                parentCategoryId,
                categoryPath,
                tagMap,
                parentCategoryUrl
              ),
              30000, // 30초 제한
              `Processing post ${page.id} timed out after 30 seconds`
            );
          }
        } catch (error) {
          reporter.warn(`[WARNING] Error processing page ${page.id}: ${error}`);
        }
      }
    } catch (error) {
      reporter.error(
        `[ERROR] Processing database ${databaseId} failed: ${error}`
      );
    }
  };

  /**
   * 포스트 처리 메서드
   */
  const processPost = async (
    page: any,
    pageBlocks: any[],
    parentCategoryId: string | null,
    categoryPath: ICategory[],
    tagMap: Record<string, string>,
    parentCategoryUrl: string
  ) => {
    const title: string =
      page.properties?.[`이름`]?.title?.[0]?.plain_text || `Unnamed`;
    const slug = slugify(
      page.properties?.[`slug`]?.rich_text?.[0]?.plain_text ||
        crypto.createHash(`md5`).update(JSON.stringify(title)).digest(`hex`)
    );

    if (!page.properties?.[`이름`]?.title?.[0]?.plain_text) {
      reporter.warn(`[WARNING] Post without a title detected: ${page.id}`);
    }

    const nodeId = createNodeId(`${page.id}-page`);

    // Tag 노드 만들기
    const tagIds: string[] = [];
    if (page.properties.tags && page.properties.tags.multi_select) {
      page.properties.tags.multi_select.forEach(
        (tagData: { name: string; color: string; id: string }) => {
          if (tagMap[tagData.name]) {
            // 이미 존재하는 태그라면 tagMap에서 가져오기
            const existingTagId = tagMap[tagData.name];
            tagIds.push(existingTagId); // 기존 태그 ID 추가
            reporter.info(`[INFO] Reusing existing tag: ${tagData.name}`);
          } else {
            // 새로운 태그 생성
            const tagNodeId = createNodeId(`${tagData.id}-tag`);
            tagMap[tagData.name] = tagNodeId; // tagMap에 저장
            tagIds.push(tagNodeId); // 새로운 태그 ID 추가
            const slug = slugify(tagData.name) || `no-tag-${tagNodeId}`;

            // 태그 노드 생성
            const tagNode: ITag = {
              id: tagNodeId,
              tag_name: tagData.name,
              slug: slug,
              color: tagData.color,
              children: [],
              internal: {
                type: NODE_TYPE.Tag,
                contentDigest: crypto
                  .createHash(`md5`)
                  .update(JSON.stringify(tagData))
                  .digest(`hex`),
              },
              url: `${COMMON_URI}/${TAG_URI}/${slug}`,
              churnotions: [],
              parent: null,
            };
            createNode(tagNode);
            reporter.info(`[SUCCESS] Created new tag: ${tagData.name}`);
          }
        }
      );
    }

    const bookId = page.properties?.book?.relation?.[0]?.id || null;
    const bookNodeId = createNodeId(`${bookId}-book`);
    const bookNode = getNode(bookNodeId);

    const [imageNode, tableOfContents, updatedBlocks, rawText] =
      await processor(
        pageBlocks,
        actions,
        getCache,
        createNodeId,
        reporter,
        cache
      );

    const postNode: IPost = {
      id: nodeId,
      category: parentCategoryId,
      book: bookNode?.id,
      book_index: page.properties?.bookIndex?.number || 0,
      title: title,
      content: updatedBlocks,
      create_date: useFormatDate(page.created_time),
      update_date: useFormatDate(page.last_edited_time),
      version: page.properties?.version?.number || null,
      description:
        page.properties?.description?.rich_text?.[0]?.plain_text ||
        (rawText ? rawText.substring(0, 400) : ""),
      slug: slug,
      category_list: categoryPath,
      children: [],
      tags: tagIds,
      tableOfContents,
      internal: {
        type: NODE_TYPE.Post,
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify(nodeId))
          .digest(`hex`),
      },
      url: `${COMMON_URI}/${POST_URI}/${slug}`,
      thumbnail: imageNode,
      parent: parentCategoryId,
      rawText: rawText || "",
    };

    await createNode(postNode);
    reporter.info(`[SUCCESS] Created post node: ${title} (${nodeId})`);

    if (parentCategoryId) {
      const parentNode = getNode(parentCategoryId);
      if (parentNode) {
        createParentChildLink({
          parent: parentNode,
          child: postNode,
        });
        reporter.info(
          `[SUCCESS] Linked parent: ${parentNode.category_name} -> child: ${postNode.title}`
        );
      }
    }

    // 태그와 포스트 연결
    tagIds.forEach((tagId) => {
      const tagNode = getNode(tagId);
      if (tagNode) {
        const updatedTagNode: ITag = {
          ...tagNode,
          churnotions: [...(tagNode.churnotions || []), nodeId],
          internal: {
            type: tagNode.internal.type,
            contentDigest: crypto
              .createHash(`md5`)
              .update(
                JSON.stringify({
                  ...tagNode,
                  churnotions: [...(tagNode.churnotions || []), nodeId],
                })
              )
              .digest(`hex`),
          },
        };

        createNode(updatedTagNode);
        reporter.info(
          `[SUCCESS] Added post to tag: ${tagNode.tag_name} -> ${postNode.title}`
        );
      }
    });

    // 책과 포스트 연결
    if (bookNode && postNode) {
      createParentChildLink({
        parent: bookNode,
        child: postNode,
      });
      reporter.info(
        `[SUCCESS] Linked Book-Post: ${bookNode.book_name} -> child: ${postNode.title}`
      );
    }
  };

  // 초기 데이터베이스 처리 시작
  await processDatabase(databaseId);

  // 캐시 정리
  notionService.clearCache();
};
