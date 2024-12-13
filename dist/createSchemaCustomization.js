"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchemaCustomization = void 0;
const constants_1 = require("./constants");
const createSchemaCustomization = ({ actions }) => {
    const { createTypes } = actions;
    createTypes(`
        type ${constants_1.NODE_TYPE.Post} implements Node {
            id: ID!
            category_id: ${constants_1.NODE_TYPE.Category} @link(by: "id")
            tags: ${constants_1.NODE_TYPE.Tag} @link(by: "id")
            book_id: ${constants_1.NODE_TYPE.Book} @link(by: "id")
            title: String
            content: [JSON]
            create_date: Date! @dateformat
            update_date: Date! @dateformat
            version: Int
            description: String
            slug: String
        }
        
        type ${constants_1.NODE_TYPE.Tag} implements Node {
            id: ID!
            tag_name: String!
            color: String!
        }

        type ${constants_1.NODE_TYPE.Category} implements Node {
            id: ID!
            parent_id: ${constants_1.NODE_TYPE.Category} @link(by: "id")
            category_name: String!
            slug: String!
        }

        type ${constants_1.NODE_TYPE.Book} implements Node {
            id: ID!
            book_name: String!
            create_date: Date! @dateformat
            update_date: Date! @dateformat
        }
    `);
};
exports.createSchemaCustomization = createSchemaCustomization;
