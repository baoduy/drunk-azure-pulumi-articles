import * as resources from "@pulumi/azure-native/resources";
import * as network from "@pulumi/azure-native/network";
import { getGroupName, getName } from "@az-commons";
import * as config from "../config";
import FirewallPolicy from "./FirewallPolicy";

// Create Hub Resource Group
const rsGroup = new resources.ResourceGroup(getGroupName(config.azGroups.hub));

// Create Virtual Network with Subnets
const vnet = new network.VirtualNetwork(
  getName(config.azGroups.hub, "vnet"),
  {
    resourceGroupName: rsGroup.name, // Resource group name
    addressSpace: {
      addressPrefixes: [
        config.subnetSpaces.firewall, // Address space for firewall subnet
        config.subnetSpaces.general, // Address space for general subnet
        config.subnetSpaces.firewallManage, // Address space for firewall management subnet
      ],
    },
    subnets: [
      {
        // Azure Firewall subnet name must be `AzureFirewallSubnet`
        name: "AzureFirewallSubnet",
        addressPrefix: config.subnetSpaces.firewall, // Address prefix for firewall subnet
      },
      {
        // Azure Firewall Management subnet name must be `AzureFirewallManagementSubnet`
        name: "AzureFirewallManagementSubnet",
        addressPrefix: config.subnetSpaces.firewallManage, // Address prefix for firewall management subnet
      },
      {
        name: "general",
        addressPrefix: config.subnetSpaces.general, // Address prefix for general subnet
        // Allows Azure Resources Private Link
        privateEndpointNetworkPolicies:
          network.VirtualNetworkPrivateEndpointNetworkPolicies.Enabled,
      },
    ],
  },
  { dependsOn: rsGroup }, // Ensure the virtual network depends on the resource group
);

// Create Public IP Address for outbound traffic
const publicIP = new network.PublicIPAddress(
  getName("outbound", "ip"),
  {
    resourceGroupName: rsGroup.name, // Resource group name
    publicIPAllocationMethod: network.IPAllocationMethod.Static, // Static IP allocation
    sku: {
      name: network.PublicIPAddressSkuName.Standard, // Standard SKU
      tier: network.PublicIPAddressSkuTier.Regional, // Regional tier
    },
  },
  { dependsOn: rsGroup }, // Ensure the public IP depends on the resource group
);

// Create Management Public IP Address for Firewall "Basic" tier
const managePublicIP = new network.PublicIPAddress(
  getName("manage", "ip"),
  {
    resourceGroupName: rsGroup.name, // Resource group name
    publicIPAllocationMethod: network.IPAllocationMethod.Static, // Static IP allocation
    sku: {
      name: network.PublicIPAddressSkuName.Standard, // Standard SKU
      tier: network.PublicIPAddressSkuTier.Regional, // Regional tier
    },
  },
  { dependsOn: rsGroup }, // Ensure the management public IP depends on the resource group
);

// Create Azure Firewall
const firewall = new network.AzureFirewall(
  getName(config.azGroups.hub, "firewall"),
  {
    resourceGroupName: rsGroup.name, // Resource group name
    firewallPolicy: {
      id: FirewallPolicy(getName(config.azGroups.hub, "fw-policy"), {
        rsGroup,
      }).id, // Firewall policy ID
    },
    ipConfigurations: [
      {
        name: publicIP.name, // Name of the IP configuration
        publicIPAddress: { id: publicIP.id }, // Public IP address ID
        subnet: {
          id: vnet.subnets.apply(
            (s) => s!.find((s) => s!.name === "AzureFirewallSubnet")!.id!,
          ), // Subnet ID for the firewall
        },
      },
    ],
    managementIpConfiguration: {
      name: managePublicIP.name, // Name of the management IP configuration
      publicIPAddress: { id: managePublicIP.id }, // Management public IP address ID
      subnet: {
        id: vnet.subnets.apply(
          (s) =>
            s!.find((s) => s!.name === "AzureFirewallManagementSubnet")!.id!,
        ), // Subnet ID for firewall management
      },
    },
    sku: {
      name: network.AzureFirewallSkuName.AZFW_VNet, // Firewall SKU name
      tier: network.AzureFirewallSkuTier.Basic, // Firewall SKU tier
    },
  },
  { dependsOn: [publicIP, vnet, managePublicIP] }, // Ensure the firewall depends on the public IPs and virtual network
);

// Export the information that will be used in the other projects
export const rsGroupId = rsGroup.id; // Resource group ID
export const vnetId = vnet.id; // Virtual network ID
export const IPAddress = { address: publicIP.ipAddress, id: publicIP.id }; // Public IP address and ID
export const firewallId = {
  address: firewall.ipConfigurations.apply((c) => c![0]!.privateIPAddress!), // Firewall private IP address
  id: firewall.id, // Firewall ID
};