import * as network from "@pulumi/azure-native/network";
import * as resources from "@pulumi/azure-native/resources";
import aksPolicyGroup from "./FirewallPolicy/aksPolicyGroup";
import devopsPolicyGroup from "./FirewallPolicy/devopsPolicyGroup";

// Export a function that creates a Firewall Policy
export default (
  name: string,
  { rsGroup }: { rsGroup: resources.ResourceGroup },
) => {
  // Create a Firewall Policy
  const policy = new network.FirewallPolicy(
    `${name}-firewall-policy`,
    {
      resourceGroupName: rsGroup.name, // Resource group name
      snat: { autoLearnPrivateRanges: "Enabled" }, // Enable SNAT auto-learn private ranges
    },
    { dependsOn: rsGroup }, // Ensure the policy depends on the resource group
  );

  // Create AKS Group
  aksPolicyGroup({ policy, rsGroup, priority: 300 });
  devopsPolicyGroup({ policy, rsGroup, priority: 301 });

  return policy;
};
