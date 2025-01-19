import * as azure from '@pulumi/azure-native';
import * as config from '../config';
import Log from './Log';
import Vault from './Vault';

// Create Shared Resource Group
const rsGroup = new azure.resources.ResourceGroup(config.azGroups.shared);

//The vault to store env secrets env
const vaultInfo = Vault(config.azGroups.shared, {
    rsGroup,
    //This should be 90 days in PRD.
    retentionInDays: 7,
});

//The centralized log workspace and appInsight
const logInfo = Log(config.azGroups.shared, {
    rsGroup,
    vault: vaultInfo.vault,
});

// Export the information that will be used in the other projects
export default {
    rsGroup: { name: rsGroup.name, id: rsGroup.id },
    logWorkspace: {
        name: logInfo.workspace.name,
        id: logInfo.workspace.id,
        customerId: logInfo.workspace.customerId,
    },
    appInsight: {
        name: logInfo.appInsight.name,
        id: logInfo.appInsight.id,
        key: logInfo.appInsight.instrumentationKey,
    },
    vault: {
        name: vaultInfo.vault.name,
        id: vaultInfo.vault.id,
        readOnlyGroupId: vaultInfo.vaultReadOnlyGroup.id,
        writeGroupId: vaultInfo.vaultWriteGroup.id,
    },
};
