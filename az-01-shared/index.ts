import * as azure from "@pulumi/azure-native";
import { getGroupName } from "@az-commons";
import * as config from "../config";
import Vault from "./Vault";
import Log from "./Log";

// Create Shared Resource Group
const rsGroup = new azure.resources.ResourceGroup(
  getGroupName(config.azGroups.shared),
);

const vaultInfo = Vault(config.azGroups.shared, {
  rsGroup,
  //This should be 90 days in PRD.
  retentionInDays: 7,
});

const logInfo = Log(config.azGroups.shared, {
  rsGroup,
  vault: vaultInfo.vault,
});

// Export the information that will be used in the other projects
export const rsGroupId = rsGroup.id;
export const logWorkspace = {
  id: logInfo.workspace.id,
  customerId: logInfo.workspace.customerId,
};
export const appInsight = {
  id: logInfo.appInsight.id,
  key: logInfo.appInsight.instrumentationKey,
};
export const vault = {
  id: vaultInfo.vault.id,
  readOnlyGroupId: vaultInfo.vaultReadOnlyGroup.id,
  writeGroupId: vaultInfo.vaultWriteGroup.id,
};
