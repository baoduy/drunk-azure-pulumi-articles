import * as azure from "@pulumi/azure-native";
import * as ad from "@pulumi/azuread";
import { getGroupName, getName, tenantId } from "@az-commons";
import * as config from "../config";

// Create Shared Resource Group
const rsGroup = new azure.resources.ResourceGroup(
  getGroupName(config.azGroups.shared),
);

//======================== Create Key Vault ========================//
const vaultName = getName(config.azGroups.shared, "vlt");
const vault = new azure.keyvault.Vault(
  vaultName,
  {
    resourceGroupName: rsGroup.name,
    properties: {
      enablePurgeProtection: true,
      //Must be authenticated with EntraID for accessing.
      enableRbacAuthorization: true,
      enableSoftDelete: true,
      enabledForDeployment: true,
      enabledForDiskEncryption: true,
      softDeleteRetentionInDays: 7, //it should be 90 days or more in PRD
      tenantId,
      sku: {
        name: azure.keyvault.SkuName.Standard,
        family: azure.keyvault.SkuFamily.A,
      },
    },
  },
  { dependsOn: rsGroup },
);

/** As the key vault is require Rbac authentication.
 * So We will create 2 EntraID groups for ReadOnly and Write access to this Key Vault
 */
const vaultReadOnlyGroup = new ad.Group(`${vaultName}-readOnly`, {
  displayName: `AZ ROL VAULT.${config.azGroups.shared.toUpperCase()} READONLY`,
});
const vaultWriteGroup = new ad.Group(`${vaultName}-write`, {
  displayName: `AZ ROL VAULT.${config.azGroups.shared.toUpperCase()} WRITE`,
});

/** This is the roles allows to read the secrets on key vault include (key, certificate and secrets)
 * I put the name and ID here for reference purposes however, only id i used.
 * In here I combined all the roles into 1 Entra group however, if wishes you can split it into different group depend on your env needs.
 * To get all available roles on Azure you can using this Rest API: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-rest
 */
//ReadOnly Roles
[
  {
    name: "Key Vault Crypto Service Encryption User",
    id: "e147488a-f6f5-4113-8e2d-b22465e65bf6",
  },
  {
    name: "Key Vault Secrets User",
    id: "4633458b-17de-408a-b874-0445c86b69e6",
  },
  { name: "Key Vault Crypto User", id: "12338af0-0e69-4776-bea7-57ae8d297424" },
  {
    name: "Key Vault Certificate User",
    id: "db79e9a7-68ee-4b58-9aeb-b90e7c24fcba",
  },
  { name: "Key Vault Reader", id: "21090545-7ca7-4776-b22c-e363652d74d2" },
].map(
  (r) =>
    //Grant the resources roles to the group above.
    new azure.authorization.RoleAssignment(
      `${vaultName}-${r.id}`,
      {
        principalType: "Group",
        principalId: vaultReadOnlyGroup.id,
        roleDefinitionId: r.id,
        scope: vault.id,
      },
      { dependsOn: [vault, vaultReadOnlyGroup] },
    ),
);

//Write Roles
[
  {
    name: "Key Vault Certificates Officer",
    id: "a4417e6f-fecd-4de8-b567-7b0420556985",
  },
  {
    name: "Key Vault Crypto Officer",
    id: "14b46e9e-c2b7-41b4-b07b-48a6ebf60603",
  },
  {
    name: "Key Vault Secrets Officer",
    id: "b86a8fe4-44ce-4948-aee5-eccb2c155cd7",
  },
  { name: "Key Vault Contributor", id: "f25e0fa2-a7c8-4377-a976-54943a77a395" },
].map(
  (r) =>
    //Grant the resources roles to the group above.
    new azure.authorization.RoleAssignment(
      `${vaultName}-${r.id}`,
      {
        principalType: "Group",
        principalId: vaultWriteGroup.id,
        roleDefinitionId: r.id,
        scope: vault.id,
      },
      { dependsOn: [vault, vaultWriteGroup] },
    ),
);

//======================== Logs Resources ========================//
const workspace = new azure.operationalinsights.Workspace(
  getName(config.azGroups.shared, "log"),
  {
    resourceGroupName: rsGroup.name,
    features: { immediatePurgeDataOn30Days: true },
    //For demo purpose I config capacity here is 100Mb. Adjust this according to your env.
    //workspaceCapping: { dailyQuotaGb: 0.1 },
    sku: { name: azure.operationalinsights.WorkspaceSkuNameEnum.Free },
  },
  { dependsOn: rsGroup },
);

const appInsightName = getName(config.azGroups.shared, "insights");
const appInsight = new azure.insights.Component(
  appInsightName,
  {
    resourceGroupName: rsGroup.name,
    workspaceResourceId: workspace.id,
    kind: "web",
    applicationType: "web",
    retentionInDays: 30,
    immediatePurgeDataOn30Days: true,
    ingestionMode: azure.insights.IngestionMode.ApplicationInsights,
  },
  { dependsOn: workspace },
);

//Add appInsight key to vault
new azure.keyvault.Secret(
  `${appInsightName}-key`,
  {
    resourceGroupName: rsGroup.name,
    vaultName: vault.name,
    secretName: `${appInsightName}-key`,
    properties: {
      value: appInsight.instrumentationKey,
      contentType: "AppInsight",
    },
  },
  { dependsOn: appInsight },
);

//Add App insight connection string to vault
new azure.keyvault.Secret(
  `${appInsightName}-conn`,
  {
    resourceGroupName: rsGroup.name,
    vaultName: vault.name,
    secretName: `${appInsightName}-conn`,
    properties: {
      value: appInsight.connectionString,
      contentType: "AppInsight",
    },
  },
  { dependsOn: appInsight },
);
