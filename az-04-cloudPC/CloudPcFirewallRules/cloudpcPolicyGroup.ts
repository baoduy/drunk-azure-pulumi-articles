import { currentRegionCode } from '@az-commons';
import * as inputs from '@pulumi/azure-native/types/input';
import * as pulumi from '@pulumi/pulumi';
import { subnetSpaces } from '../../config';

const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [
    {
        ruleType: 'NetworkRule',
        name: 'cloudPC-to-aks',
        description: 'Allows CloudPC access to AKS and DevOps.',
        ipProtocols: ['TCP'],
        sourceAddresses: [subnetSpaces.cloudPC],
        destinationAddresses: [subnetSpaces.devOps, subnetSpaces.aks],
        destinationPorts: ['443'],
    },
    {
        ruleType: 'NetworkRule',
        name: 'cloudPC-services-tags',
        description: 'Allows CloudPC access to Azure Resources.',
        ipProtocols: ['TCP'],
        sourceAddresses: [subnetSpaces.cloudPC],
        destinationAddresses: [`AzureCloud.${currentRegionCode}`],
        destinationPorts: ['443'],
    },
    {
        ruleType: 'NetworkRule',
        name: `cloudPC-net-allow-win365-windows-net`,
        description: 'CloudPc allows Windows 365 windows.net',
        ipProtocols: ['TCP'],
        sourceAddresses: [subnetSpaces.cloudPC],
        destinationAddresses: ['40.83.235.53'],
        destinationPorts: ['1688'],
    },
    {
        ruleType: 'NetworkRule',
        name: `cloudPC-net-allow-win365-azure-devices`,
        description: 'CloudPc allows Windows 365 azure-devices',
        ipProtocols: ['TCP'],
        sourceAddresses: [subnetSpaces.cloudPC],
        destinationAddresses: [
            '23.98.104.204',
            '40.78.238.4',
            '20.150.179.224',
            '52.236.189.131',
            '13.69.71.14',
            '13.69.71.2',
            '13.70.74.193',
            '13.86.221.39',
            '13.86.221.36',
            '13.86.221.43',
        ],
        destinationPorts: ['443', '5671'],
    },
    {
        ruleType: 'NetworkRule',
        name: `${name}-net-allow-win365-udp-tcp`,
        description: 'CloudPc allows Windows 365 udp tcp',
        ipProtocols: ['UDP', 'TCP'],
        sourceAddresses: [subnetSpaces.cloudPC],
        destinationAddresses: ['20.202.0.0/16'],
        destinationPorts: ['443', '3478'],
    },
];

const appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[] = [
    {
        ruleType: 'ApplicationRule',
        name: `cloudPC-app-allow-update`,
        description: 'Allows Windows Updates',
        sourceAddresses: [subnetSpaces.cloudPC],
        fqdnTags: ['WindowsUpdate', 'WindowsDiagnostics', 'AzureBackup'],
        protocols: [{ protocolType: 'Https', port: 443 }],
    },
    {
        ruleType: 'ApplicationRule',
        name: `cloudPC-app-allow-win365`,
        description: 'Allows Windows365',
        sourceAddresses: [subnetSpaces.cloudPC],
        fqdnTags: ['Windows365', 'MicrosoftIntune'],
        protocols: [{ protocolType: 'Https', port: 443 }],
    },
];

export default { appRules, netRules };
