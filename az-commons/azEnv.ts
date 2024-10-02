import * as azure from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';

// Retrieve the current Azure client configuration
const config = pulumi.output(azure.authorization.getClientConfig());

// Export the tenant ID from the Azure client configuration
export const tenantId = config.apply((c) => c.tenantId);

// Export the subscription ID from the Azure client configuration
export const subscriptionId = config.apply((c) => c.subscriptionId);

// Export the object ID of the current principal (user or service principal)
export const currentPrincipal = config.apply((c) => c.objectId);

// Parse the Pulumi configuration from the environment variable
const env = JSON.parse(process.env.PULUMI_CONFIG ?? '{}');

// Export the current Azure region code, defaulting to "SoutheastAsia" if not set
export const currentRegionCode = env['azure-native:config:location']!;

//Print and Check
pulumi.all([subscriptionId, tenantId]).apply(([s, t]) => {
    console.log(`Azure Environment:`, {
        tenantId: t,
        subscriptionId: s,
        currentRegionCode,
    });
});
