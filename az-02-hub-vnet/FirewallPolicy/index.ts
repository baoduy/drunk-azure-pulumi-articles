import * as network from "@pulumi/azure-native/network";
import * as resources from "@pulumi/azure-native/resources";
//import aksPolicyGroup from "./aksPolicyGroup";
import devopsPolicyGroup from "./devopsPolicyGroup";
import cloudpcPolicyGroup from "./cloudpcPolicyGroup";
import * as pulumi from "@pulumi/pulumi";
import * as inputs from "@pulumi/azure-native/types/input";

//Create Firewall Policy Group for appRules and netRules
const createPolicyGroup = (
  name: string,
  {
    appRules,
    netRules,
    rsGroup,
    policy,
  }: {
    policy: network.FirewallPolicy;
    rsGroup: resources.ResourceGroup;
    netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[];
    appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[];
  },
) => {
  const ruleCollections: pulumi.Input<inputs.network.FirewallPolicyFilterRuleCollectionArgs>[] =
    [];
  if (netRules.length > 0) {
    ruleCollections.push({
      name: "net-rules-collection",
      priority: 300,
      ruleCollectionType: "FirewallPolicyFilterRuleCollection",
      action: {
        type: network.FirewallPolicyFilterRuleCollectionActionType.Allow,
      },
      rules: netRules,
    });
  }
  if (appRules.length > 0) {
    ruleCollections.push({
      name: "app-rules-collection",
      priority: 301,
      ruleCollectionType: "FirewallPolicyFilterRuleCollection",
      action: {
        type: network.FirewallPolicyFilterRuleCollectionActionType.Allow,
      },
      rules: appRules,
    });
  }

  return new network.FirewallPolicyRuleCollectionGroup(
    `${name}-fw-group`,
    {
      resourceGroupName: rsGroup.name, // Resource group name
      firewallPolicyName: policy.name, // Name of the firewall policy
      priority: 300, // Priority of the rule collection group
      ruleCollections,
    },
    // Ensure the rule collection group depends on the policy
    { dependsOn: [policy, rsGroup] },
  );
};

// Export a function that creates a Firewall Policy
export default (
  name: string,
  {
    rsGroup,
    //This tier should be similar to Firewall tier
    tier = network.FirewallPolicySkuTier.Basic,
  }: {
    rsGroup: resources.ResourceGroup;
    tier?: network.FirewallPolicySkuTier;
  },
) => {
  // Create a Firewall Policy
  const policy = new network.FirewallPolicy(
    `${name}-fw-policy`,
    {
      resourceGroupName: rsGroup.name,
      sku: { tier },
      snat: { autoLearnPrivateRanges: "Enabled" },
    },
    { dependsOn: rsGroup }, // Ensure the policy depends on the resource group
  );

  const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [];
  const appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[] = [];

  // Policy Groups
  //netRules.push(...aksPolicyGroup.netRules);
  //appRules.push(...aksPolicyGroup.appRules);
  netRules.push(...devopsPolicyGroup.netRules);
  appRules.push(...devopsPolicyGroup.appRules);
  netRules.push(...cloudpcPolicyGroup.netRules);
  appRules.push(...cloudpcPolicyGroup.appRules);

  //Create Policy Group for the rules above
  const policyGroup = createPolicyGroup(name, {
    appRules,
    netRules,
    rsGroup,
    policy,
  });

  return { policy, policyGroup };
};
