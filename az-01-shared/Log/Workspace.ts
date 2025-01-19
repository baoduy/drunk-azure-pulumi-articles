import * as azure from '@pulumi/azure-native';

export default (
    name: string,
    {
        rsGroup,
        //For demo purpose I config capacity here is 100Mb. Adjust this according to your env.
        dailyQuotaGb = 0.1,
        sku = azure.operationalinsights.WorkspaceSkuNameEnum.PerGB2018,
    }: {
        dailyQuotaGb?: number;
        rsGroup: azure.resources.ResourceGroup;
        sku?: azure.operationalinsights.WorkspaceSkuNameEnum;
    }
) =>
    new azure.operationalinsights.Workspace(
        name,
        {
            resourceGroupName: rsGroup.name,
            features: { immediatePurgeDataOn30Days: true },
            workspaceCapping: { dailyQuotaGb },
            sku: { name: sku },
        },
        { dependsOn: rsGroup }
    );
