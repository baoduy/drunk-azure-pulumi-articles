import { getGroupName } from '@az-commons'
import * as azure from '@pulumi/azure-native'
import { StackReference } from 'az-commons'
import * as config from '../config'
import VNet from './VNet'

const hubVnetStack = StackReference<config.HubVnetOutput>('az-02-hub-vnet')

// Create Shared Resource Group
const rsGroup = new azure.resources.ResourceGroup(
    getGroupName(config.azGroups.cloudPC)
)

//Create FirewallPolicyGroup

// Create Virtual Network with Subnets
const vnet = VNet(config.azGroups.cloudPC, {
    rsGroup,
    subnets: [
        {
            name: 'cloudpc',
            addressPrefix: config.subnetSpaces.cloudPC,
        },
        {
            name: 'devops',
            addressPrefix: config.subnetSpaces.devOps,
        },
    ],
    //allows vnet to firewall's private IP
    securityRules: [
        {
            name: `allows-vnet-to-hub-firewall`,
            description: 'Allows Vnet to hub firewall Outbound',
            priority: 300,
            protocol: '*',
            access: 'Allow',
            direction: 'Outbound',
            sourceAddressPrefix: hubVnetStack.firewall.address.apply(
                (ip) => `${ip}/32`
            ),
            sourcePortRange: '*',
            destinationAddressPrefix: 'VirtualNetwork',
            destinationPortRange: '*',
        },
    ],
    //route all requests to firewall's private IP
    routes: [
        {
            name: 'route-vnet-to-firewall',
            addressPrefix: '0.0.0.0/0',
            nextHopIpAddress: hubVnetStack.firewall.address,
            nextHopType: 'VirtualAppliance',
        },
    ],
    //peering to hub vnet
    peeringVnetId: hubVnetStack.hubVnet.id,
})

//Create DevOps VM

// Export the information that will be used in the other projects
export default {
    rsGroup: { name: rsGroup.name, id: rsGroup.id },
    cloudPcVnet: { name: vnet.name, id: vnet.id },
}
