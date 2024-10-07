import * as azure from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';

export default (
    name: string,
    {
        privateIpAddress,
        vnetIds,
        rsGroup,
    }: {
        privateIpAddress: pulumi.Input<string>;
        rsGroup: azure.resources.ResourceGroup;
        vnetIds: pulumi.Input<string>[];
    }
) => {
    //Create Zone
    const zone = new azure.network.PrivateZone(
        name,
        {
            privateZoneName: name,
            resourceGroupName: rsGroup.name,
            //All the DNS zone location must be "global"
            location: 'global',
        },
        { dependsOn: rsGroup }
    );

    //Create Root Records to the private Ip Address
    new azure.network.PrivateRecordSet(
        `${name}-Root`,
        {
            privateZoneName: zone.name,
            resourceGroupName: rsGroup.name,
            relativeRecordSetName: '@',
            recordType: 'A',
            aRecords: [{ ipv4Address: privateIpAddress }],
            ttl: 3600,
        },
        { dependsOn: zone }
    );
    new azure.network.PrivateRecordSet(
        `${name}-Star`,
        {
            privateZoneName: zone.name,
            resourceGroupName: rsGroup.name,
            relativeRecordSetName: '*',
            recordType: 'A',
            aRecords: [{ ipv4Address: privateIpAddress }],
            ttl: 3600,
        },
        { dependsOn: zone }
    );

    //Link to VNET
    vnetIds.map(
        (v, index) =>
            new azure.network.VirtualNetworkLink(
                `${name}-${index}-link`,
                {
                    privateZoneName: zone.name,
                    resourceGroupName: rsGroup.name,
                    registrationEnabled: false,
                    virtualNetwork: { id: v },
                },
                { dependsOn: zone }
            )
    );

    return zone;
};
