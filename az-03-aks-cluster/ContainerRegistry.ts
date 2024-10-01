import * as azure from "@pulumi/azure-native";
import { getName } from "@az-commons";

export default (
  name: string,
  { rsGroup }: { rsGroup: azure.resources.ResourceGroup },
) =>
  new azure.containerregistry.Registry(
    getName(name, "acr"),
    {
      resourceGroupName: rsGroup.name,
      sku: { name: azure.containerregistry.SkuName.Basic },
      //Enforce using EntraID authentication
      adminUserEnabled: false,

      //The feature below only available in Premium tier
      //encryption
      //networkRuleSet,
      //publicNetworkAccess and private link
    },
    { dependsOn: rsGroup },
  );
