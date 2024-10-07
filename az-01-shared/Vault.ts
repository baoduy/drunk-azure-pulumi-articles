import { currentPrincipal, getName, tenantId } from '@az-commons';
import * as azure from '@pulumi/azure-native';
import * as ad from '@pulumi/azuread';

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
                //This must be enabled for VM Disk encryption
                enablePurgeProtection: true,
                enabledForDiskEncryption: true,
                //soft delete min value is '7' and max is '90'
                softDeleteRetentionInDays: retentionInDays,
                //Must be authenticated with EntraID for accessing.
                enableRbacAuthorization: true,
                //enabledForDeployment: true,
                tenantId,
                sku: {
                    name: azure.keyvault.SkuName.Standard,
                    family: azure.keyvault.SkuFamily.A,
                },
            },
        },
        { dependsOn: rsGroup }
    );

    /** As the key vault is requiring Rbac authentication.
     * So We will create 2 EntraID groups for ReadOnly and Write access to this Key Vault
     */
    const vaultReadOnlyGroup = new ad.Group(`${vaultName}-readOnly`, {
        displayName: `AZ ROL ${vaultName.toUpperCase()} READONLY`,
        securityEnabled: true,
        //add current principal as an owner.
        owners: [currentPrincipal],
    });
    const vaultWriteGroup = new ad.Group(`${vaultName}-write`, {
        displayName: `AZ ROL ${vaultName.toUpperCase()} WRITE`,
        securityEnabled: true,
        //add current principal as an owner.
        owners: [currentPrincipal],
        //Add current member in to ensure the AzureDevOps principal has WRITE permission to Vault
        members: [currentPrincipal],
    });

    /**
     * These roles allow read access to the secrets in the Key Vault, including keys, certificates, and secrets.
     * The role names and IDs are provided here for reference, but only the ID is used in the code.
     * All roles are combined into a single Entra ID group in this implementation. However, you can split them
     * into separate groups depending on your environment's requirements.
     *
     * To retrieve all available roles in Azure, you can use the following REST API:
     * https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-rest
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
        {
            name: 'Key Vault Reader',
            id: '21090545-7ca7-4776-b22c-e363652d74d2',
        },
    ].map(
        (r) =>
            //Grant the resource roles to the group above.
            new azure.authorization.RoleAssignment(
                `${vaultName}-${r.id}`,
                {
                    principalType: 'Group',
                    principalId: vaultReadOnlyGroup.objectId,
                    roleAssignmentName: r.id,
                    roleDefinitionId: `/providers/Microsoft.Authorization/roleDefinitions/${r.id}`,
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
            //Grant the resource roles to the group above.
            new azure.authorization.RoleAssignment(
                `${vaultName}-${r.id}`,
                {
                    principalType: 'Group',
                    principalId: vaultWriteGroup.objectId,
                    roleAssignmentName: r.id,
                    roleDefinitionId: `/providers/Microsoft.Authorization/roleDefinitions/${r.id}`,
                    scope: vault.id,
                },
                { dependsOn: [vault, vaultWriteGroup] }
            )
    );

    return { vault, vaultReadOnlyGroup, vaultWriteGroup };
};
