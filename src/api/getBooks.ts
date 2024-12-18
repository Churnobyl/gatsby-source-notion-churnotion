import crypto from "crypto";
import { BOOK_URI, COMMON_URI, NODE_TYPE } from "../constants";
import { IBook, IGetBooksParams } from "../types";
import { fetchPostWithRetry } from "../util/fetchData";

export const getBooks = async ({
  bookDatabaseId,
  reporter,
  createNode,
  createNodeId,
  getNode,
}: IGetBooksParams) => {
  const databaseUrl = `databases/${bookDatabaseId}/query`;
  const body = {};

  const result = await fetchPostWithRetry(databaseUrl, body);

  if (result?.results?.length) {
    reporter.info(`[SUCCESS] total BOOK pages > ${result.results.length}`);
  }

  for (const page of result.results) {
    reporter.info(`[CHECK] BOOK page: ${page.id}`);

    const nodeId = createNodeId(`${page.id}-book`);
    const slug =
      page.properties?.slug?.rich_text?.[0]?.plain_text || `unnamed-slug`;

    const categoryId = page.properties?.category?.relation?.[0]?.id || null;
    let book_category = null;
    if (categoryId) {
      book_category = createNodeId(`${categoryId}-category`);
    }

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
      create_date: page.created_time,
      update_date: page.last_edited_time,
      url: `${COMMON_URI}/${BOOK_URI}/${slug}`,
      book_category: book_category,
    };
    reporter.info(
      `[DEBUG] Book ${bookNode.book_name} has book_category: ${bookNode.book_category}`
    );
    createNode(bookNode);
  }
};
