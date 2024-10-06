import { getName } from '@az-commons';
import * as network from '@pulumi/azure-native/network';
import * as inputs from '@pulumi/azure-native/types/input';
import * as pulumi from '@pulumi/pulumi';
import cloudPCRules from './cloudpcPolicyGroup';
import devOpsRules from './devopsPolicyGroup';

export default (
    name: string,
    //This FirewallPolicyRuleCollectionGroup need to be linked to the Root Policy that had been created in `az-02-hub-vnet`
    rootPolicy: {
        name: pulumi.Input<string>;
        resourceGroupName: pulumi.Input<string>;
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
            resourceGroupName: rootPolicy.resourceGroupName,
            firewallPolicyName: rootPolicy.name,
            priority: 301,
            ruleCollections,
        }
    );
};
