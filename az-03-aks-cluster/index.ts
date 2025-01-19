import { StackReference } from '@az-commons';
import * as resources from '@pulumi/azure-native/resources';
import * as config from '../config';
import Aks from './Aks';
import FirewallRule from './AksFirewallRules';
import ContainerRegistry from './ContainerRegistry';
import VNet from './VNet';

//Reference to the output of `az-01-shared` and `az-02-hub-vnet`.
const sharedStack = StackReference<config.SharedStackOutput>('az-01-shared');
const hubVnetStack = StackReference<config.HubVnetOutput>('az-02-hub-vnet');

// Create Vnet
const rsGroup = new resources.ResourceGroup(config.azGroups.aks);

//Create Private Container Registry to AKS
const acr = ContainerRegistry(config.azGroups.aks, { rsGroup });

//Apply AKS Firewall Rules this will be a new AKS Firewall Group links to the Hub Firewall Policy created in `az-02-hub`
FirewallRule(config.azGroups.aks, {
    acr,
    rootPolicy: {
        resourceGroupName: hubVnetStack.rsGroup.name,
        name: hubVnetStack.firewallPolicy.name,
    },
});

// Create Virtual Network with Subnets
const vnet = VNet(config.azGroups.aks, {
    rsGroup,
    subnets: [
        {
            name: 'aks',
            addressPrefix: config.subnetSpaces.aks,
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

//Create AKS cluster
const aks = Aks(config.azGroups.aks, {
    rsGroup,
    nodeAdminUserName: config.azGroups.aks,
    vaultInfo: {
        vaultName: sharedStack.vault.name,
        resourceGroupName: sharedStack.rsGroup.name,
    },
    logWorkspaceId: sharedStack.logWorkspace.id,
    tier: 'Free',
    vmSize: 'Standard_B2ms',
    acr,
    vnet,
});

// Export the information that will be used in the other projects
export default {
    rsGroup: { name: rsGroup.name, id: rsGroup.id },
    arc: { name: acr.name, id: acr.id },
    aksVnet: { name: vnet.name, id: vnet.id },
    aks: { name: aks.name, id: aks.id },
};
