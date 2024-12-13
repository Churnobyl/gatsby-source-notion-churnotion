import crypto from "crypto";
import { NODE_TYPE } from "../constants";
import { IGetPagesParams } from "../types";
import { fetchGetWithRetry, fetchPostWithRetry } from "../util/fetchData";
import { processBlocks } from "../util/imageProcessor";
import { slugify } from "../util/slugify";
import { n2m } from "./connector";

export const getPages = async ({
  databaseId,
  reporter,
  getCache,
  actions,
  createNode,
  createNodeId,
  createParentChildLink,
  getNode,
}: IGetPagesParams) => {
  let hasMore = true;

  /**
   * 데이터베이스 내에 페이지들을 읽어서 재귀적으로 추가하는 서브 메서드드
   * @param databaseId 데이터베이스 아이디
   * @param parentCategoryId 부모 데이터베이스 아이디
   */
  const processDatabase = async (
    databaseId: string,
    parentCategoryId: string | null = null
  ) => {
    try {
      while (hasMore) {
        const databaseUrl = `databases/${databaseId}/query`;
        const body = {};

        const result = await fetchPostWithRetry(databaseUrl, body);

        if (result?.results?.length) {
          reporter.info(`[SUCCESS] total pages > ${result.results.length}`);
        }

        for (const page of result.results) {
          reporter.info(`[CHECK!!!] page: ${page.id}`);

          const pageUrl = `blocks/${page.id}/children?page_size=100`;

          // 페이지 데이터
          const pageData = await fetchGetWithRetry(pageUrl);

          if (pageData.results[0].type === `child_database`) {
            const categoryJsonData = pageData.results[0];

            const title =
              categoryJsonData.child_database?.title || `Unnamed Category`;
            const slug = slugify(title);

            if (!title) {
              reporter.warn(
                `[WARNING] Category without a title detected: ${categoryJsonData.id}`
              );
            }

            const nodeId = createNodeId(`${categoryJsonData.id}-category`);

            const categoryNode = {
              id: nodeId,
              category_name: title,
              parent_id: parentCategoryId,
              slug: slug || `no-title-${categoryJsonData.id}`,
              children: [],
              internal: {
                type: NODE_TYPE.Category,
                contentDigest: crypto
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
                reporter.info(
                  `[SUCCESS] Linked parent: ${parentNode.category_name} -> child: ${categoryNode.category_name}`
                );
              } else {
                reporter.warn(
                  `[WARNING] Parent node not found for ID: ${parentCategoryId}`
                );
              }
            }

            await processDatabase(categoryJsonData.id, nodeId);
          } else {
            // 페이지인 경우

            const title =
              page.properties?.[`이름`]?.title?.[0]?.plain_text || `Unnamed`;
            const slug = slugify(title);

            if (!title) {
              reporter.warn(
                `[WARNING] Category without a title detected: ${page.id}`
              );
            }

            const nodeId = createNodeId(`${page.id}-page`);

            // Tag 노드 만들기
            if (page.properties.tags && page.properties.tags.multi_select) {
              page.properties.tags.multi_select.map(
                (tagData: { name: string; color: string; id: string }) =>
                  createNode({
                    id: createNodeId(`${tagData.id}-tag`),
                    tag_name: tagData.name,
                    color: tagData.color,
                    internal: {
                      type: NODE_TYPE.Tag,
                      contentDigest: crypto
                        .createHash(`md5`)
                        .update(JSON.stringify(tagData.id))
                        .digest(`hex`),
                    },
                  })
              );
            }

            const bookId = page.properties?.book?.relation?.[0]?.id || null;

            const markdownContent = await n2m.pageToMarkdown(page.id);

            await processBlocks(
              markdownContent,
              actions,
              getCache,
              createNodeId,
              reporter
            );

            const postNode = {
              id: nodeId,
              category_id: parentCategoryId,
              book_id: bookId,
              title: title,
              content: markdownContent,
              create_date: page.created_time,
              update_date: page.last_edited_time,
              version:
                page.properties?.version?.rich_text?.[0]?.plain_text || null,
              description: null,
              slug: slug || `no-title-${nodeId}`,
              children: [],
              internal: {
                type: NODE_TYPE.Post,
                contentDigest: crypto
                  .createHash(`md5`)
                  .update(JSON.stringify(nodeId))
                  .digest(`hex`),
              },
            };

            await createNode(postNode);

            if (parentCategoryId && postNode) {
              const parentNode = getNode(parentCategoryId); // Gatsby에서 노드를 검색
              if (parentNode) {
                createParentChildLink({
                  parent: parentNode,
                  child: postNode,
                });
                reporter.info(
                  `[SUCCESS] Linked parent: ${parentNode.category_name} -> child: ${postNode.title}`
                );
              } else {
                reporter.warn(
                  `[WARNING] Parent node not found for ID: ${parentCategoryId}`
                );
              }
            }
          }
        }

        hasMore = result.has_more;
      }
    } catch (error) {
      reporter.error(`[ERROR] fetching page`);
    }
  };

  await processDatabase(databaseId);
};
