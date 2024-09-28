import * as resources from "@pulumi/azure-native/resources";
import * as pulumi from "@pulumi/pulumi";
import * as network from "@pulumi/azure-native/network";
import { getGroupName, StackReference } from "@az-commons";
import * as config from "../config";
import VNet from "./VNet";
import Firewall from "./Firewall";
import FirewallPolicy from "./FirewallPolicy";

//Reference to the output of `az-01-shared` and link workspace to firewall for log monitoring.
const sharedStack = StackReference("az-01-shared") as pulumi.Output<{
  logWorkspace: { id: string };
}>;

// Create Hub Resource Group
const rsGroup = new resources.ResourceGroup(getGroupName(config.azGroups.hub));

// Create Virtual Network with Subnets
const vnet = VNet(config.azGroups.hub, {
  rsGroup,
  subnets: [
    {
      // Azure Firewall subnet name must be `AzureFirewallSubnet`
      name: "AzureFirewallSubnet",
      addressPrefix: config.subnetSpaces.firewall,
    },
    {
      // Azure Firewall Management subnet name must be `AzureFirewallManagementSubnet`
      name: "AzureFirewallManagementSubnet",
      addressPrefix: config.subnetSpaces.firewallManage,
    },
    {
      name: "general",
      addressPrefix: config.subnetSpaces.general,
      // Allows Azure Resources Private Link
      privateEndpointNetworkPolicies:
        network.VirtualNetworkPrivateEndpointNetworkPolicies.Enabled,
    },
  ],
});

//Firewall Policy
const rules = FirewallPolicy(config.azGroups.hub, {
  rsGroup,
  //The Policy tier and Firewall tier must be the same
  tier: network.FirewallPolicySkuTier.Basic,
});

const { publicIP, firewall } = Firewall(config.azGroups.hub, {
  ...rules,
  rsGroup,
  vnet,
  //The Policy tier and Firewall tier must be the same
  tier: network.AzureFirewallSkuTier.Basic,
  logWorkspaceId: sharedStack.logWorkspace.id,
});

// Export the information that will be used in the other projects
export const rsGroupId = rsGroup.id;
export const hubVnetId = vnet.id;
export const ipAddress = { address: publicIP.ipAddress, id: publicIP.id };
export const firewallId = {
  address: firewall.ipConfigurations.apply((c) => c![0]!.privateIPAddress!),
  id: firewall.id,
};