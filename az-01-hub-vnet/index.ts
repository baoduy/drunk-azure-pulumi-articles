import * as resources from "@pulumi/azure-native/resources";
import * as network from "@pulumi/azure-native/network";
import { getGroupName, getName } from "@az-commons";
import * as config from "../config";

// Create Hub Resource Group
const rsGroup = new resources.ResourceGroup(getGroupName(config.azGroups.hub));

//Public IP Address
const publicIP = new network.PublicIPAddress(getName("outbound", "ip"), {
  resourceGroupName: rsGroup.name,
  sku: {
    name: network.PublicIPAddressSkuName.Standard,
    tier: network.PublicIPAddressSkuTier.Regional,
  },
});

//Create Firewall
const firewall = new network.AzureFirewall(
  getName(config.azGroups.hub, "firewall"),
  {
    resourceGroupName: rsGroup.name,
    firewallPolicy: {},
    ipConfigurations: [
      { name: publicIP.name, publicIPAddress: { id: publicIP.id } },
    ],
    sku: {
      name: network.AzureFirewallSkuName.AZFW_VNet,
      tier: network.AzureFirewallSkuTier.Basic,
    },
  },
  { dependsOn: rsGroup },
);

const vnet = new network.VirtualNetwork(getName(config.azGroups.hub, "vnet"), {
  resourceGroupName: rsGroup.name,
  addressSpace: {
    addressPrefixes: [
      config.subnetSpaces.firewall,
      config.subnetSpaces.general,
    ],
  },
  subnets: [
    { name: "firewall", addressPrefix: config.subnetSpaces.firewall },
    {
      name: "general",
      addressPrefix: config.subnetSpaces.general,
      //Allows Azure Resources Private Link
      privateEndpointNetworkPolicies:
        network.VirtualNetworkPrivateEndpointNetworkPolicies.Enabled,
    },
  ],
});

export const rsGroupId = rsGroup.id;
export const IPAddress = { address: publicIP.ipAddress, id: publicIP.id };
export const firewallId = {
  address: firewall.ipConfigurations.apply(),
  id: firewall.id,
};
export const vnetId = vnet.id;
