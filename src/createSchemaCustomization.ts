import { GatsbyNode } from "gatsby";
import { NODE_TYPE } from "./constants";

export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] =
  ({ actions }) => {
    const { createTypes } = actions;

    createTypes(`
        type ${NODE_TYPE.Post} implements Node {
            id: ID!
            category: ${NODE_TYPE.Category}! @link(by: "id", from: "category")
            tags: ${NODE_TYPE.Tag} @link(by: "id")
            book_id: ${NODE_TYPE.Book} @link(by: "id")
            title: String
            content: [JSON]
            create_date: Date! @dateformat
            update_date: Date! @dateformat
            version: Int
            description: String
            slug: String
            category_list: [${NODE_TYPE.Category}]
        }
        
        type ${NODE_TYPE.Tag} implements Node {
            id: ID!
            tag_name: String!
            color: String!
        }

        type ${NODE_TYPE.Category} implements Node {
            id: ID!
            parent: ${NODE_TYPE.Category} @link(by: "id", from: "parent")
            category_name: String!
            slug: String!
            children: [${NODE_TYPE.Category}!]! @link(by: "parent")
        }

        type ${NODE_TYPE.Book} implements Node {
            id: ID!
            book_name: String!
            create_date: Date! @dateformat
            update_date: Date! @dateformat
        }
    `);
  };
