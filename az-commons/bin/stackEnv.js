"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stack = exports.projectName = exports.organization = exports.isDryRun = void 0;
const pulumi = require("@pulumi/pulumi");
exports.isDryRun = Boolean(process.env.PULUMI_NODEJS_DRY_RUN);
exports.organization = process.env.PULUMI_NODEJS_ORGANIZATION;
exports.projectName = process.env.PULUMI_NODEJS_PROJECT ?? pulumi.getProject().toLowerCase();
exports.stack = process.env.PULUMI_NODEJS_STACK ?? pulumi.getStack().toLowerCase();
console.log("Pulumi Environments:", {
    organization: exports.organization,
    projectName: exports.projectName,
    stack: exports.stack,
    isDryRun: exports.isDryRun,
});
//# sourceMappingURL=stackEnv.js.map