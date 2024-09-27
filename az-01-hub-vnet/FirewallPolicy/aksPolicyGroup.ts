import { subnetSpaces } from "../../config";
import { currentRegionCode } from "@az-commons";
import * as pulumi from "@pulumi/pulumi";
import * as inputs from "@pulumi/azure-native/types/input";

const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [
  // Network Rule for AKS
  {
    ruleType: "NetworkRule",
    name: "azure-services-tags",
    description: "Allows internal services to connect to Azure Resources.",
    ipProtocols: ["TCP"],
    sourceAddresses: [subnetSpaces.aks],
    destinationAddresses: [
      "AzureContainerRegistry",
      "MicrosoftContainerRegistry",
      "AzureMonitor",
      "AppConfiguration",
      "AzureKeyVault",
    ],
    destinationPorts: ["443"],
  },
];

const appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[] = [
  // Application Rule for AKS
  {
    ruleType: "ApplicationRule",
    name: "aks-fqdn",
    description: "Azure Global required FQDN",
    sourceAddresses: [subnetSpaces.aks],
    targetFqdns: [
      // Target FQDNs
      `*.hcp.${currentRegionCode}.azmk8s.io`,
      "mcr.microsoft.com",
      "*.data.mcr.microsoft.com",
      "mcr-0001.mcr-msedge.net",
      "management.azure.com",
      "login.microsoftonline.com",
      "packages.microsoft.com",
      "acs-mirror.azureedge.net",
    ],
    protocols: [{ protocolType: "Https", port: 443 }],
  },
];

export default { appRules, netRules };
