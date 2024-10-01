import { getName } from '@az-commons';
import * as azure from '@pulumi/azure-native';

/**
 * Creates an Azure Container Registry (ACR).
 */
export default (
    name: string,
    {
        rsGroup,
        sku = azure.containerregistry.SkuName.Basic,
    }: {
        rsGroup: azure.resources.ResourceGroup;
        sku?: azure.containerregistry.SkuName;
    }
) =>
    new azure.containerregistry.Registry(
        getName(name, 'acr'),
        {
            resourceGroupName: rsGroup.name,
            sku: { name: sku },
            //Enforce using EntraID authentication
            adminUserEnabled: false,
            //The feature below only available in Premium tier
            //encryption
            //networkRuleSet,
            //publicNetworkAccess and private link
        },
        { dependsOn: rsGroup }
    );
