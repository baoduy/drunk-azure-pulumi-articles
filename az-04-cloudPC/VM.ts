import * as azure from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import { createEncryptionKey } from './DiskEncryptionSet';

type VaultInfo = {
    id: pulumi.Input<string>;
    resourceGroupName: pulumi.Input<string>;
    vaultName: pulumi.Input<string>;
    readOnlyGroupId: pulumi.Input<string>;
};

/**
 * Generate the username and password for the vm
 * */
const generateLogin = (name: string, vault: VaultInfo) => {
    const usernameKey = `${name}-username`;
    const passwordKey = `${name}-password`;
    const username = new random.RandomString(usernameKey, {
        length: 15,
        special: false,
    });
    const password = new random.RandomPassword(passwordKey, {
        length: 50,
    });

    //Store secrets to the vault
    [
        { name: usernameKey, value: username.result },
        { name: passwordKey, value: password.result },
    ].map(
        (item) =>
            new azure.keyvault.Secret(
                item.name,
                {
                    ...vault,
                    secretName: item.name,
                    properties: { value: item.value },
                },
                { dependsOn: [username, password] }
            )
    );

    return { username, password };
};

/**
 * Create a Linux VM:
 * - `username` and `password` will be generated using pulumi random and store in Key Vault.
 * - The AzureDevOps extension will be installed automatically and become a private AzureDevOps agent.
 * - It will be encrypted with a custom key from Key Vault also.
 * - The disk also will be encrypted with a DiskEncryptionSet.
 * */
export default (
    name: string,
    {
        rsGroup,
        vault,
        vmSize = 'Standard_B2s',
        diskEncryptionSet,
        vnet,
    }: {
        vmSize: string;
        rsGroup: azure.resources.ResourceGroup;
        diskEncryptionSet: azure.compute.DiskEncryptionSet;
        vault: VaultInfo;
        vnet: azure.network.VirtualNetwork;
    }
) => {
    //Create VM login info
    const loginInfo = generateLogin(name, vault);

    //Create VM NIC
    const nic = new azure.network.NetworkInterface(
        name,
        {
            resourceGroupName: rsGroup.name,
            ipConfigurations: [
                {
                    name: 'ipconfig',
                    subnet: {
                        id: vnet.subnets.apply(
                            (ss) => ss!.find((s) => s.name === 'devops')!.id!
                        ),
                    },
                    primary: true,
                },
            ],
            nicType: azure.network.NetworkInterfaceNicType.Standard,
        },
        { dependsOn: [rsGroup, vnet] }
    );

    //Create VM
    const vm = new azure.compute.VirtualMachine(
        name,
        {
            resourceGroupName: rsGroup.name,
            hardwareProfile: { vmSize },
            licenseType: 'None',
            networkProfile: {
                networkInterfaces: [{ id: nic.id, primary: true }],
            },
            //az feature register --name EncryptionAtHost  --namespace Microsoft.Compute
            securityProfile: { encryptionAtHost: true },
            osProfile: {
                computerName: name,
                adminUsername: loginInfo.username.result,
                adminPassword: loginInfo.password.result,
                allowExtensionOperations: true,
                linuxConfiguration: {
                    //ssh: { publicKeys: [{ keyData: linux.sshPublicKey! }] },
                    //TODO: this shall be set as 'true' when ssh is provided
                    disablePasswordAuthentication: false,
                    provisionVMAgent: true,
                    patchSettings: {
                        assessmentMode:
                            azure.compute.LinuxPatchAssessmentMode
                                .AutomaticByPlatform,
                        automaticByPlatformSettings: {
                            bypassPlatformSafetyChecksOnUserSchedule: true,
                            rebootSetting:
                                azure.compute
                                    .LinuxVMGuestPatchAutomaticByPlatformRebootSetting
                                    .Never,
                        },
                        patchMode:
                            azure.compute.LinuxVMGuestPatchMode
                                .AutomaticByPlatform,
                    },
                },
            },
            storageProfile: {
                imageReference: {
                    offer: '0001-com-ubuntu-server-jammy',
                    publisher: 'Canonical',
                    sku: '22_04-lts',
                    version: 'latest',
                },
                osDisk: {
                    diskSizeGB: 256,
                    caching: 'ReadWrite',
                    createOption: 'FromImage',
                    osType: azure.compute.OperatingSystemTypes.Linux,
                    managedDisk: {
                        diskEncryptionSet: { id: diskEncryptionSet.id },
                        storageAccountType:
                            azure.compute.StorageAccountTypes.StandardSSD_LRS,
                    },
                },
                //Sample to create data disk if needed
                // dataDisks: [
                //     {
                //         diskSizeGB: 256,
                //         createOption: azure.compute.DiskCreateOptionTypes.Empty,
                //         lun: 1,
                //         managedDisk: {
                //             diskEncryptionSet: {
                //                 id: diskEncryptionSet.id,
                //             },
                //             storageAccountType:
                //                 azure.compute.StorageAccountTypes
                //                     .StandardSSD_LRS,
                //         },
                //     },
                // ],
            },
            diagnosticsProfile: { bootDiagnostics: { enabled: true } },
        },
        {
            dependsOn: [
                diskEncryptionSet,
                loginInfo.username,
                loginInfo.password,
                nic,
            ],
        }
    );

    return vm;
};
