import { getName } from '@az-commons';
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
    const usernameKey = getName(name, 'username');
    const username = new random.RandomString(usernameKey, {
        length: 15,
        special: false,
    });
    const passwordKey = getName(name, 'password');
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

const createVmEncryptSecret = (name: string, vault: VaultInfo) => {
    const randomPass = new random.RandomPassword(`${name}-password`, {
        length: 50,
        special: true,
        numeric: true,
        lower: true,
        upper: true,
    });
    return new azure.keyvault.Secret(
        name,
        {
            ...vault,
            secretName: name,
            properties: { value: randomPass.result },
        },
        { dependsOn: randomPass }
    );
};

/**
 * THis Vm will be a linux VM
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
        azureDevOps,
    }: {
        vmSize: string;
        rsGroup: azure.resources.ResourceGroup;
        diskEncryptionSet: azure.compute.DiskEncryptionSet;
        vault: VaultInfo;
        vnet: azure.network.VirtualNetwork;
        azureDevOps?: {
            VSTSAccountUrl: pulumi.Input<string>;
            TeamProject: pulumi.Input<string>;
            DeploymentGroup: pulumi.Input<string>;
            PATToken: pulumi.Input<string>;
        };
    }
) => {
    const vmName = getName(name, 'vm');
    //Create VM login info
    const loginInfo = generateLogin(vmName, vault);

    //Create VM NIC
    const nic = new azure.network.NetworkInterface(
        vmName,
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
        vmName,
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
                computerName: vmName,
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

    //Install AzureDevOps extensions
    if (azureDevOps) {
        //Follow the instruction here: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/deployment-groups/howto-provision-deployment-group-agents?view=azure-devops
        vm.name.apply(
            (n) =>
                new azure.compute.VirtualMachineExtension(
                    `${n}-devops-extension`,
                    {
                        vmExtensionName: 'TeamServicesAgentLinux',
                        vmName: n,
                        resourceGroupName: rsGroup.name,
                        enableAutomaticUpgrade: false,
                        suppressFailures: false,
                        publisher: 'Microsoft.VisualStudio.Services',
                        type: 'TeamServicesAgentLinux',
                        typeHandlerVersion: '1.0',
                        autoUpgradeMinorVersion: true,
                        settings: {
                            VSTSAccountName: azureDevOps.VSTSAccountUrl,
                            TeamProject: azureDevOps.TeamProject,
                            DeploymentGroup: azureDevOps.DeploymentGroup,
                            AgentMajorVersion: '3',
                            AgentName: vmName,
                        },
                        protectedSettings: {
                            PATToken: azureDevOps.PATToken,
                        },
                    },
                    { dependsOn: vm }
                )
        );
    }
    return vm;
};
