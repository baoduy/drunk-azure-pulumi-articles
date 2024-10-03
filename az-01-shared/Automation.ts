import { getName } from '@az-commons';
import * as azure from '@pulumi/azure-native';

/**
 * Create a UserAssigned Identity for automation account
 */
const createUserAssignIdentity = (
    name: string,
    rsGroup: azure.resources.ResourceGroup
) =>
    new azure.managedidentity.UserAssignedIdentity(
        getName(name, 'uid'),
        {
            resourceGroupName: rsGroup.name,
        },
        { dependsOn: rsGroup }
    );

/**
 * The automation account for turn on/off resources after working hours.
 * */
export default (name: string, rsGroup: azure.resources.ResourceGroup) => {
    const uid = createUserAssignIdentity(name, rsGroup);

    return new azure.automation.AutomationAccount(
        getName(name, 'auto'),
        {
            resourceGroupName: rsGroup.name,
            publicNetworkAccess: false,
            identity: {
                type: azure.automation.ResourceIdentityType
                    .SystemAssigned_UserAssigned,
                userAssignedIdentities: [uid.id],
            },
            disableLocalAuth: true,
            sku: {
                name: azure.automation.SkuNameEnum.Free,
            },
        },
        { dependsOn: [uid, rsGroup] }
    );
};
