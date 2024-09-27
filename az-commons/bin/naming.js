"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getName = exports.getGroupName = void 0;
const stackEnv_1 = require("./stackEnv");
/**
 * The method to get resource group name that always add stack name as prefix.
 * */
const getGroupName = (name) => `${stackEnv_1.stack}-${name}`;
exports.getGroupName = getGroupName;
/**
 * The method to get resource name that always add stack name as prefix
 * */
const getName = (name, suffix = undefined) => {
    //remove number form the name
    name = name.replace(/^\d+-/, "");
    return suffix ? `${stackEnv_1.stack}-${name}-${suffix}` : `${stackEnv_1.stack}-${name}`;
};
exports.getName = getName;
//# sourceMappingURL=naming.js.map