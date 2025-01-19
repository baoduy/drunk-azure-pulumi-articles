import * as azure from '@pulumi/azure-native';

export default (
    name: string,
    {
        vault,
        rsGroup,
        workspace,
    }: {
        rsGroup: azure.resources.ResourceGroup;
        workspace: azure.operationalinsights.Workspace;
        vault?: azure.keyvault.Vault;
    }
) => {
    const appInsight = new azure.insights.Component(
        name,
        {
            resourceGroupName: rsGroup.name,
            workspaceResourceId: workspace.id,
            kind: 'web',
            applicationType: 'web',
            retentionInDays: 30,
            immediatePurgeDataOn30Days: true,
            ingestionMode: azure.insights.IngestionMode.LogAnalytics,
        },
        { dependsOn: workspace }
    );

    if (vault) {
        //Add appInsight key to vault
        new azure.keyvault.Secret(
            `${name}-key`,
            {
                resourceGroupName: rsGroup.name,
                vaultName: vault.name,
                secretName: `${name}-key`,
                properties: {
                    value: appInsight.instrumentationKey,
                    contentType: 'AppInsight',
                },
            },
            {
                dependsOn: appInsight,
                //The option `retainOnDelete` allows to retain the resources on Azure when deleting pulumi resources.
                //In this case the secret will be retained on Key Vault when deleting.
                retainOnDelete: true,
            }
        );

        //Add App insight connection string to vault
        new azure.keyvault.Secret(
            `${name}-conn`,
            {
                resourceGroupName: rsGroup.name,
                vaultName: vault.name,
                secretName: `${name}-conn`,
                properties: {
                    value: appInsight.connectionString,
                    contentType: 'AppInsight',
                },
            },
            {
                dependsOn: appInsight,
                //The option `retainOnDelete` allows to retain the resources on Azure when deleting pulumi resources.
                //In this case the secret will be retained on Key Vault when deleting.
                retainOnDelete: true,
            }
        );
    }

    return appInsight;
};
