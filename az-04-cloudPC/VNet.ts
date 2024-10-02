import { getName } from '@az-commons';
import * as network from '@pulumi/azure-native/network';
import * as resources from '@pulumi/azure-native/resources';
import * as inputs from '@pulumi/azure-native/types/input';
import * as pulumi from '@pulumi/pulumi';

/**By default, VNet allows to access to internet so we will create an NetworkSecurityGroup to block it.
 * ONly allows Vnet to Vnet and Vnet to private Firewall address communication
 * */
const createSecurityGroup = (
    name: string,
    {
        rsGroup,
        securityRules = [],
    }: {
        rsGroup: resources.ResourceGroup;
        securityRules?: pulumi.Input<inputs.network.SecurityRuleArgs>[];
    }
) =>
    new network.NetworkSecurityGroup(
        getName(name, 'sg'),
        {
            resourceGroupName: rsGroup.name,
            securityRules: [
                ...securityRules,
                //default rules to block internet access and only allows internal vnet access
                {
                    name: `${name}-allows-vnet-outbound`,
                    description: 'Allows Vnet to Vnet Outbound',
                    priority: 4095,
                    protocol: '*',
                    access: 'Allow',
                    direction: 'Outbound',
                    sourceAddressPrefix: 'VirtualNetwork',
                    sourcePortRange: '*',
                    destinationAddressPrefix: 'VirtualNetwork',
                    destinationPortRange: '*',
                },
                //Block direct access to internet
                {
                    name: `${name}-block-internet-outbound`,
                    description: 'Block Internet Outbound',
                    priority: 4096,
                    protocol: '*',
                    access: 'Deny',
                    direction: 'Outbound',
                    sourceAddressPrefix: '*',
                    sourcePortRange: '*',
                    destinationAddressPrefix: 'Internet',
                    destinationPortRange: '*',
                },
            ],
        },
        { dependsOn: rsGroup }
    );

/** As this Vnet is peering with hub vnet so the route '0.0.0.0/0' to private firewall ip address is needed.
 * */
const createRouteTable = (
    name: string,
    {
        rsGroup,
        routes,
    }: {
        rsGroup: resources.ResourceGroup;
        routes: pulumi.Input<inputs.network.RouteArgs>[];
    }
) =>
    new network.RouteTable(
        getName(name, 'rtb'),
        {
            resourceGroupName: rsGroup.name,
            routes,
        },
        { dependsOn: rsGroup }
    );

export default (
    name: string,
    {
        rsGroup,
        subnets,
        routes,
        peeringVnet,
        securityRules,
    }: {
        rsGroup: resources.ResourceGroup;
        subnets: inputs.network.SubnetArgs[];
        /**The optional additional rules for NetworkSecurityGroup*/
        securityRules?: pulumi.Input<inputs.network.SecurityRuleArgs>[];
        /**The optional of routing rules for RouteTable*/
        routes?: pulumi.Input<inputs.network.RouteArgs>[];
        peeringVnet?: {
            name: pulumi.Input<string>;
            id: pulumi.Input<string>;
            resourceGroupName: pulumi.Input<string>;
        };
    }
) => {
    const sgroup = createSecurityGroup(name, { rsGroup, securityRules });
    const routeTable = routes
        ? createRouteTable(name, { rsGroup, routes })
        : undefined;

    const vnetName = getName(name, 'vnet');
    const vnet = new network.VirtualNetwork(
        vnetName,
        {
            // Resource group name
            resourceGroupName: rsGroup.name,
            //Enable VN protection
            enableVmProtection: true,
            //Enable Vnet encryption
            encryption: {
                enabled: true,
                enforcement:
                    network.VirtualNetworkEncryptionEnforcement
                        .AllowUnencrypted,
            },
            addressSpace: {
                addressPrefixes: subnets.map((s) => s.addressPrefix!),
            },
            subnets: subnets.map((s) => ({
                ...s,
                //Inject NetworkSecurityGroup to all subnets if available
                networkSecurityGroup: sgroup ? { id: sgroup.id } : undefined,
                //Inject RouteTable to all subnets if available
                routeTable: routeTable ? { id: routeTable.id } : undefined,
            })),
        },
        {
            dependsOn: routeTable ? [sgroup, routeTable] : sgroup,
            //Ignore this property as the peering will be manage by instance of VirtualNetworkPeering
            ignoreChanges: ['virtualNetworkPeerings'],
        }
    );

    // Create sync Peering from `az-02-hub-vnet` to `az-03-aks-cluster`
    // The peering need to be happened 2 ways in order to establish the connection
    if (peeringVnet) {
        //from `az-02-hub-vnet` to `az--04-cloudPc`
        new network.VirtualNetworkPeering(
            `hun-to-${vnetName}`,
            {
                resourceGroupName: peeringVnet.resourceGroupName,
                virtualNetworkName: peeringVnet.name,
                allowVirtualNetworkAccess: true,
                allowForwardedTraffic: true,
                syncRemoteAddressSpace: 'true',
                remoteVirtualNetwork: { id: vnet.id },
                peeringSyncLevel: 'FullyInSync',
            },
            { dependsOn: vnet }
        );
        //from `az-04-cloudPc` to `az-02-hub-vnet`
        new network.VirtualNetworkPeering(
            `${vnetName}-to-hub`,
            {
                resourceGroupName: rsGroup.name,
                virtualNetworkName: vnet.name,
                allowVirtualNetworkAccess: true,
                allowForwardedTraffic: true,
                syncRemoteAddressSpace: 'true',
                remoteVirtualNetwork: { id: peeringVnet.id },
                peeringSyncLevel: 'FullyInSync',
            },
            { dependsOn: vnet }
        );
    }

    return vnet;
};
