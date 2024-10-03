import { currentRegionCode, getName } from '@az-commons';
import * as network from '@pulumi/azure-native/network';
import * as inputs from '@pulumi/azure-native/types/input';
import * as pulumi from '@pulumi/pulumi';
import { subnetSpaces } from '../config';

const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [
    // Network Rule for AKS
    {
        ruleType: 'NetworkRule',
        name: 'azure-services-tags',
        description: 'Allows internal services to connect to Azure Resources.',
        ipProtocols: ['TCP'],
        sourceAddresses: [subnetSpaces.aks],
        destinationAddresses: [
            'AzureContainerRegistry',
            'MicrosoftContainerRegistry',
            'AzureMonitor',
            'AppConfiguration',
            'AzureKeyVault',
        ],
        destinationPorts: ['443'],
    },
];

const appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[] = [
    // Application Rule for AKS
    {
        ruleType: 'ApplicationRule',
        name: 'aks-fqdn',
        description: 'Azure Global required FQDN',
        sourceAddresses: [subnetSpaces.aks],
        targetFqdns: [
            // Target FQDNs
            `*.hcp.${currentRegionCode}.azmk8s.io`,
            'mcr.microsoft.com',
            '*.data.mcr.microsoft.com',
            'mcr-0001.mcr-msedge.net',
            'management.azure.com',
            'login.microsoftonline.com',
            'packages.microsoft.com',
            'acs-mirror.azureedge.net',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
    },
];

export default (
    name: string,
    //This FirewallPolicyRuleCollectionGroup need to be linked to the Root Policy that had been created in `az-02-hub-vnet`
    rootPolicy: {
        name: pulumi.Input<string>;
        resourceGroupName: pulumi.Input<string>;
    }
) =>
    new network.FirewallPolicyRuleCollectionGroup(getName(name, 'fw-group'), {
        resourceGroupName: rootPolicy.resourceGroupName,
        firewallPolicyName: rootPolicy.name,
        priority: 300,
        ruleCollections: [
            {
                name: 'net-rules-collection',
                priority: 300,
                ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
                action: {
                    type: network.FirewallPolicyFilterRuleCollectionActionType
                        .Allow,
                },
                rules: netRules,
            },
            {
                name: 'app-rules-collection',
                priority: 301,
                ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
                action: {
                    type: network.FirewallPolicyFilterRuleCollectionActionType
                        .Allow,
                },
                rules: appRules,
            },
        ],
    });
