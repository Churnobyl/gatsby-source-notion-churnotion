"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchemaCustomization = void 0;
const constants_1 = require("./constants");
const createSchemaCustomization = ({ actions }) => {
    const { createTypes } = actions;
    createTypes(`
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
            rawText: String!
        }
        
        type ${constants_1.NODE_TYPE.Tag} implements Node {
            id: ID!
            tag_name: String!
            slug: String!
            color: String!
            children: [${constants_1.NODE_TYPE.Post}] @link(by: "id", from: "tags")
            url: String!
        }

        type ${constants_1.NODE_TYPE.Category} implements Node {
            id: ID!
            parent: ${constants_1.NODE_TYPE.Category} @link(by: "id", from: "parent")
            category_name: String!
            slug: String!
            children: [${constants_1.NODE_TYPE.Category}!]! @link(by: "parent")
            churnotions: [${constants_1.NODE_TYPE.Post}] @link(by: "category", from: "id")
            url: String!
            books: [${constants_1.NODE_TYPE.Book}] @link(by: "id")
        }

        type ${constants_1.NODE_TYPE.Book} implements Node {
            id: ID!
            book_name: String!
            create_date: Date! @dateformat
            update_date: Date! @dateformat
            children: [${constants_1.NODE_TYPE.Post}] @link(by: "book", from: "id")
            url: String!
            book_category: ${constants_1.NODE_TYPE.Category} @link(by: "id", from: "book_category")
            book_image: File @link(by: "id", from: "book_image")
            description: String!
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
    `);
};
exports.createSchemaCustomization = createSchemaCustomization;
