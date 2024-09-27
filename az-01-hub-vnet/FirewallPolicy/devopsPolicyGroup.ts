import * as network from "@pulumi/azure-native/network";
import { subnetSpaces } from "../../config";
import * as resources from "@pulumi/azure-native/resources";

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
    "devops-firewall-policy-group",
    {
      resourceGroupName: rsGroup.name, // Resource group name
      firewallPolicyName: policy.name, // Name of the firewall policy
      priority, // Priority of the rule collection group
      ruleCollections: [
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
    { dependsOn: [policy, rsGroup] }, // Ensure the rule collection group depends on the policy
  );
