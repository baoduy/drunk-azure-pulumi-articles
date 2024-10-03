# az-02-hub-vnet

## Overview

The `az-02-hub-vnet` project is a minimal Azure Native TypeScript Pulumi program designed to set up a hub virtual network (VNet) in Azure. This project is part of a larger infrastructure setup and is responsible for creating and managing network resources, including a virtual network, subnets, a firewall, and a firewall policy.

## Components

The project consists of several key components:

1. **Resource Group**: 
   - A resource group is created to contain all the resources related to the hub VNet.

2. **Virtual Network (VNet)**:
   - A virtual network is created with multiple subnets, including a dedicated subnet for Azure Firewall and another for general use.
   - The VNet is configured with VM protection and encryption.

3. **Subnets**:
   - **AzureFirewallSubnet**: A subnet specifically for Azure Firewall.
   - **AzureFirewallManagementSubnet**: A subnet for managing the Azure Firewall.
   - **General Subnet**: A general-purpose subnet with private endpoint network policies enabled.

4. **Firewall Policy**:
   - A firewall policy is created to define the rules and configurations for the Azure Firewall.

5. **Azure Firewall**:
   - An Azure Firewall is deployed with a public IP address for outbound traffic and a management IP address.
   - The firewall is configured with diagnostic settings to log activities to a specified log workspace.

## Prerequisites

- Node.js and npm installed.
- Pulumi CLI installed.
- Azure account with appropriate permissions.

## Setup and Deployment

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Initialize Pulumi Stack**:
   ```bash
   pulumi stack init --secrets-provider=passphrase
   ```

3. **Configure Azure Location**:
   - Set the desired Azure location in `Pulumi.dev.yaml`.

4. **Deploy the Infrastructure**:
   ```bash
   pulumi up --yes --skip-preview
   ```

5. **Export and Import State**:
   - Export the current state:
     ```bash
     pulumi stack export --file state.json
     ```
   - Import a saved state:
     ```bash
     pulumi stack import --file state.json
     ```

6. **Destroy the Infrastructure**:
   ```bash
   pulumi destroy --yes --skip-preview
   ```

## Scripts

- **Build**: Compiles the TypeScript code.
- **New Stack**: Initializes a new Pulumi stack.
- **Update**: Updates npm dependencies.
- **Check**: Checks for unused dependencies.

## Dependencies

- `@pulumi/azure-native`: Pulumi provider for Azure Native resources.
- `@pulumi/pulumi`: Pulumi core SDK.
- `@az-commons`: Local package for common utilities.

## Development

- TypeScript is used for defining the infrastructure as code.
- The project uses `pnpm` as the package manager.

## License

This project is licensed under the MIT License.
