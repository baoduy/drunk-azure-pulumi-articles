# az-04-cloudPC

## Overview

This project is a minimal Azure Native TypeScript Pulumi program designed to set up a cloud-based PC environment on Azure. It includes the creation of a virtual machine (VM) with specific configurations, network settings, and security measures. The VM is intended to serve as a private Azure DevOps agent, with automatic installation of necessary extensions and encryption using a custom key from Azure Key Vault.

## Prerequisites

- Node.js and npm installed
- Pulumi CLI installed
- Azure account with necessary permissions
- Access to the `az-01-shared` and `az-02-hub-vnet` stacks

## Project Structure

- **VM.ts**: Defines the configuration and creation of the VM, including login generation, network interface, and Azure DevOps extension installation.
- **index.ts**: Main entry point for the Pulumi program, orchestrating the creation of resources like resource groups, virtual networks, and the VM.
- **DiskEncryptionSet.ts**: Handles the creation of disk encryption sets and associated identities.
- **CloudPcFirewallRules**: Contains network and application rules for firewall policies.
- **VNet.ts**: Manages the creation of virtual networks, security groups, and routing tables.

## Configuration

- **Pulumi.yaml**: Defines the project name, runtime, and package manager.
- **Pulumi.dev.yaml**: Contains configuration settings specific to the development environment, such as secure tokens and location settings.

## Scripts

Defined in `package.json`:

- `init`: Initializes a new Pulumi TypeScript project.
- `build`: Compiles TypeScript code without emitting output.
- `new-stack`: Initializes a new Pulumi stack with a secrets provider.
- `up`: Deploys the stack without a preview.
- `reup`: Refreshes and deploys the stack without a preview.
- `destroy`: Destroys the stack without a preview.
- `update`: Updates npm dependencies.
- `check`: Checks for unused dependencies.
- `export`: Exports the current stack state to a file.
- `import`: Imports a stack state from a file.

## Usage

1. Clone the repository.
2. Install dependencies using `pnpm install`.
3. Configure your Azure credentials and ensure you have access to the required stacks.
4. Run `pulumi up` to deploy the infrastructure.

## Security

- Secrets such as the Azure DevOps PAT token are securely stored and managed using Pulumi's configuration management.
- The VM and its disks are encrypted using Azure Key Vault keys.

## Networking

- The project sets up a virtual network with subnets and security rules to control access and routing.
- Firewall rules are applied to manage network traffic between different components.

## Dependencies

- `@pulumi/azure-native`: For managing Azure resources.
- `@pulumi/pulumi`: Core Pulumi library for infrastructure as code.
- `@pulumi/random`: For generating random strings and passwords.
- `@az-commons`: Local package for common utilities.

## License

This project is licensed under the MIT License.