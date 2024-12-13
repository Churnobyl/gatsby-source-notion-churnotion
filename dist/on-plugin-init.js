"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPluginInit = void 0;
const onPluginInit = ({ reporter }) => {
    reporter.info(`Example plugin loaded...`);
};
exports.onPluginInit = onPluginInit;
