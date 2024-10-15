import { currentRegionCode, getName } from '@az-commons';
import * as azure from '@pulumi/azure-native';
import * as network from '@pulumi/azure-native/network';
import * as inputs from '@pulumi/azure-native/types/input';
import * as pulumi from '@pulumi/pulumi';
import { subnetSpaces } from '../config';

const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [
    // Network Rule for AKS
    {
        ruleType: 'NetworkRule',
        name: 'azure-net-services-tags',
        description: 'Allows internal services to connect to Azure Resources.',
        ipProtocols: ['TCP'],
        sourceAddresses: [subnetSpaces.aks],
        destinationAddresses: [
            'MicrosoftContainerRegistry',
            'AzureMonitor',
            'AzureBackup',
            'AzureKeyVault',
            'AzureContainerRegistry',
            'Storage',
            'AzureActiveDirectory',
        ],
        destinationPorts: ['443'],
    },
    {
        ruleType: 'NetworkRule',
        name: 'aks-net-allows-commons-dns',
        description: 'Others DNS.',
        ipProtocols: ['TCP', 'UDP'],
        //This rule will allow the entire network.
        sourceAddresses: ['*'],
        destinationAddresses: [
            //Azure
            '168.63.129.16',
            //CloudFlare
            '1.1.1.1',
            '1.0.0.1',
            //Google
            '8.8.8.8',
            '8.8.4.4',
        ],
        destinationPorts: ['53'],
    },
    {
        ruleType: 'NetworkRule',
        name: 'aks-net-allows-cf-tunnel',
        description: 'Allows Cloudflare Tunnel',
        ipProtocols: ['TCP', 'UDP'],
        sourceAddresses: [subnetSpaces.aks],
        destinationAddresses: [
            '198.41.192.167',
            '198.41.192.67',
            '198.41.192.57',
            '198.41.192.107',
            '198.41.192.27',
            '198.41.192.7',
            '198.41.192.227',
            '198.41.192.47',
            '198.41.192.37',
            '198.41.192.77',
            '198.41.200.13',
            '198.41.200.193',
            '198.41.200.33',
            '198.41.200.233',
            '198.41.200.53',
            '198.41.200.63',
            '198.41.200.113',
            '198.41.200.73',
            '198.41.200.43',
            '198.41.200.23',
        ],
        destinationPorts: ['7844'],
    },
    {
        ruleType: 'NetworkRule',
        name: 'aks-net-allows-to-devops',
        description: 'Allows AKS to access DevOps',
        ipProtocols: ['TCP', 'UDP'],
        sourceAddresses: [subnetSpaces.aks],
        destinationAddresses: [subnetSpaces.devOps],
        destinationPorts: ['80', '443', '22'],
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
            //allows lets-encrypt
            'acme-v02.api.letsencrypt.org',
            //allows cloudflare api
            'api.cloudflare.com',
        ],
        protocols: [{ protocolType: 'Https', port: 443 }],
    },
    {
        ruleType: 'ApplicationRule',
        name: `aks-app-allow-cloudflare`,
        description: 'Allows CF Tunnel to access to Cloudflare.',
        sourceAddresses: [subnetSpaces.aks],
        targetFqdns: [
            '*.argotunnel.com',
            '*.cftunnel.com',
            '*.cloudflareaccess.com',
            '*.cloudflareresearch.com',
        ],
        protocols: [
            { protocolType: 'Https', port: 443 },
            { protocolType: 'Https', port: 7844 },
        ],
    },
];

export default (
    name: string,
    {
        acr,
        rootPolicy,
    }: {
        acr: azure.containerregistry.Registry;
        //This FirewallPolicyRuleCollectionGroup need to be linked to the Root Policy that had been created in `az-02-hub-vnet`
        rootPolicy: {
            name: pulumi.Input<string>;
            resourceGroupName: pulumi.Input<string>;
        };
    }
) =>
    new network.FirewallPolicyRuleCollectionGroup(
        getName(name, 'fw-group'),
        {
            resourceGroupName: rootPolicy.resourceGroupName,
            firewallPolicyName: rootPolicy.name,
            priority: 300,
            ruleCollections: [
                {
                    name: 'net-rules-collection',
                    priority: 300,
                    ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
                    action: {
                        type: network
                            .FirewallPolicyFilterRuleCollectionActionType.Allow,
                    },
                    rules: netRules,
                },
                {
                    name: 'app-rules-collection',
                    priority: 301,
                    ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
                    action: {
                        type: network
                            .FirewallPolicyFilterRuleCollectionActionType.Allow,
                    },
                    rules: [
                        ...appRules,
                        {
                            ruleType: 'ApplicationRule',
                            name: 'aks-allows-pull-arc',
                            description:
                                'Only allows AKS to pull image from private ACR',
                            sourceAddresses: [subnetSpaces.aks],
                            targetFqdns: [
                                pulumi.interpolate`${acr.name}.azurecr.io`,
                            ],
                            protocols: [{ protocolType: 'Https', port: 443 }],
                        },
                    ],
                },
            ],
        },
        { dependsOn: acr }
    );
