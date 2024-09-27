"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentRegionName = exports.currentPrincipal = exports.subscriptionId = exports.tenantId = void 0;
const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure-native");
const config = pulumi.output(azure.authorization.getClientConfig());
exports.tenantId = config.apply((c) => c.tenantId);
exports.subscriptionId = config.apply((c) => c.subscriptionId);
exports.currentPrincipal = config.apply((c) => c.objectId);
const env = JSON.parse(process.env.PULUMI_CONFIG ?? "{}");
exports.currentRegionName = (env["azure-native:config:location"] ??
    "SoutheastAsia");
//# sourceMappingURL=azEnv.js.map