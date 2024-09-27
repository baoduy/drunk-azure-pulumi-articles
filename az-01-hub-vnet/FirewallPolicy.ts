import * as network from "@pulumi/azure-native/network";
import * as resources from "@pulumi/azure-native/resources";
import { currentRegionCode } from "@az-commons";
import { subnetSpaces } from "../config";

// Export a function that creates a Firewall Policy
export default (
  name: string,
  { rsGroup }: { rsGroup: resources.ResourceGroup },
) => {
  let priority = 200; // Initial priority for rule collections

  // Create a Firewall Policy
  const policy = new network.FirewallPolicy(
    `${name}-firewall-policy`,
    {
      resourceGroupName: rsGroup.name, // Resource group name
      snat: { autoLearnPrivateRanges: "Enabled" }, // Enable SNAT auto-learn private ranges
    },
    { dependsOn: rsGroup }, // Ensure the policy depends on the resource group
  );

  // Create a Firewall Policy Rule Collection Group
  new network.FirewallPolicyRuleCollectionGroup(
    `${name}-firewall-policy-group`,
    {
      resourceGroupName: rsGroup.name, // Resource group name
      firewallPolicyName: policy.name, // Name of the firewall policy
      priority: priority++, // Priority of the rule collection group
      ruleCollections: [
        // Rule collection for AKS (Azure Kubernetes Service)
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
        // Rule collection for DevOps
        {
          name: "devops-rules-collection",
          priority: 301, // Priority of the rule collection
          ruleCollectionType: "FirewallPolicyFilterRuleCollection", // Type of rule collection
          action: {
            type: network.FirewallPolicyFilterRuleCollectionActionType.Allow, // Allow action
          },
          rules: [
            // Network Rule for DevOps
            {
              ruleType: "NetworkRule",
              name: "devops-to-aks",
              description:
                "Allows devops to access aks and everything from internet for deployment purposes.",
              ipProtocols: ["TCP"], // Protocols allowed
              sourceAddresses: [subnetSpaces.devOps], // Source addresses
              destinationAddresses: ["*"], // Destination addresses (all)
              destinationPorts: ["443"], // Destination ports
            },
          ],
        },
      ],
    },
    { dependsOn: policy }, // Ensure the rule collection group depends on the policy
  );

  // Return the created firewall policy
  return policy;
};