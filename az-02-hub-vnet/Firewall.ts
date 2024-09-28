import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import { getName } from "@az-commons";

export default (
  name: string,
  {
    vnet,
    rsGroup,
    policy,
    policyGroup,
    //The Policy tier and Firewall tier must be the same
    tier = azure.network.AzureFirewallSkuTier.Basic,
    logWorkspaceId,
  }: {
    vnet: azure.network.VirtualNetwork;
    rsGroup: azure.resources.ResourceGroup;
    policy: azure.network.FirewallPolicy;
    policyGroup: azure.network.FirewallPolicyRuleCollectionGroup;
    tier?: azure.network.AzureFirewallSkuTier;
    logWorkspaceId?: pulumi.Output<string>;
  },
) => {
  const firewallSubnetId = vnet.subnets!.apply(
    (s) => s!.find((s) => s!.name === "AzureFirewallSubnet")!.id!,
  );
  const firewallManageSubnetId = vnet.subnets!.apply(
    (s) => s!.find((s) => s!.name === "AzureFirewallManagementSubnet")!.id!,
  );
  // Create Public IP Address for outbound traffic
  const publicIP = new azure.network.PublicIPAddress(
    getName(`${name}-outbound`, "ip"),
    {
      resourceGroupName: rsGroup.name, // Resource group name
      publicIPAllocationMethod: azure.network.IPAllocationMethod.Static, // Static IP allocation
      sku: {
        name: azure.network.PublicIPAddressSkuName.Standard, // Standard SKU
        tier: azure.network.PublicIPAddressSkuTier.Regional, // Regional tier
      },
    },
    { dependsOn: rsGroup }, // Ensure the public IP depends on the resource group
  );

  // Create Management Public IP Address for Firewall "Basic" tier
  const managePublicIP = new azure.network.PublicIPAddress(
    getName(`${name}-manage`, "ip"),
    {
      resourceGroupName: rsGroup.name, // Resource group name
      publicIPAllocationMethod: azure.network.IPAllocationMethod.Static, // Static IP allocation
      sku: {
        name: azure.network.PublicIPAddressSkuName.Standard, // Standard SKU
        tier: azure.network.PublicIPAddressSkuTier.Regional, // Regional tier
      },
    },
    { dependsOn: rsGroup }, // Ensure the management public IP depends on the resource group
  );

  // Create Azure Firewall
  const firewallName = getName(name, "firewall");
  const firewall = new azure.network.AzureFirewall(
    firewallName,
    {
      resourceGroupName: rsGroup.name,
      firewallPolicy: { id: policy.id },
      ipConfigurations: [
        {
          name: publicIP.name,
          publicIPAddress: { id: publicIP.id },
          subnet: { id: firewallSubnetId },
        },
      ],
      managementIpConfiguration: {
        name: managePublicIP.name,
        publicIPAddress: { id: managePublicIP.id },
        subnet: { id: firewallManageSubnetId },
      },
      sku: {
        name: azure.network.AzureFirewallSkuName.AZFW_VNet,
        tier,
      },
    },
    {
      // Ensure the firewall dependents
      dependsOn: [publicIP, vnet, managePublicIP, policy, policyGroup],
    },
  );

  //create Diagnostic
  if (logWorkspaceId) {
    new azure.insights.DiagnosticSetting(
      firewallName,
      {
        resourceUri: firewall.id,
        logAnalyticsDestinationType: "AzureDiagnostics",
        workspaceId: logWorkspaceId,
        //Logs
        logs: [
          "AzureFirewallApplicationRule",
          "AzureFirewallNetworkRule",
          "AzureFirewallDnsProxy",
        ].map((c) => ({
          category: c,
          retentionPolicy: { enabled: false, days: 7 },
          enabled: true,
        })),
      },
      { dependsOn: firewall },
    );
  }

  return { firewall, publicIP };
};