import crypto from "crypto";
import { NODE_TYPE } from "../constants";
import { IBook, IGetBooksParams, IGetPagesParams } from "../types";
import { fetchPostWithRetry } from "../util/fetchData";

export const getBooks = async ({
  bookDatabaseId,
  reporter,
  createNode,
  createNodeId,
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

    const bookNode: IBook = {
      id: nodeId,
      book_name: page.properties?.[`이름`]?.title?.[0]?.plain_text || `Unnamed`,
      slug: page.properties?.slug?.rich_text?.plain_text || `unnamed-slug`,
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
    };
    createNode(bookNode);
  }
};
