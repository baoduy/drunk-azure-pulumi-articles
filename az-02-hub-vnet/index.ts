import { StackReference } from '@az-commons';
import * as network from '@pulumi/azure-native/network';
import * as resources from '@pulumi/azure-native/resources';
import * as config from '../config';
import Firewall from './Firewall';
import FirewallPolicy from './FirewallPolicy';
import VNet from './VNet';

//Reference to the output of `az-01-shared` and link workspace to firewall for log monitoring.
const sharedStack = StackReference<config.SharedStackOutput>('az-01-shared');

// Create Hub Resource Group
const rsGroup = new resources.ResourceGroup(config.azGroups.hub);

// Create Virtual Network with Subnets
const vnet = VNet(config.azGroups.hub, {
    rsGroup,
    subnets: [
        {
            // Azure Firewall subnet name must be `AzureFirewallSubnet`
            name: 'AzureFirewallSubnet',
            addressPrefix: config.subnetSpaces.firewall,
        },
        {
            // Azure Firewall Management subnet name must be `AzureFirewallManagementSubnet`
            name: 'AzureFirewallManagementSubnet',
            addressPrefix: config.subnetSpaces.firewallManage,
        },
        {
            name: 'general',
            addressPrefix: config.subnetSpaces.general,
            // Allows Azure Resources Private Link
            privateEndpointNetworkPolicies:
                network.VirtualNetworkPrivateEndpointNetworkPolicies.Enabled,
        },
    ],
});

//Firewall Policy
const policy = FirewallPolicy(config.azGroups.hub, {
    rsGroup,
    //The Policy tier and Firewall tier must be the same
    tier: network.FirewallPolicySkuTier.Basic,
});

const firewallInfo = Firewall(config.azGroups.hub, {
    policy,
    rsGroup,
    vnet,
    //The Policy tier and Firewall tier must be the same
    tier: network.AzureFirewallSkuTier.Basic,
    logWorkspaceId: sharedStack.logWorkspace.id,
});

// Export the information that will be used in the other projects
export default {
    rsGroup: { name: rsGroup.name, id: rsGroup.id },
    hubVnet: { name: vnet.name, id: vnet.id },
    ipAddress: {
        name: firewallInfo.publicIP.name,
        address: firewallInfo.publicIP.ipAddress,
        id: firewallInfo.publicIP.id,
    },
    firewallPolicy: { name: policy.name, id: policy.id },
    firewall: {
        name: firewallInfo.firewall.name,
        address: firewallInfo.firewall.ipConfigurations.apply(
            (c) => c![0]!.privateIPAddress!
        ),
        id: firewallInfo.firewall.id,
    },
};
