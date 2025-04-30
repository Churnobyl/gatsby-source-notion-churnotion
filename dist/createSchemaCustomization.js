"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchemaCustomization = void 0;
const constants_1 = require("./constants");
const createSchemaCustomization = ({ actions, schema }) => {
    const { createTypes } = actions;
    createTypes([
        schema.buildObjectType({
            name: constants_1.NODE_TYPE.Book,
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
                    type: `[${constants_1.NODE_TYPE.Post}]`,
                    extensions: {
                        link: { by: "book", from: "id" },
                    },
                },
                childrenChurnotion: {
                    type: `[${constants_1.NODE_TYPE.Post}]`,
                    resolve: (source, args, context) => {
                        return context.nodeModel.runQuery({
                            query: {
                                filter: {
                                    book: { eq: source.id },
                                },
                            },
                            type: constants_1.NODE_TYPE.Post,
                            firstOnly: false,
                        });
                    },
                },
                url: "String!",
                book_category: {
                    type: constants_1.NODE_TYPE.Category,
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
            name: constants_1.NODE_TYPE.Category,
            interfaces: ["Node"],
            fields: {
                id: "ID!",
                parent: {
                    type: constants_1.NODE_TYPE.Category,
                    extensions: {
                        link: { by: "id", from: "parent" },
                    },
                },
                category_name: "String!",
                slug: "String!",
                children: {
                    type: `[${constants_1.NODE_TYPE.Category}!]!`,
                    extensions: {
                        link: { by: "parent", from: "id" },
                    },
                },
                churnotions: {
                    type: `[${constants_1.NODE_TYPE.Post}]`,
                    extensions: {
                        link: { by: "category", from: "id" },
                    },
                },
                childrenChurnotion: {
                    type: `[${constants_1.NODE_TYPE.Post}]`,
                    resolve: (source, args, context) => {
                        return context.nodeModel.runQuery({
                            query: {
                                filter: {
                                    category: { eq: source.id },
                                },
                            },
                            type: constants_1.NODE_TYPE.Post,
                            firstOnly: false,
                        });
                    },
                },
                url: "String!",
                books: {
                    type: `[${constants_1.NODE_TYPE.Book}]`,
                    extensions: {
                        link: { by: "id" },
                    },
                },
                childrenNBook: {
                    type: `[${constants_1.NODE_TYPE.Book}]`,
                    extensions: {
                        link: { by: "book_category", from: "id" },
                    },
                },
                childrenNCategory: {
                    type: `[${constants_1.NODE_TYPE.Category}]`,
                    extensions: {
                        link: { by: "parent", from: "id" },
                    },
                },
            },
        }),
        `
        type ${constants_1.NODE_TYPE.Post} implements Node {
            id: ID!
            category: ${constants_1.NODE_TYPE.Category}! @link(by: "id", from: "category")
            tags: [${constants_1.NODE_TYPE.Tag}] @link(by: "id")
            book: ${constants_1.NODE_TYPE.Book} @link(by: "id")
            book_index: Int
            title: String
            content: [JSON]
            create_date: Date! @dateformat
            update_date: Date! @dateformat
            version: Int
            description: String
            slug: String
            tableOfContents: [JSON]
            category_list: [${constants_1.NODE_TYPE.Category}]
            url: String!
            thumbnail: File @link(by: "id", from: "thumbnail")
            rawText: String
        }
        
        type ${constants_1.NODE_TYPE.Tag} implements Node {
            id: ID!
            tag_name: String!
            slug: String!
            color: String!
            children: [${constants_1.NODE_TYPE.Post}] @link(by: "id", from: "tags")
            url: String!
        }

        type ${constants_1.NODE_TYPE.Metadata} implements Node {
            id: ID!,
            title: String,
            description: String,
            image: String,
            url: String,
        }

        type ${constants_1.NODE_TYPE.RelatedPost} implements Node {
            posts: [${constants_1.NODE_TYPE.Post}] @link(by: "id")
        }
    `,
    ]);
};
exports.createSchemaCustomization = createSchemaCustomization;
