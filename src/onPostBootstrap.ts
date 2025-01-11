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

export const onPostBootstrap: GatsbyNode[`onPostBootstrap`] = async (
  { actions, getNode, getNodesByType, createNodeId, reporter, cache },
  options: ISourceNodesOptions
) => {
  const nodes = getNodesByType(NODE_TYPE.Post) as IPost[];

  const docs = nodes
    .map((node) => ({ id: node.id, text: node.rawText }))
    .filter((doc) => doc.text?.trim() !== "");

  const tfidf = new TfIdf();

  // tfidf
  docs.map(async (doc) => {
    if (doc.text) {
      const key = `${md5(doc.text)}-doc`;

      const cached_ssd = await cache.get(key);
      if (cached_ssd !== undefined) {
        tfidf.addDocument(cached_ssd);
      } else {
        const ssd = await getSpaceSeparatedDoc(
          await getTextFromRawText(doc.text)
        );

        tfidf.addDocument(ssd);
        await cache.set(key, ssd);
      }
    }
  });

  type Term = TfIdfTerm & {
    tf: number;
    idf: number;
  };

  const doc_terms = docs.map((_, i) =>
    (tfidf.listTerms(i) as Term[])
      .map((x) => ({ ...x, tfidf: (x as Term).tf * (x as Term).idf }))
      .sort((x, y) => y.tfidf - x.tfidf)
  );

  const all_keywords = new Set<string>();
  const tfidf_map_for_each_doc: Map<string, number>[] = [];
  doc_terms.forEach((x, i) => {
    tfidf_map_for_each_doc[i] = new Map<string, number>();
    x.slice(0, 30).forEach((x) => {
      all_keywords.add(x.term);
      tfidf_map_for_each_doc[i].set(x.term, x.tfidf);
    });
  });

  const bow_vectors = new Map<string, BowVector>();

  docs.forEach((x, i) => {
    if (bow_vectors === null) return;
    bow_vectors.set(
      x.id,
      Array.from(all_keywords)
        .map((x) => tfidf_map_for_each_doc[i].get(x))
        .map((x) => (x === undefined ? 0 : x))
    );
  });

  nodes.forEach((node) => {
    const relatedNodeIds = getRelatedPosts(node.id, bow_vectors);

    const digest = `${node.id} - ${NODE_TYPE.RelatedPost}`;

    actions.createNode({
      id: createNodeId(digest),
      parent: node.id,
      internal: {
        type: NODE_TYPE.RelatedPost,
        contentDigest: digest,
      },
      posts: relatedNodeIds,
    });
  });
};
