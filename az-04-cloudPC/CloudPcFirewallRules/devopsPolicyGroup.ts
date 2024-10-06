import * as inputs from '@pulumi/azure-native/types/input';
import * as pulumi from '@pulumi/pulumi';
import { subnetSpaces } from '../../config';

const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [
    {
        ruleType: 'NetworkRule',
        name: 'devops-to-aks',
        description: 'Allows devops to internet.',
        ipProtocols: ['TCP', 'UDP'],
        sourceAddresses: [subnetSpaces.devOps],
        destinationAddresses: ['*'],
        destinationPorts: ['443', '80'],
    },
];

const appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[] = [];

export default { appRules, netRules };
