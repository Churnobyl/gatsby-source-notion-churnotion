"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = void 0;
const slugify = (text) => {
    return text.toLowerCase().replace(/\s+/g, `-`);
};
exports.slugify = slugify;
