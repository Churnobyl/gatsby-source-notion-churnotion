import { GatsbyNode } from "gatsby";
import { NODE_TYPE } from "./constants";

export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] =
  ({ actions, schema }) => {
    const { createTypes } = actions;

    createTypes([
      schema.buildObjectType({
        name: NODE_TYPE.Book,
        interfaces: ["Node"],
        fields: {
          id: "ID!",
          book_name: "String!",
          create_date: {
            type: "Date!",
            extensions: {
              dateformat: {},
            },
          },
          update_date: {
            type: "Date!",
            extensions: {
              dateformat: {},
            },
          },
          children: {
            type: `[${NODE_TYPE.Post}]`,
            extensions: {
              link: { by: "book", from: "id" },
            },
          },
          childrenChurnotion: {
            type: `[${NODE_TYPE.Post}]`,
            resolve: (source, args, context) => {
              return context.nodeModel.runQuery({
                query: {
                  filter: {
                    book: { eq: source.id },
                  },
                },
                type: NODE_TYPE.Post,
                firstOnly: false,
              });
            },
          },
          url: "String!",
          book_category: {
            type: NODE_TYPE.Category,
            extensions: {
              link: { by: "id", from: "book_category" },
            },
          },
          book_image: {
            type: "File",
            extensions: {
              link: { by: "id", from: "book_image" },
            },
          },
          description: "String!",
        },
      }),

      schema.buildObjectType({
        name: NODE_TYPE.Category,
        interfaces: ["Node"],
        fields: {
          id: "ID!",
          parent: {
            type: NODE_TYPE.Category,
            extensions: {
              link: { by: "id", from: "parent" },
            },
          },
          category_name: "String!",
          slug: "String!",
          children: {
            type: `[${NODE_TYPE.Category}!]!`,
            extensions: {
              link: { by: "parent", from: "id" },
            },
          },
          churnotions: {
            type: `[${NODE_TYPE.Post}]`,
            extensions: {
              link: { by: "category", from: "id" },
            },
          },
          childrenChurnotion: {
            type: `[${NODE_TYPE.Post}]`,
            resolve: (source, args, context) => {
              return context.nodeModel.runQuery({
                query: {
                  filter: {
                    category: { eq: source.id },
                  },
                },
                type: NODE_TYPE.Post,
                firstOnly: false,
              });
            },
          },
          url: "String!",
          books: {
            type: `[${NODE_TYPE.Book}]`,
            extensions: {
              link: { by: "id" },
            },
          },
          childrenNBook: {
            type: `[${NODE_TYPE.Book}]`,
            extensions: {
              link: { by: "book_category", from: "id" },
            },
          },
          childrenNCategory: {
            type: `[${NODE_TYPE.Category}]`,
            extensions: {
              link: { by: "parent", from: "id" },
            },
          },
        },
      }),

      `
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
            rawText: String
        }
        
        type ${NODE_TYPE.Tag} implements Node {
            id: ID!
            tag_name: String!
            slug: String!
            color: String!
            children: [${NODE_TYPE.Post}] @link(by: "id", from: "tags")
            url: String!
        }

        type Fields {
            childrenChurnotion: [${NODE_TYPE.Post}] @link(by: "id")
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
    `,
    ]);
  };
