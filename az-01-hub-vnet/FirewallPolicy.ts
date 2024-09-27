import * as network from "@pulumi/azure-native/network";
import * as resources from "@pulumi/azure-native/resources";
import { currentRegionCode } from "@az-commons";
import { subnetSpaces } from "../config";

export default (
  name: string,
  { rsGroup }: { rsGroup: resources.ResourceGroup },
) => {
  let priority = 200;

  const policy = new network.FirewallPolicy(
    `${name}-firewall-policy`,
    {
      resourceGroupName: rsGroup.name,
      snat: { autoLearnPrivateRanges: "Enabled" },
    },
    { dependsOn: rsGroup },
  );

  //The network and applications rules required for AKS Private Cluster
  //https://learn.microsoft.com/en-us/azure/aks/outbound-rules-control-egress
  new network.FirewallPolicyRuleCollectionGroup(
    `${name}-firewall-policy-group`,
    {
      resourceGroupName: rsGroup.name,
      firewallPolicyName: policy.name,
      priority: priority++,
      ruleCollections: [
        //aks rules
        {
          name: "aks-rules-collection",
          priority: 300,
          ruleCollectionType: "FirewallPolicyFilterRuleCollection",
          action: {
            type: network.FirewallPolicyFilterRuleCollectionActionType.Allow,
          },
          rules: [
            //Network Rules
            {
              ruleType: "NetworkRule",
              name: "azure-services-tags",
              description:
                "Allows internal services to connect to Azure Resources.",
              ipProtocols: ["TCP"],
              sourceAddresses: [subnetSpaces.aks],
              destinationAddresses: [
                "AzureContainerRegistry",
                "MicrosoftContainerRegistry",
                "AzureActiveDirectory",
                "AzureMonitor",
                "AppConfiguration",
                "AzureKeyVault",
              ],
              destinationPorts: ["443"],
            },
            //Application Rules
            {
              ruleType: "ApplicationRule",
              name: "aks-fqdn",
              description: "Azure Global required FQDN",
              sourceAddresses: [subnetSpaces.aks],
              targetFqdns: [
                //AKS mater
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
          ],
        },
        //devops rules
        {
          name: "devops-rules-collection",
          priority: 301,
          ruleCollectionType: "FirewallPolicyFilterRuleCollection",
          action: {
            type: network.FirewallPolicyFilterRuleCollectionActionType.Allow,
          },
          rules: [
            {
              ruleType: "NetworkRule",
              name: "devops-to-aks",
              description:
                "Allows devops to access aks and everything from internet for deployment purposes.",
              ipProtocols: ["TCP"],
              sourceAddresses: [subnetSpaces.devOps],
              //TODO: Adjust this rule according to your environment needs.
              destinationAddresses: ["*"],
              destinationPorts: ["443"],
            },
          ],
        },
      ],
    },
    { dependsOn: policy },
  );

  //TODO: Add more policy groups here.
  return policy;
};
