import * as network from "@pulumi/azure-native/network";
import { subnetSpaces } from "../../config";
import * as resources from "@pulumi/azure-native/resources";
import { currentRegionCode } from "@az-commons";

export default ({
  policy,
  rsGroup,
  priority,
}: {
  policy: network.FirewallPolicy;
  rsGroup: resources.ResourceGroup;
  priority: number;
}) =>
  new network.FirewallPolicyRuleCollectionGroup(
    "aks-firewall-policy-group",
    {
      resourceGroupName: rsGroup.name, // Resource group name
      firewallPolicyName: policy.name, // Name of the firewall policy
      priority, // Priority of the rule collection group
      ruleCollections: [
        {
          name: "aks-rules-collection",
          priority: 300, // Priority of the rule collection
          ruleCollectionType: "FirewallPolicyFilterRuleCollection", // Type of rule collection
          action: {
            type: network.FirewallPolicyFilterRuleCollectionActionType.Allow, // Allow action
          },
          rules: [
            // Network Rule for AKS
            {
              ruleType: "NetworkRule",
              name: "azure-services-tags",
              description:
                "Allows internal services to connect to Azure Resources.",
              ipProtocols: ["TCP"], // Protocols allowed
              sourceAddresses: [subnetSpaces.aks], // Source addresses
              destinationAddresses: [
                "AzureContainerRegistry",
                "MicrosoftContainerRegistry",
                "AzureActiveDirectory",
                "AzureMonitor",
                "AppConfiguration",
                "AzureKeyVault",
              ], // Destination addresses
              destinationPorts: ["443"], // Destination ports
            },
            // Application Rule for AKS
            {
              ruleType: "ApplicationRule",
              name: "aks-fqdn",
              description: "Azure Global required FQDN",
              sourceAddresses: [subnetSpaces.aks], // Source addresses
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
              protocols: [{ protocolType: "Https", port: 443 }], // Protocols allowed
            },
          ],
        },
      ],
    },
    { dependsOn: [policy, rsGroup] }, // Ensure the rule collection group depends on the policy
  );
