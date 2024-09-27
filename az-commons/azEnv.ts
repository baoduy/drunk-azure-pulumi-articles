import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

const config = pulumi.output(azure.authorization.getClientConfig());
export const tenantId = config.apply((c) => c.tenantId);
export const subscriptionId = config.apply((c) => c.subscriptionId);
export const currentPrincipal = config.apply((c) => c.objectId);

const env = JSON.parse(process.env.PULUMI_CONFIG ?? "{}");
export const currentRegionCode = (env["azure-native:config:location"] ??
  "SoutheastAsia") as string;
