import crypto from "crypto";
import { GatsbyNode } from "gatsby";
import { TfIdf, TfIdfTerm, WordTokenizer } from "natural";
import { NODE_TYPE } from "./constants";
import { IPost, ISourceNodesOptions } from "./types";

import computeCosineSimilarity from "compute-cosine-similarity";

const tokenizer = new WordTokenizer();

const getTokens = (doc: string): string[] => {
  return tokenizer.tokenize(doc);
};

const vector_similarity_memo = new Map<string, number>();

type BowVector = number[];

type VectorWithId = {
  id: string;
  vector: BowVector;
};

const md5 = (str: string): string => {
  const md5 = crypto.createHash("md5");
  return md5.update(str, "binary").digest("hex");
};

const getMemorizedVectorSimilarity = (
  v1: VectorWithId,
  v2: VectorWithId
): number => {
  const id = v1.id < v2.id ? `${v1.id} ${v2.id}` : `${v2.id} ${v1.id}`;

  const memorized_similarity = vector_similarity_memo.get(id);
  if (memorized_similarity !== undefined) return memorized_similarity;

  const similarity = calcVectorSimilarity(v1.vector, v2.vector);
  vector_similarity_memo.set(id, similarity);

  return similarity;
};

const calcVectorSimilarity = (v1: BowVector, v2: BowVector): number => {
  if (v1.length !== v2.length)
    throw new Error("Both vector's size must be equal");

  return computeCosineSimilarity(v1, v2) || 0;
};

const getRelatedPosts = (
  id: string,
  bow_vectors: Map<string, BowVector>
): string[] => {
  const vector = bow_vectors.get(id);
  if (vector === undefined) return [];

  const vector_node: VectorWithId = {
    id,
    vector,
  };

  return Array.from(bow_vectors.entries())
    .filter(([otherId]) => otherId !== id)
    .sort((x, y) => {
      const vector_x: VectorWithId = {
        id: x[0],
        vector: x[1],
      };
      const vector_y: VectorWithId = {
        id: y[0],
        vector: y[1],
      };

      return (
        getMemorizedVectorSimilarity(vector_y, vector_node) -
        getMemorizedVectorSimilarity(vector_x, vector_node)
      );
    })
    .map((x) => x[0])
    .slice(0, 6);
};

const getTextFromRawText = async (doc: string) => {
  return doc
    .replace(/http[^ ]+/g, "")
    .replace(/[\#\!\(\)\*\_\[\]\|\=\>\+\`\:\-]/g, "");
};

const getSpaceSeparatedDoc = (doc: string): string => {
  const tokens = getTokens(doc);
  return tokens.join(" ");
};

export const onPostBootstrap: GatsbyNode["onPostBootstrap"] = async ({
  getNodesByType,
  actions,
  reporter,
  createNodeId,
  cache,
}) => {
  const { createNodeField, createNode } = actions;
  reporter.info(`Creating explicit relationships between nodes...`);

  // 1. Book과 Post 간의 관계 설정
  // Get all Book and Post nodes
  const books = getNodesByType(NODE_TYPE.Book);
  const posts = getNodesByType(NODE_TYPE.Post) as IPost[];

  // Create a map of book ID to related posts
  const bookPostMap = new Map();

  // Populate the map
  posts.forEach((post) => {
    if (post.book) {
      if (!bookPostMap.has(post.book)) {
        bookPostMap.set(post.book, []);
      }
      bookPostMap.get(post.book).push(post.id);
    }
  });

  // Create explicit fields for each book
  books.forEach((book) => {
    const relatedPostIds = bookPostMap.get(book.id) || [];

    // Add childrenChurnotion field explicitly
    createNodeField({
      node: book,
      name: "childrenChurnotion",
      value: relatedPostIds,
    });

    reporter.info(
      `Added ${relatedPostIds.length} posts to book: ${book.book_name}`
    );
  });

  reporter.info(`Book-Post relationship creation completed`);

  // 1.5 Category와 Post 간의 관계 설정
  // Get all Category nodes
  const categories = getNodesByType(NODE_TYPE.Category);

  // Create a map of category ID to related posts
  const categoryPostMap = new Map();

  // Populate the map
  posts.forEach((post) => {
    if (post.category) {
      if (!categoryPostMap.has(post.category)) {
        categoryPostMap.set(post.category, []);
      }
      categoryPostMap.get(post.category).push(post.id);
    }
  });

  // Create explicit fields for each category
  categories.forEach((category) => {
    const relatedPostIds = categoryPostMap.get(category.id) || [];

    // Add childrenChurnotion field explicitly
    createNodeField({
      node: category,
      name: "childrenChurnotion",
      value: relatedPostIds,
    });

    reporter.info(
      `Added ${relatedPostIds.length} posts to category: ${category.category_name}`
    );
  });

  reporter.info(`Category-Post relationship creation completed`);

  // 2. 관련 포스트 기능 구현
  reporter.info(`Creating related posts...`);

  // 유효한 텍스트가 있는 포스트 필터링
  const docsWithText = posts
    .filter((post) => post.rawText && post.rawText.trim() !== "")
    .map((post) => ({
      id: post.id,
      text: post.rawText || "",
    }));

  if (docsWithText.length === 0) {
    reporter.warn(
      `No posts with valid text content found for related posts calculation`
    );

    // 빈 관련 포스트 노드라도 생성
    posts.forEach((post) => {
      const digest = `${post.id} - ${NODE_TYPE.RelatedPost}`;
      createNode({
        id: createNodeId(digest),
        parent: post.id,
        internal: {
          type: NODE_TYPE.RelatedPost,
          contentDigest: digest,
        },
        posts: [],
      });
    });

    return;
  }

  reporter.info(`Processing ${docsWithText.length} posts for related content`);

  // TF-IDF 계산 준비
  const tfidf = new TfIdf();

  // 텍스트 전처리 및 TF-IDF 문서 추가
  for (const doc of docsWithText) {
    if (!doc.text) continue;

    const cacheKey = `${md5(doc.text)}-doc`;
    let processedText;

    try {
      // 캐시에서 전처리된 문서 가져오기 시도
      const cachedText = await cache.get(cacheKey);
      if (cachedText) {
        processedText = cachedText;
      } else {
        // 텍스트 전처리
        const cleanedText = await getTextFromRawText(doc.text);
        processedText = getSpaceSeparatedDoc(cleanedText);
        await cache.set(cacheKey, processedText);
      }

      // TF-IDF에 문서 추가
      tfidf.addDocument(processedText);
    } catch (err) {
      reporter.warn(`Error processing text for post ${doc.id}: ${err}`);
      tfidf.addDocument(""); // 오류 방지를 위해 빈 문서 추가
    }
  }

  // 각 문서의 TF-IDF 용어 추출
  type Term = TfIdfTerm & {
    tf: number;
    idf: number;
  };

  const docTerms = Array.from({ length: docsWithText.length }, (_, i) => {
    try {
      return (tfidf.listTerms(i) as Term[])
        .map((x) => ({ ...x, tfidf: (x as Term).tf * (x as Term).idf }))
        .sort((x, y) => y.tfidf - x.tfidf);
    } catch (err) {
      reporter.warn(`Error listing terms for document index ${i}: ${err}`);
      return [] as Term[];
    }
  });

  // 모든 키워드 수집 및 TF-IDF 맵 생성
  const allKeywords = new Set<string>();
  const tfidfMapForEachDoc: Map<string, number>[] = [];

  docTerms.forEach((terms, i) => {
    tfidfMapForEachDoc[i] = new Map<string, number>();
    terms.slice(0, 30).forEach((term) => {
      allKeywords.add(term.term);
      tfidfMapForEachDoc[i].set(term.term, term.tfidf);
    });
  });

  // 각 문서의 BOW 벡터 생성
  const bowVectors = new Map<string, BowVector>();

  docsWithText.forEach((doc, i) => {
    const vector = Array.from(allKeywords).map(
      (keyword) => tfidfMapForEachDoc[i].get(keyword) || 0
    );

    bowVectors.set(doc.id, vector);
  });

  // 각 포스트에 대해 관련 포스트 노드 생성
  posts.forEach((post) => {
    let relatedNodeIds: string[] = [];

    if (bowVectors.has(post.id)) {
      try {
        relatedNodeIds = getRelatedPosts(post.id, bowVectors);
      } catch (err) {
        reporter.warn(`Error getting related posts for ${post.id}: ${err}`);
      }
    }

    const digest = `${post.id} - ${NODE_TYPE.RelatedPost}`;

    createNode({
      id: createNodeId(digest),
      parent: post.id,
      internal: {
        type: NODE_TYPE.RelatedPost,
        contentDigest: digest,
      },
      posts: relatedNodeIds,
    });

    reporter.info(
      `Created related posts node for: ${post.title} with ${relatedNodeIds.length} related posts`
    );
  });

  reporter.info(`Related posts creation completed`);
};
