import { getName } from '@az-commons';
import * as network from '@pulumi/azure-native/network';
import * as inputs from '@pulumi/azure-native/types/input';
import * as pulumi from '@pulumi/pulumi';
import cloudPCRules from './cloudpcPolicyGroup';
import devOpsRules from './devopsPolicyGroup';

export default (
    name: string,
    {
        rsGroupName,
        policyName,
    }: {
        policyName: pulumi.Input<string>;
        rsGroupName: pulumi.Input<string>;
    }
) => {
    const netRules = [...cloudPCRules.netRules, ...devOpsRules.netRules];
    const appRules = [...cloudPCRules.appRules, ...devOpsRules.appRules];
    const ruleCollections: pulumi.Input<inputs.network.FirewallPolicyFilterRuleCollectionArgs>[] =
        [];

    if (netRules.length > 0) {
        ruleCollections.push({
            name: 'net-rules-collection',
            priority: 300,
            ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
            action: {
                type: network.FirewallPolicyFilterRuleCollectionActionType
                    .Allow,
            },
            rules: netRules,
        });
    }
    if (appRules.length > 0) {
        ruleCollections.push({
            name: 'app-rules-collection',
            priority: 301,
            ruleCollectionType: 'FirewallPolicyFilterRuleCollection',
            action: {
                type: network.FirewallPolicyFilterRuleCollectionActionType
                    .Allow,
            },
            rules: appRules,
        });
    }

    return new network.FirewallPolicyRuleCollectionGroup(
        getName(name, 'fw-group'),
        {
            resourceGroupName: rsGroupName,
            firewallPolicyName: policyName,
            priority: 301,
            ruleCollections,
        }
    );
};
