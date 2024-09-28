# az-01-shared

## Overview

This project is a minimal Azure Native TypeScript Pulumi program designed to manage shared resources in an Azure environment. It includes the creation of resource groups, key vaults, log workspaces, and application insights, with appropriate role assignments for access control.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [pnpm](https://pnpm.io/installation) (Package manager)
- Azure account with appropriate permissions

## Project Structure

- `index.ts`: Main entry point for the Pulumi program.
- `Vault.ts`: Module for creating and managing Azure Key Vaults.
- `Log/Workspace.ts`: Module for creating and managing Azure Log Workspaces.
- `Log/AppInsight.ts`: Module for creating and managing Azure Application Insights.
- `Log/index.ts`: Aggregates the log workspace and application insights creation.
- `package.json`: Project dependencies and scripts.
- `tsconfig.json`: TypeScript configuration.
- `Pulumi.yaml`: Pulumi project configuration.
- `.gitignore`: Specifies files and directories to be ignored by Git.

## Setup

1. **Clone the repository:**

   ```sh
   git clone <repository-url>
   cd az-01-shared
   ```

2. **Install dependencies:**

   ```sh
   pnpm install
   ```

3. **Configure Pulumi:**

   Initialize a new Pulumi stack and configure the secrets provider:

   ```sh
   pulumi stack init dev --secrets-provider=passphrase
   ```

4. **Set configuration values:**

   Set the required configuration values for your Pulumi stack:

   ```sh
   pulumi config set azure:location <your-azure-location>
   pulumi config set azure:subscriptionId <your-azure-subscription-id>
   pulumi config set azure:tenantId <your-azure-tenant-id>
   ```

## Usage

### Run the project

```sh
pnpm run up
```

## Explanation

### `index.ts`

This is the main entry point of the Pulumi program. It sets up the shared resources for the Azure environment.

1. **Imports**: It imports necessary modules and configurations.
2. **Resource Group**: Creates a shared resource group using the `getGroupName` function and configuration.
3. **Key Vault**: Sets up a Key Vault with a retention policy of 7 days (for demo purposes) and assigns it to the resource group.
4. **Log Resources**: Sets up logging resources (Log Workspace and Application Insights) and associates them with the Key Vault and resource group.
5. **Exports**: Exports the IDs of the created resources so they can be used in other projects.

```typescript
import * as azure from '@pulumi/azure-native';
import { getGroupName } from '@az-commons';
import * as config from '../config';
import Vault from './Vault';
import Log from './Log';

// Create Shared Resource Group
const rsGroup = new azure.resources.ResourceGroup(
  getGroupName(config.azGroups.shared)
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
export const logWorkspaceId = logInfo.workspace.id;
export const appInsightId = logInfo.appInsight.id;
export const vault = {
  id: vaultInfo.vault.id,
  readOnlyGroupId: vaultInfo.vaultReadOnlyGroup.id,
  writeGroupId: vaultInfo.vaultWriteGroup.id,
};
```

### `Vault.ts`

This file defines the creation and management of an Azure Key Vault.

1. **Imports**: Imports necessary modules and utility functions.
2. **Function Definition**: Defines a function that creates a Key Vault with specified properties.
3. **Key Vault Creation**: Creates a Key Vault with RBAC authorization and a soft delete retention policy.
4. **EntraID Groups**: Creates two EntraID groups for read-only and write access to the Key Vault.
5. **Role Assignments**: Assigns specific roles to the read-only and write groups to control access to the Key Vault.
6. **Return**: Returns the created Key Vault and the EntraID groups.

```typescript
import * as azure from '@pulumi/azure-native';
import * as ad from '@pulumi/azuread';
import { getName, tenantId, subscriptionId } from '@az-commons';
import { interpolate } from '@pulumi/pulumi';

export default (
  name: string,
  {
    //it should be 90 days or more in PRD
    retentionInDays = 7,
    rsGroup,
  }: {
    retentionInDays?: number;
    rsGroup: azure.resources.ResourceGroup;
  }
) => {
  const vaultName = getName(name, 'vlt');
  const vault = new azure.keyvault.Vault(
    vaultName,
    {
      resourceGroupName: rsGroup.name,
      properties: {
        //soft delete min value is '7' and max is '90'
        softDeleteRetentionInDays: retentionInDays,
        //Must be authenticated with EntraID for accessing.
        enableRbacAuthorization: true,
        enabledForDeployment: true,
        enabledForDiskEncryption: true,

        tenantId,
        sku: {
          name: azure.keyvault.SkuName.Standard,
          family: azure.keyvault.SkuFamily.A,
        },
      },
    },
    { dependsOn: rsGroup }
  );

  /** As the key vault is require Rbac authentication.
   * So We will create 2 EntraID groups for ReadOnly and Write access to this Key Vault
   */
  const vaultReadOnlyGroup = new ad.Group(`${vaultName}-readOnly`, {
    displayName: `AZ ROL ${vaultName.toUpperCase()} READONLY`,
    securityEnabled: true,
  });
  const vaultWriteGroup = new ad.Group(`${vaultName}-write`, {
    displayName: `AZ ROL ${vaultName.toUpperCase()} WRITE`,
    securityEnabled: true,
  });
  /** This is the roles allows to read the secrets on key vault include (key, certificate and secrets)
   * I put the name and ID here for reference purposes however, only id i used.
   * In here I combined all the roles into 1 Entra group however, if wishes you can split it into different group depend on your env needs.
   * To get all available roles on Azure you can using this Rest API: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-rest
   */
  //ReadOnly Roles
  [
    {
      name: 'Key Vault Crypto Service Encryption User',
      id: 'e147488a-f6f5-4113-8e2d-b22465e65bf6',
    },
    {
      name: 'Key Vault Secrets User',
      id: '4633458b-17de-408a-b874-0445c86b69e6',
    },
    {
      name: 'Key Vault Crypto User',
      id: '12338af0-0e69-4776-bea7-57ae8d297424',
    },
    {
      name: 'Key Vault Certificate User',
      id: 'db79e9a7-68ee-4b58-9aeb-b90e7c24fcba',
    },
    { name: 'Key Vault Reader', id: '21090545-7ca7-4776-b22c-e363652d74d2' },
  ].map(
    (r) =>
      //Grant the resources roles to the group above.
      new azure.authorization.RoleAssignment(
        `${vaultName}-${r.id}`,
        {
          principalType: 'Group',
          principalId: vaultReadOnlyGroup.objectId,
          roleAssignmentName: r.id,
          roleDefinitionId: interpolate`/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${r.id}`,
          scope: vault.id,
        },
        { dependsOn: [vault, vaultReadOnlyGroup] }
      )
  );
  //Write Roles
  [
    {
      name: 'Key Vault Certificates Officer',
      id: 'a4417e6f-fecd-4de8-b567-7b0420556985',
    },
    {
      name: 'Key Vault Crypto Officer',
      id: '14b46e9e-c2b7-41b4-b07b-48a6ebf60603',
    },
    {
      name: 'Key Vault Secrets Officer',
      id: 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7',
    },
    {
      name: 'Key Vault Contributor',
      id: 'f25e0fa2-a7c8-4377-a976-54943a77a395',
    },
  ].map(
    (r) =>
      //Grant the resources roles to the group above.
      new azure.authorization.RoleAssignment(
        `${vaultName}-${r.id}`,
        {
          principalType: 'Group',
          principalId: vaultWriteGroup.objectId,
          roleAssignmentName: r.id,
          roleDefinitionId: interpolate`/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${r.id}`,
          scope: vault.id,
        },
        { dependsOn: [vault, vaultWriteGroup] }
      )
  );

  return { vault, vaultReadOnlyGroup, vaultWriteGroup };
};
```

### `Log/index.ts`

This file aggregates the creation of log-related resources.

1. **Imports**: Imports necessary modules and components for creating log resources.
2. **Function Definition**: Defines a function that creates a Log Workspace and Application Insights.
3. **Workspace and AppInsight**: Calls the respective functions to create a Log Workspace and Application Insights.
4. **Return**: Returns the created Log Workspace and Application Insights.

```typescript
import * as azure from '@pulumi/azure-native';
import Workspace from './Workspace';
import AppInsight from './AppInsight';

export default (
  name: string,
  props: {
    rsGroup: azure.resources.ResourceGroup;
    vault?: azure.keyvault.Vault;
  }
) => {
  const workspace = Workspace(name, props);
  const appInsight = AppInsight(name, { ...props, workspace });

  return { workspace, appInsight };
};
```

### `Log/Workspace.ts`

This file defines the creation of an Azure Log Workspace.

1. **Imports**: Imports necessary modules and utility functions.
2. **Function Definition**: Defines a function that creates a Log Workspace with specified properties.
3. **Log Workspace Creation**: Creates a Log Workspace with a daily quota and SKU.
4. **Return**: Returns the created Log Workspace.

```typescript
import * as azure from '@pulumi/azure-native';
import { getName } from '@az-commons';

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
    getName(name, 'log'),
    {
      resourceGroupName: rsGroup.name,
      features: { immediatePurgeDataOn30Days: true },
      workspaceCapping: { dailyQuotaGb },
      sku: { name: sku },
    },
    { dependsOn: rsGroup }
  );
```

### `Log/AppInsight.ts`

This file defines the creation of an Azure Application Insights resource.

1. **Imports**: Imports necessary modules and utility functions.
2. **Function Definition**: Defines a function that creates an Application Insights resource.
3. **App Insight Creation**: Creates an Application Insights resource and associates it with the Log Workspace.
4. **Key Vault Integration**: If a Key Vault is provided, it stores the Application Insights keys in the Key Vault.
5. **Return**: Returns the created Application Insights resource.

```typescript
import * as azure from '@pulumi/azure-native';
import { getName } from '@az-commons';

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
  const appInsightName = getName(name, 'insights');
  const appInsight = new azure.insights.Component(
    appInsightName,
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
      `${appInsightName}-key`,
      {
        resourceGroupName: rsGroup.name,
        vaultName: vault.name,
        secretName: `${appInsightName}-key`,
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
      `${appInsightName}-conn`,
      {
        resourceGroupName: rsGroup.name,
        vaultName: vault.name,
        secretName: `${appInsightName}-conn`,
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
```
