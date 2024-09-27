import * as resources from "@pulumi/azure-native/resources";
import * as network from "@pulumi/azure-native/network";
import { getGroupName, getName } from "@az-commons";
import * as config from "../config";
import FirewallPolicy from "./FirewallPolicy";

// Create Hub Resource Group
const rsGroup = new resources.ResourceGroup(getGroupName(config.azGroups.hub));

const vnet = new network.VirtualNetwork(
  getName(config.azGroups.hub, "vnet"),
  {
    resourceGroupName: rsGroup.name,
    addressSpace: {
      addressPrefixes: [
        config.subnetSpaces.firewall,
        config.subnetSpaces.general,
        config.subnetSpaces.firewallManage,
      ],
    },
    subnets: [
      {
        //Azure Firewall subnet name must be `AzureFirewallSubnet`
        name: "AzureFirewallSubnet",
        addressPrefix: config.subnetSpaces.firewall,
      },
      {
        //Azure Firewall Management subnet name must be `AzureFirewallManagementSubnet`
        name: "AzureFirewallManagementSubnet",
        addressPrefix: config.subnetSpaces.firewallManage,
      },
      {
        name: "general",
        addressPrefix: config.subnetSpaces.general,
        //Allows Azure Resources Private Link
        privateEndpointNetworkPolicies:
          network.VirtualNetworkPrivateEndpointNetworkPolicies.Enabled,
      },
    ],
  },
  { dependsOn: rsGroup },
);

//Public IP Address
const publicIP = new network.PublicIPAddress(
  getName("outbound", "ip"),
  {
    resourceGroupName: rsGroup.name,
    publicIPAllocationMethod: network.IPAllocationMethod.Static,
    sku: {
      name: network.PublicIPAddressSkuName.Standard,
      tier: network.PublicIPAddressSkuTier.Regional,
    },
  },
  { dependsOn: rsGroup },
);

//The management public IP address this is required when using Firewall "Basic" tier
const managePublicIP = new network.PublicIPAddress(
  getName("manage", "ip"),
  {
    resourceGroupName: rsGroup.name,
    publicIPAllocationMethod: network.IPAllocationMethod.Static,
    sku: {
      name: network.PublicIPAddressSkuName.Standard,
      tier: network.PublicIPAddressSkuTier.Regional,
    },
  },
  { dependsOn: rsGroup },
);

//Create Firewall
const firewall = new network.AzureFirewall(
  getName(config.azGroups.hub, "firewall"),
  {
    resourceGroupName: rsGroup.name,
    firewallPolicy: {
      id: FirewallPolicy(getName(config.azGroups.hub, "fw-policy"), {
        rsGroup,
      }).id,
    },
    ipConfigurations: [
      {
        name: publicIP.name,
        publicIPAddress: { id: publicIP.id },
        subnet: {
          id: vnet.subnets.apply(
            (s) => s!.find((s) => s!.name === "AzureFirewallSubnet")!.id!,
          ),
        },
      },
    ],
    managementIpConfiguration: {
      name: managePublicIP.name,
      publicIPAddress: { id: managePublicIP.id },
      subnet: {
        id: vnet.subnets.apply(
          (s) =>
            s!.find((s) => s!.name === "AzureFirewallManagementSubnet")!.id!,
        ),
      },
    },
    sku: {
      name: network.AzureFirewallSkuName.AZFW_VNet,
      tier: network.AzureFirewallSkuTier.Basic,
    },
  },
  { dependsOn: [publicIP, vnet, managePublicIP] },
);

//Export the information that will be used in the other projects.
export const rsGroupId = rsGroup.id;
export const vnetId = vnet.id;
export const IPAddress = { address: publicIP.ipAddress, id: publicIP.id };
export const firewallId = {
  address: firewall.ipConfigurations.apply((c) => c![0]!.privateIPAddress!),
  id: firewall.id,
};
