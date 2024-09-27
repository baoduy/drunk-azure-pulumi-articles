# az-01-hub-vnet

This project is a Pulumi script written in TypeScript that provisions Azure resources. It sets up a resource group, a virtual network with subnets, public IP addresses, and an Azure Firewall with specific configurations.

## Overview

The script automates the creation of the following Azure resources:

- Resource Group
- Virtual Network with Subnets
- Public IP Addresses
- Azure Firewall with specific configurations

## Dependencies

The script imports several modules and functions:

- `@pulumi/azure-native/resources`: For creating Azure resource groups.
- `@pulumi/azure-native/network`: For creating network-related resources.
- `@az-commons`: Custom module for utility functions like `getGroupName` and `getName`.
- `../config`: Configuration file containing settings like subnet spaces and group names.
- `./FirewallPolicy`: Custom module for creating firewall policies.

## Resource Creation

### Resource Group

Creates a resource group using a name derived from the configuration.

```typescript
import * as resources from '@pulumi/azure-native/resources';
import { getGroupName } from '@az-commons';
import { config } from '../config';

const rsGroup = new resources.ResourceGroup(getGroupName(config.azGroups.hub));
```

### Virtual Network

Creates a virtual network with three subnets:

- `AzureFirewallSubnet`: For the Azure Firewall.
- `AzureFirewallManagementSubnet`: For managing the Azure Firewall.
- `general`: For general use, with private endpoint network policies enabled.

```typescript
import * as network from '@pulumi/azure-native/network';

const vnet = new network.VirtualNetwork('vnet', {
  resourceGroupName: rsGroup.name,
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
  subnets: [
    {
      name: 'AzureFirewallSubnet',
      addressPrefix: '10.0.1.0/24',
    },
    {
      name: 'AzureFirewallManagementSubnet',
      addressPrefix: '10.0.2.0/24',
    },
    {
      name: 'general',
      addressPrefix: '10.0.3.0/24',
      privateEndpointNetworkPolicies: 'Enabled',
    },
  ],
});
```

### Public IP Addresses

Creates two static public IP addresses:

- `publicIP`: For outbound traffic.
- `managePublicIP`: For managing the Azure Firewall.

```typescript
const publicIP = new network.PublicIPAddress('publicIP', {
  resourceGroupName: rsGroup.name,
  publicIPAllocationMethod: 'Static',
  sku: { name: 'Standard' },
});

const managePublicIP = new network.PublicIPAddress('managePublicIP', {
  resourceGroupName: rsGroup.name,
  publicIPAllocationMethod: 'Static',
  sku: { name: 'Standard' },
});
```

### Azure Firewall

Creates an Azure Firewall with:

- A firewall policy.
- IP configurations for the firewall and management.
- A basic SKU tier.

```typescript
import * as firewall from '@pulumi/azure-native/network';

const firewallPolicy = new firewall.FirewallPolicy('firewallPolicy', {
  resourceGroupName: rsGroup.name,
  sku: { tier: 'Basic' },
});

const firewallInstance = new firewall.AzureFirewall('firewall', {
  resourceGroupName: rsGroup.name,
  sku: { name: 'AZFW_VNet', tier: 'Basic' },
  firewallPolicy: { id: firewallPolicy.id },
  ipConfigurations: [
    {
      name: 'firewallConfig',
      subnet: { id: vnet.subnets[0].id },
      publicIPAddress: { id: publicIP.id },
    },
    {
      name: 'firewallManageConfig',
      subnet: { id: vnet.subnets[1].id },
      publicIPAddress: { id: managePublicIP.id },
    },
  ],
});
```

## Exports

Exports the IDs and addresses of the created resources for use in other projects.

```typescript
export const rsGroupId = rsGroup.id; // Resource group ID
export const vnetId = vnet.id; // Virtual network ID
export const IPAddress = { address: publicIP.ipAddress, id: publicIP.id }; // Public IP address and ID
export const firewallId = {
  address: firewallInstance.ipConfigurations.apply(
    (c) => c![0]!.privateIPAddress!
  ), // Firewall private IP address
  id: firewallInstance.id, // Firewall ID
};
```

## Configuration

The configuration settings for the project are defined in the `config.ts` file.

```typescript
export const azGroups = {
  //The name of Hub VNet resource group
  hub: '01-hub',
  //The name of AKS VNet resource group
  ask: '02-ask',
  //The name of CloudPC VNet resource group
  cloudPC: '03-cloudPC',
};

//The subnet IP address spaces
export const subnetSpaces = {
  firewall: '192.168.30.0/26',
  firewallManage: '192.168.30.64/26',
  general: '192.168.30.128/27',
  aks: '192.168.31.0/24',
  cloudPC: '192.168.32.0/25',
  devOps: '192.168.32.128/27',
};
```

## Usage

### Installation

To install the dependencies, run:

```bash
pnpm install
```

### Building the Project

To build the project, run:

```bash
pnpm run build
```

### Pulumi Commands

- **Initialize a new stack**: `pnpm run new-stack`
- **Deploy the stack**: `pnpm run up`
- **Refresh and deploy the stack**: `pnpm run reup`
- **Destroy the stack**: `pnpm run destroy`
- **Update dependencies**: `pnpm run update`
- **Check dependencies**: `pnpm run check`
- **Export stack state**: `pnpm run export`
- **Import stack state**: `pnpm run import`

## License

This project is licensed under the MIT License.
