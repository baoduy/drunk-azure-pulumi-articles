import { getName } from '@az-commons';
import * as azure from '@pulumi/azure-native';
import * as ad from '@pulumi/azuread';
import * as pulumi from '@pulumi/pulumi';

/** The vault type will be used for the belows resources */
type VaultInfo = {
    id: pulumi.Input<string>;
    resourceGroupName: pulumi.Input<string>;
    vaultName: pulumi.Input<string>;
    readOnlyGroupId: pulumi.Input<string>;
};

/**
 * Create a UserAssigned Identity that have read access to the Vault
 */
const createUserAssignIdentity = (
    name: string,
    {
        rsGroup,
        vault,
    }: { rsGroup: azure.resources.ResourceGroup; vault: VaultInfo }
) => {
    //Create Identity
    const identity = new azure.managedidentity.UserAssignedIdentity(
        getName(name, 'uid'),
        {
            resourceGroupName: rsGroup.name,
        },
        { dependsOn: rsGroup }
    );

    //Add identity to readOnly group of Vault to allow reading encryption Key
    new ad.GroupMember(
        getName(name, 'uid-vault-read'),
        {
            groupObjectId: vault.readOnlyGroupId,
            memberObjectId: identity.principalId,
        },
        { dependsOn: identity }
    );

    return identity;
};

/**
 * Create Encryption Key on Key Vault
 * */
export const createEncryptionKey = (name: string, vault: VaultInfo) =>
    new azure.keyvault.Key(
        name,
        {
            ...vault,
            keyName: name,
            properties: {
                kty: azure.keyvault.JsonWebKeyType.RSA,
                keySize: 4096, //2048 | 3072 | 4096
                keyOps: [
                    'encrypt',
                    'decrypt',
                    'sign',
                    'verify',
                    'wrapKey',
                    'unwrapKey',
                ],
                attributes: { enabled: true },
                rotationPolicy: {
                    attributes: {
                        // Rotate every 365 days
                        expiryTime: 'P365D',
                    },
                    lifetimeActions: [
                        {
                            action: {
                                type: azure.keyvault.KeyRotationPolicyActionType
                                    .Rotate,
                            },
                            trigger: {
                                // Trigger rotation 7 days before expiry
                                timeBeforeExpiry: 'P7D',
                            },
                        },
                    ],
                },
            },
        },
        { retainOnDelete: true }
    );

export default (
    name: string,
    {
        rsGroup,
        vault,
    }: { rsGroup: azure.resources.ResourceGroup; vault: VaultInfo }
) => {
    const diskName = getName(name, 'disk-encrypt');
    const uid = createUserAssignIdentity(diskName, { rsGroup, vault });
    //Create Key on vault
    const key = createEncryptionKey(diskName, vault);

    return new azure.compute.DiskEncryptionSet(
        diskName,
        {
            resourceGroupName: rsGroup.name,
            rotationToLatestKeyVersionEnabled: true,
            encryptionType: 'EncryptionAtRestWithCustomerKey',
            identity: {
                type: azure.compute.ResourceIdentityType
                    .SystemAssigned_UserAssigned,
                userAssignedIdentities: [uid.id],
            },
            activeKey: { keyUrl: key.keyUriWithVersion },
        },
        {
            dependsOn: [rsGroup, key, uid],
            retainOnDelete: true,
        }
    );
};
