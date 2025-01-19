import { StackReference } from '@az-commons';
import * as azure from '@pulumi/azure-native';
import * as config from '../config';
import FirewallRule from './CloudPcFirewallRules';
import DiskEncryptionSet from './DiskEncryptionSet';
import PrivateDNS from './PrivateDNS';
import VM from './VM';
import VNet from './VNet';

//Reference to the output of `az-01-shared` and `az-02-hub-vnet`.
const sharedStack = StackReference<config.SharedStackOutput>('az-01-shared');
const hubVnetStack = StackReference<config.HubVnetOutput>('az-02-hub-vnet');

//Apply Firewall Rules
FirewallRule(config.azGroups.cloudPC, {
    resourceGroupName: hubVnetStack.rsGroup.name,
    name: hubVnetStack.firewallPolicy.name,
});

//The vault Info from the shared project
const vault = {
    id: sharedStack.vault.id,
    vaultName: sharedStack.vault.name,
    resourceGroupName: sharedStack.rsGroup.name,
    readOnlyGroupId: sharedStack.vault.readOnlyGroupId,
};

// Create Shared Resource Group
const rsGroup = new azure.resources.ResourceGroup(config.azGroups.cloudPC);

// Create Virtual Network with Subnets
const vnet = VNet(config.azGroups.cloudPC, {
    rsGroup,
    subnets: [
        {
            name: 'cloudpc',
            addressPrefix: config.subnetSpaces.cloudPC,
        },
        {
            name: 'devops',
            addressPrefix: config.subnetSpaces.devOps,
        },
    ],
    //allows vnet to firewall's private IP
    securityRules: [
        {
            name: `allows-vnet-to-hub-firewall`,
            description: 'Allows Vnet to hub firewall Outbound',
            priority: 300,
            protocol: '*',
            access: 'Allow',
            direction: 'Outbound',
            sourceAddressPrefix: hubVnetStack.firewall.address.apply(
                (ip) => `${ip}/32`
            ),
            sourcePortRange: '*',
            destinationAddressPrefix: 'VirtualNetwork',
            destinationPortRange: '*',
        },
        {
            name: `allows-aks-to-devops`,
            description: 'Allows aks to devops Inbound',
            priority: 301,
            protocol: '*',
            access: 'Allow',
            direction: 'Inbound',
            sourceAddressPrefix: config.subnetSpaces.aks,
            sourcePortRange: '*',
            destinationAddressPrefix: config.subnetSpaces.devOps,
            destinationPortRange: '*',
        },
    ],
    //route all requests to firewall's private IP
    routes: [
        {
            name: 'route-vnet-to-firewall',
            addressPrefix: '0.0.0.0/0',
            nextHopIpAddress: hubVnetStack.firewall.address,
            nextHopType: 'VirtualAppliance',
        },
    ],
    //peering to hub vnet
    peeringVnet: {
        name: hubVnetStack.hubVnet.name,
        id: hubVnetStack.hubVnet.id,
        resourceGroupName: hubVnetStack.rsGroup.name,
    },
});

//Create Disk Encryption. This shall be able to share to multi VMs
const diskEncryptionSet = DiskEncryptionSet(config.azGroups.cloudPC, {
    rsGroup,
    vault,
});

//Create DevOps Agent 01 VM
const vm = VM('devops-agent-01', {
    diskEncryptionSet,
    rsGroup,
    vmSize: 'Standard_B2s',
    vault,
    vnet,
});

//Create Private DNS Zone
const zone = PrivateDNS('drunkcoding.net', {
    rsGroup,
    privateIpAddress: '192.168.31.250',
    vnetIds: [vnet.id, hubVnetStack.hubVnet.id],
});

// Export the information that will be used in the other projects
export default {
    rsGroup: { name: rsGroup.name, id: rsGroup.id },
    cloudPcVnet: { name: vnet.name, id: vnet.id },
    devopsAgent01: { name: vm.name, id: vm.id },
    privateDNS: { name: zone.name, id: zone.id },
};
