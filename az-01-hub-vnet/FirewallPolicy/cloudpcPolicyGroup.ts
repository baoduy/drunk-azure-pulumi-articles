import { subnetSpaces } from "../../config";
import { currentRegionCode } from "@az-commons";
import * as pulumi from "@pulumi/pulumi";
import * as inputs from "@pulumi/azure-native/types/input";

const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [
  {
    ruleType: "NetworkRule",
    name: "cloudpc-to-aks",
    description: "Allows CloudPC access to AKS and DevOps.",
    ipProtocols: ["TCP"],
    sourceAddresses: [subnetSpaces.cloudPC],
    destinationAddresses: [subnetSpaces.devOps, subnetSpaces.aks],
    destinationPorts: ["443"],
  },
  {
    ruleType: "NetworkRule",
    name: "cloudpc-services-tags",
    description: "Allows CloudPC access to Azure Resources.",
    ipProtocols: ["TCP"],
    sourceAddresses: [subnetSpaces.aks],
    destinationAddresses: [`AzureCloud.${currentRegionCode}`],
    destinationPorts: ["443"],
  },
];

const appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[] = [];

export default { appRules, netRules };
