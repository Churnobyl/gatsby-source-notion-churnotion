import { GatsbyNode } from "gatsby";
import { NODE_TYPE } from "./constants";

export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] =
  ({ actions }) => {
    const { createTypes } = actions;

    createTypes(`
        type ${NODE_TYPE.Post} implements Node {
            id: ID!
            category: ${NODE_TYPE.Category}! @link(by: "id", from: "category")
            tags: [${NODE_TYPE.Tag}] @link(by: "id")
            book: ${NODE_TYPE.Book} @link(by: "id")
            book_index: Int
            title: String
            content: [JSON]
            create_date: Date! @dateformat
            update_date: Date! @dateformat
            version: Int
            description: String
            slug: String
            tableOfContents: [JSON]
            category_list: [${NODE_TYPE.Category}]
            url: String!
            thumbnail: File @link(by: "id", from: "thumbnail")
            rawText: String!
        }
        
        type ${NODE_TYPE.Tag} implements Node {
            id: ID!
            tag_name: String!
            slug: String!
            color: String!
            children: [${NODE_TYPE.Post}] @link(by: "id", from: "tags")
            url: String!
        }

        type ${NODE_TYPE.Category} implements Node {
            id: ID!
            parent: ${NODE_TYPE.Category} @link(by: "id", from: "parent")
            category_name: String!
            slug: String!
            children: [${NODE_TYPE.Category}!]! @link(by: "parent")
            churnotions: [${NODE_TYPE.Post}] @link(by: "category", from: "id")
            url: String!
            books: [${NODE_TYPE.Book}] @link(by: "id")
            childrenNBook: [${NODE_TYPE.Book}] @link(by: "book_category", from: "id")
        }

        type ${NODE_TYPE.Book} implements Node {
            id: ID!
            book_name: String!
            create_date: Date! @dateformat
            update_date: Date! @dateformat
            children: [${NODE_TYPE.Post}] @link(by: "book", from: "id")
            childrenChurnotion: [${NODE_TYPE.Post}]
            url: String!
            book_category: ${NODE_TYPE.Category} @link(by: "id", from: "book_category")
            book_image: File @link(by: "id", from: "book_image")
            description: String!
        }

        type ${NODE_TYPE.Metadata} implements Node {
            id: ID!,
            title: String,
            description: String,
            image: String,
            url: String,
        }

        type ${NODE_TYPE.RelatedPost} implements Node {
            posts: [${NODE_TYPE.Post}] @link(by: "id")
        }
    `);
  };
