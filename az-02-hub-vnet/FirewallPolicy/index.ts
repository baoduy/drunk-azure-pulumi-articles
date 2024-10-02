import * as network from '@pulumi/azure-native/network';
import * as resources from '@pulumi/azure-native/resources';

// Export a function that creates a Firewall Policy
export default (
    name: string,
    {
        rsGroup,
        //This tier should be similar to Firewall tier
        tier = network.FirewallPolicySkuTier.Basic,
    }: {
        rsGroup: resources.ResourceGroup;
        tier?: network.FirewallPolicySkuTier;
    }
) =>
    new network.FirewallPolicy(
        `${name}-fw-policy`,
        {
            resourceGroupName: rsGroup.name,
            sku: { tier },
            snat: { autoLearnPrivateRanges: 'Enabled' },
        },
        { dependsOn: rsGroup } // Ensure the policy depends on the resource group
    );
