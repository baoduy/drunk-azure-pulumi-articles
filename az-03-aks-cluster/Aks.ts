import {
    currentPrincipal,
    getName,
    subscriptionId,
    tenantId,
} from '@az-commons';
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
    //Create Entra Admin Group
    const adminGroup = new ad.Group(name, {
        displayName: `AZ ROL ${name.toUpperCase()}`,
        securityEnabled: true,
        owners: [currentPrincipal],
    });
    //Assign This AKS admin group as readonly at the subscription level
    new azure.authorization.RoleAssignment(`${name}-readonly`, {
        principalType: 'Group',
        principalId: adminGroup.objectId,
        //ReadOnly Role
        roleAssignmentName: 'acdd72a7-3385-48ef-bd42-f606fba81ae7',
        roleDefinitionId:
            '/providers/Microsoft.Authorization/roleDefinitions/acdd72a7-3385-48ef-bd42-f606fba81ae7',
        scope: pulumi.interpolate`/subscriptions/${subscriptionId}`,
    });

    //Create Entra App Registration
    const appRegistration = new ad.ApplicationRegistration(name, {
        description: name,
        displayName: name,
        signInAudience: 'AzureADMyOrg',
    });
    //Add current principal as an owner of the app.
    new ad.ApplicationOwner(
        name,
        { applicationId: appRegistration.id, ownerObjectId: currentPrincipal },
        { dependsOn: appRegistration }
    );
    //Create App Client Secret
    const appSecret = new ad.ApplicationPassword(
        name,
        { applicationId: appRegistration.id },
        { dependsOn: appRegistration }
    );

    //Return the results
    return { adminGroup, appRegistration, appSecret };
};

/** The method will:
 * - Generate a random password using @pulumi/random
 * - Using the random password to generate an Ssh public key and private key.
 * - Store password, ssh public key and private key into Vault.
 * */
const createSsh = (
    name: string,
    vaultInfo?: {
        resourceGroupName: pulumi.Input<string>;
        vaultName: pulumi.Input<string>;
    }
) => {
    const sshName = getName(name, 'ssh');
    const ssh = new SshGenerator(sshName, {
        password: new random.RandomPassword(name, { length: 50 }).result,
    });
    //Store a public key and private key to Vault
    if (vaultInfo) {
        [
            { name: `${sshName}-publicKey`, value: ssh.publicKey },
            { name: `${sshName}-privateKey`, value: ssh.privateKey },
            { name: `${sshName}-password`, value: ssh.password },
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
 * This AKS we will use Linux with vmSize is `Standard_B2ms` and enable auto-scale min: 1 node and max 3 nodes.
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
        osDiskSizeGB = 128,
        osDiskType = azure.containerservice.OSDiskType.Managed,
        vmSize = 'Standard_B2ms',
    }: {
        rsGroup: azure.resources.ResourceGroup;
        acr?: azure.containerregistry.Registry;
        vnet: azure.network.VirtualNetwork;
        vmSize?: pulumi.Input<string>;
        osDiskSizeGB?: pulumi.Input<number>;
        osDiskType?: azure.containerservice.OSDiskType;
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
    const ssh = createSsh(name, vaultInfo);

    const aksName = getName(name, 'cluster');
    const nodeResourceGroup = `${aksName}-nodes`;

    //Create AKS Cluster
    const aks = new azure.containerservice.ManagedCluster(
        aksName,
        {
            resourceGroupName: rsGroup.name,
            //The name of node resource group.
            //This group will be created and managed by AKS directly.
            nodeResourceGroup,
            dnsPrefix: aksName,

            //Disable public network access as this is a private cluster
            publicNetworkAccess: 'Disabled',
            apiServerAccessProfile: {
                //Not allows running command directly from azure portal
                disableRunCommand: true,
                //enable private cluster
                enablePrivateCluster: true,
                //Enable this to enable public DNS resolver to a private IP Address.
                //This is necessary for MDM accessing though a Cloudflare tunnel later
                enablePrivateClusterPublicFQDN: true,
                privateDNSZone: 'system',
            },

            //Addon profile to enable and disable some built-in features
            addonProfiles: {
                //Enable the azure policy. We will discuss this feature in a separate topic.
                azurePolicy: { enabled: true },
                //Enable container insights
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

            //The node pool profile: this will set up the subnetId, auto-scale and disk space setup
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
                    maxPods: 50,
                    enableFIPS: false,
                    enableNodePublicIP: false,
                    //az feature register --name EncryptionAtHost  --namespace Microsoft.Compute
                    enableEncryptionAtHost: true,
                    //TODO: Enable this in PRD
                    enableUltraSSD: false,
                    osDiskSizeGB,
                    osDiskType,
                    vmSize,
                    kubeletDiskType: 'OS',
                    osSKU: 'Ubuntu',
                    osType: 'Linux',
                },
            ],
            //Linux authentication profile username and ssh key
            linuxProfile: {
                adminUsername: nodeAdminUserName,
                ssh: { publicKeys: [{ keyData: ssh.publicKey }] },
            },
            //service profile to set up EntraID identity.
            servicePrincipalProfile: {
                clientId: aksIdentity.appRegistration.clientId,
                secret: aksIdentity.appSecret.value,
            },
            identity: {
                type: azure.containerservice.ResourceIdentityType
                    .SystemAssigned,
            },
            //Enable auto upgrade
            autoUpgradeProfile: {
                upgradeChannel: azure.containerservice.UpgradeChannel.Stable,
            },
            //disable local account and only allows to authenticate using EntraID
            disableLocalAccounts: true,
            enableRBAC: true,
            aadProfile: {
                enableAzureRBAC: true,
                managed: true,
                adminGroupObjectIDs: [aksIdentity.adminGroup.objectId],
                tenantID: tenantId,
            },
            //Storage profile
            //TODO: update this one depend on your env needs
            storageProfile: {
                blobCSIDriver: { enabled: true },
                diskCSIDriver: { enabled: true },
                fileCSIDriver: { enabled: true },
                snapshotController: { enabled: false },
            },
            //Network profile, it is using Azure network with User define routing
            //This will use vnet route table to route all access to hub vnet
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

    //If ACR is provided, then grant permission to allow AKS to download image from ACR
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
                //This the ID of ARCPull
                roleAssignmentName: '7f951dda-4ed3-4680-a7ca-43fe172d538d',
                roleDefinitionId:
                    '/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d',
            },
            { dependsOn: [aks, acr] }
        );
    }

    return aks;
};
