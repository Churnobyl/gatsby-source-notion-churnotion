import crypto from "crypto";
import { BOOK_URI, COMMON_URI, NODE_TYPE } from "../constants";
import { IBook, IGetBooksParams } from "../types";
import { fetchPostWithRetry } from "../util/fetchData";
import { createRemoteFileNode } from "gatsby-source-filesystem";
import bookCategoryMap from "../util/bookCategoryMap";
import { useFormatDate } from "../util/formatDate";

export const getBooks = async ({
  bookDatabaseId,
  reporter,
  getCache,
  createNode,
  createNodeId,
  getNode,
  cache,
}: IGetBooksParams) => {
  const databaseUrl = `databases/${bookDatabaseId}/query`;

  const cacheKey = `booksDatabase-${bookDatabaseId}`;
  let result = await cache.get(cacheKey);

  if (!result) {
    const body = {};
    result = await fetchPostWithRetry(databaseUrl, body);
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

    const slug =
      page.properties?.slug?.rich_text?.[0]?.plain_text || `unnamed-slug`;

    const categoryId = page.properties?.category?.relation?.[0]?.id || null;
    let book_category = null;
    if (categoryId) {
      const bookCategoryId = createNodeId(`${categoryId}-category`);
      book_category = bookCategoryId;

      if (!bookCategoryMap.has(bookCategoryId)) {
        bookCategoryMap.set(bookCategoryId, []);
      }
      bookCategoryMap.get(bookCategoryId).push(nodeId);
    }

    const bookImage = page.properties?.bookImage?.files?.[0]?.file.url;
    const description =
      page.properties?.description?.rich_text?.[0]?.plain_text;

    const bookImageNode = await createRemoteFileNode({
      url: bookImage,
      parentNodeId: page.id,
      getCache,
      createNode,
      createNodeId,
    });

    const bookNode: IBook = {
      id: nodeId,
      book_name: page.properties?.[`이름`]?.title?.[0]?.plain_text || `Unnamed`,
      slug: slug,
      parent: null,
      children: [],
      internal: {
        type: NODE_TYPE.Book,
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify(page))
          .digest(`hex`),
      },
      create_date: useFormatDate(page.created_time),
      update_date: useFormatDate(page.last_edited_time),
      url: `${COMMON_URI}/${BOOK_URI}/${slug}`,
      book_category: book_category,
      book_image: bookImageNode.id,
      description: description,
    };
    reporter.info(
      `[DEBUG] Book ${bookNode.book_name} has book_category: ${bookNode.book_category}`
    );
    createNode(bookNode);
    await cache.set(nodeId, bookNode);
  }
};
