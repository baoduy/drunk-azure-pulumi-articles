import { getName, tenantId } from '@az-commons';
import * as azure from '@pulumi/azure-native';
import * as ad from '@pulumi/azuread';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import SshGenerator from './SshGenerator';

/** AKS required an Entra Application Registration with an Entra Admin Group inorder to enable the RBAC access.
 * We will create them here before create AKS resource.
 * */
const createRBACIdentity = (name: string) => {
    name = getName(name, 'Admin');
    //Create Entra Group
    const adminGroup = new ad.Group(name, {
        displayName: `AZ ROL ${name.toUpperCase()}`,
        securityEnabled: true,
    });
    //Create Entra App Registration
    const appRegistration = new ad.ApplicationRegistration(name, {
        description: name,
        displayName: name,
        signInAudience: 'AzureADMyOrg',
    });
    //Create App Client Secret
    const appSecret = new ad.ApplicationPassword(
        name,
        {
            applicationId: appRegistration.id,
        },
        { dependsOn: appRegistration }
    );

    return { adminGroup, appRegistration, appSecret };
};

/** AKS is required SSH key for Nodes access purposes.*/
const createSsh = (
    name: string,
    {
        vaultInfo,
    }: {
        vaultInfo?: {
            resourceGroupName: pulumi.Input<string>;
            vaultName: pulumi.Input<string>;
        };
    }
) => {
    //Create ssh
    const ssh = new SshGenerator(getName(name, 'ssh'), {
        password: new random.RandomPassword(name, { length: 50 }).result,
    });
    //Store public key and private key to Vault
    if (vaultInfo) {
        [
            { name: `${ssh.name}-publicKey`, value: ssh.publicKey },
            { name: `${ssh.name}-privateKey`, value: ssh.privateKey },
            { name: `${ssh.name}-password`, value: ssh.password },
        ].map(
            (s) =>
                new azure.keyvault.Secret(
                    s.name,
                    {
                        ...vaultInfo,
                        secretName: s.name,
                        properties: {
                            value: s.value,
                            contentType: s.name,
                        },
                    },
                    {
                        dependsOn: ssh,
                        retainOnDelete: true,
                    }
                )
        );
    }

    return ssh;
};

/**
 * This AKS we will use Linux with vmSize is `Standard_B2ms` and enable auto scale min: 1 node and max 3 nodes.
 * */
export default (
    name: string,
    {
        rsGroup,
        vnet,
        acr,
        nodeAdminUserName,
        vaultInfo,
        logWorkspaceId,
        tier = azure.containerservice.ManagedClusterSKUTier.Free,
        vmSize = 'Standard_B2ms',
    }: {
        rsGroup: azure.resources.ResourceGroup;
        acr?: azure.containerregistry.Registry;
        vnet: azure.network.VirtualNetwork;
        vmSize?: pulumi.Input<string>;
        nodeAdminUserName: pulumi.Input<string>;
        tier?: azure.containerservice.ManagedClusterSKUTier;
        logWorkspaceId?: pulumi.Input<string>;
        vaultInfo?: {
            resourceGroupName: pulumi.Input<string>;
            vaultName: pulumi.Input<string>;
        };
    }
) => {
    const aksIdentity = createRBACIdentity(name);
    const ssh = createSsh(name, { vaultInfo });

    const aksName = getName(name, 'cluster');
    const nodeResourceGroup = `${aksName}-nodes`;

    //Create AKS Cluster
    const aks = new azure.containerservice.ManagedCluster(
        aksName,
        {
            resourceGroupName: rsGroup.name,
            nodeResourceGroup,
            dnsPrefix: aksName,
            apiServerAccessProfile: {
                disableRunCommand: true,
                enablePrivateCluster: true,
                enablePrivateClusterPublicFQDN: true,
                privateDNSZone: 'system',
            },
            addonProfiles: {
                azureKeyvaultSecretsProvider: { enabled: false },
                azurePolicy: { enabled: true },
                kubeDashboard: { enabled: false },
                httpApplicationRouting: { enabled: false },
                aciConnectorLinux: { enabled: false },
                ingressApplicationGateway: { enabled: false },
                omsAgent: {
                    enabled: Boolean(logWorkspaceId),
                    config: logWorkspaceId
                        ? { logAnalyticsWorkspaceResourceID: logWorkspaceId }
                        : undefined,
                },
            },
            sku: {
                name: azure.containerservice.ManagedClusterSKUName.Base,
                tier,
            },
            supportPlan:
                azure.containerservice.KubernetesSupportPlan.KubernetesOfficial,
            agentPoolProfiles: [
                {
                    name: 'defaultnodes',
                    mode: 'System',
                    enableAutoScaling: true,
                    count: 1,
                    minCount: 1,
                    maxCount: 3,
                    vnetSubnetID: vnet.subnets.apply(
                        (ss) => ss!.find((s) => s.name === 'aks')!.id!
                    ),
                    type: azure.containerservice.AgentPoolType
                        .VirtualMachineScaleSets,
                    vmSize,
                    maxPods: 50,
                    enableFIPS: false,
                    enableNodePublicIP: false,
                    //az feature register --name EncryptionAtHost  --namespace Microsoft.Compute
                    enableEncryptionAtHost: true,
                    //TODO: Enable this in PRD
                    enableUltraSSD: false,
                    osDiskSizeGB: 256,
                    osDiskType: azure.containerservice.OSDiskType.Ephemeral,
                    kubeletDiskType: 'OS',
                    osSKU: 'Ubuntu',
                    osType: 'Linux',
                },
            ],
            linuxProfile: {
                adminUsername: nodeAdminUserName,
                ssh: { publicKeys: [{ keyData: ssh.publicKey }] },
            },
            servicePrincipalProfile: {
                clientId: aksIdentity.appRegistration.clientId,
                secret: aksIdentity.appSecret.value,
            },
            identity: {
                type: azure.containerservice.ResourceIdentityType
                    .SystemAssigned,
            },
            autoUpgradeProfile: {
                upgradeChannel: azure.containerservice.UpgradeChannel.Stable,
            },
            disableLocalAccounts: true,
            enableRBAC: true,
            aadProfile: {
                enableAzureRBAC: true,
                managed: true,
                adminGroupObjectIDs: [aksIdentity.adminGroup.objectId],
                tenantID: tenantId,
            },
            //TODO: update this one depend on your env needs
            storageProfile: {
                blobCSIDriver: { enabled: true },
                diskCSIDriver: { enabled: true },
                fileCSIDriver: { enabled: true },
                snapshotController: { enabled: false },
            },
            networkProfile: {
                networkMode: azure.containerservice.NetworkMode.Transparent,
                networkPolicy: azure.containerservice.NetworkPolicy.Azure,
                networkPlugin: azure.containerservice.NetworkPlugin.Azure,
                outboundType:
                    azure.containerservice.OutboundType.UserDefinedRouting,
                loadBalancerSku: 'Standard',
            },
        },
        {
            dependsOn: [
                rsGroup,
                aksIdentity.appRegistration,
                aksIdentity.appSecret,
                ssh,
                vnet,
            ],
        }
    );

    //If ACR is provided then grant permission to allows AKS to download image from ACR
    if (acr) {
        new azure.authorization.RoleAssignment(
            `${aksName}-arc-pull`,
            {
                description: `${aksName} arc pull permission`,
                scope: acr.id,
                principalType: 'ServicePrincipal',
                principalId: aks.identityProfile.apply(
                    (i) => i!.kubeletidentity.objectId!
                ),
                roleAssignmentName: 'AcrPull',
                roleDefinitionId:
                    '/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d',
            },
            { dependsOn: [aks, acr] }
        );
    }

    return aks;
};
