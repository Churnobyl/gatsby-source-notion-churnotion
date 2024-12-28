// import { GatsbyNode } from "gatsby";
// import { TfIdf, TfIdfTerm } from "natural";
// import { NODE_TYPE } from "./constants";
// import crypto from "crypto";

// const md5 = (str: string): string => {
//   const md5 = crypto.createHash("md5");
//   return md5.update(str, "binary").digest("hex");
// };

// const getSpaceSeparatedDoc: {
//     [key: string]: (doc: string) => Promise<string[]>;
//   } = {
//     en: async (doc) => {
//       return doc.toLowerCase().split(' ');
//     },
//     ja: async (doc) => {
//       if (kuromoji_tokenizer === null)
//         kuromoji_tokenizer = await getKuromojiTokenizer();

//       return kuromoji_tokenizer
//         .tokenize(doc)
//         .filter(
//           (x) =>
//             x.pos === '名詞' &&
//             ['一般', '固有名詞'].indexOf(x.pos_detail_1) !== -1
//         )
//         .map((x) => (x.basic_form !== '*' ? x.basic_form : x.surface_form));
//     },
//   };

// export const onPostBootstrap: GatsbyNode["onPostBootstrap"] = async ({
//   actions,
//   getNode,
//   getNodesByType,
//   createNodeId,
//   reporter,
//   cache,
// }) => {
//   const nodes = getNodesByType(NODE_TYPE.Post);

//   const docs: Record<string, string>[] = nodes.map((node) => ({
//     id: node.id,
//     text: node.rawText as string,
//   }));

//   const tfidf = new TfIdf();
//   for (let doc of docs) {
//     const key = `${md5(doc.text)}-related-post`;

//     const cached_ssd = await cache.get(key);
//     if (cached_ssd !== undefined) {
//       tfidf.addDocument(cached_ssd);
//       continue;
//     }

//     const ssd = await getSpaceSeparatedDoc[option.doc_lang](
//       getTextFromMarkdown(doc.text)
//     );
//     tfidf.addDocument(ssd);
//     await cache.set(key, ssd);
//   }

//   // generate bow vectors
//   type Term = TfIdfTerm & {
//     tf: number;
//     idf: number;
//   };
//   //// extract keywords from each document
//   const doc_terms = docs.map((_, i) =>
//     (tfidf.listTerms(i) as Term[])
//       .map((x) => ({ ...x, tfidf: (x as Term).tf * (x as Term).idf }))
//       .sort((x, y) => y.tfidf - x.tfidf)
//   );
//   // DEBUG: print terms
//   // doc_terms.forEach((x, i) =>
//   //  console.log(
//   //    docs[i].id,
//   //    x.map((x) => x.term)
//   //  )
//   //);
//   const all_keywords = new Set<string>();
//   const tfidf_map_for_each_doc: Map<string, number>[] = [];
//   doc_terms.forEach((x, i) => {
//     tfidf_map_for_each_doc[i] = new Map<string, number>();
//     x.slice(0, option.each_bow_size).forEach((x) => {
//       all_keywords.add(x.term);
//       tfidf_map_for_each_doc[i].set(x.term, x.tfidf);
//     });
//   });
//   //// generate vectors
//   const bow_vectors = new Map<string, BowVector>();
//   docs.forEach((x, i) => {
//     if (bow_vectors === null) return;
//     bow_vectors.set(
//       x.id,
//       Array.from(all_keywords)
//         .map((x) => tfidf_map_for_each_doc[i].get(x))
//         .map((x) => (x === undefined ? 0 : x))
//     );
//   });
//   reporter.info(
//     `[related-posts] bow vectors generated, dimention: ${all_keywords.size}`
//   );

//   // create related nodes
//   nodes.forEach((node) => {
//     const related_nodes = getRelatedPosts(node.id, bow_vectors)
//       .slice(1)
//       .map((id) => getNode(id));
//     const digest = `${node.id} >>> related${option.target_node}s`;

//     actions.createNode({
//       id: createNodeId(digest),
//       parent: node.id,
//       internal: {
//         type: `related${option.target_node}s`,
//         contentDigest: digest,
//       },
//       posts: related_nodes,
//     });
//   });
// };
