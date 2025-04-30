"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPagesStatefully = exports.onPostBootstrap = exports.createSchemaCustomization = exports.sourceNodes = exports.onPluginInit = void 0;
var onPluginInit_1 = require("./onPluginInit");
Object.defineProperty(exports, "onPluginInit", { enumerable: true, get: function () { return onPluginInit_1.onPluginInit; } });
var source_nodes_1 = require("./source-nodes");
Object.defineProperty(exports, "sourceNodes", { enumerable: true, get: function () { return source_nodes_1.sourceNodes; } });
var createSchemaCustomization_1 = require("./createSchemaCustomization");
Object.defineProperty(exports, "createSchemaCustomization", { enumerable: true, get: function () { return createSchemaCustomization_1.createSchemaCustomization; } });
var onPostBootstrap_1 = require("./onPostBootstrap");
Object.defineProperty(exports, "onPostBootstrap", { enumerable: true, get: function () { return onPostBootstrap_1.onPostBootstrap; } });
// Set priority to ensure onPostBootstrap runs before any createPages functions
const createPagesStatefully = async (...args) => {
    // This is a placeholder function that does nothing
    // It exists only to set the waitFor property
};
exports.createPagesStatefully = createPagesStatefully;
// Wait for onPostBootstrap to complete before running createPages
exports.createPagesStatefully.waitFor = ["onPostBootstrap"];
