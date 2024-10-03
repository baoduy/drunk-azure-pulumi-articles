# Azure AKS Cluster Deployment with Pulumi

This project leverages Pulumi to automate the deployment of an Azure Kubernetes Service (AKS) cluster, providing a scalable and secure environment for containerized applications on Azure.

## Project Overview

The project is structured into several key components, each responsible for a specific aspect of the infrastructure:

1. **Resource Group**: Acts as a container for all Azure resources, ensuring they are organized and managed together.

2. **Virtual Network (VNet)**: Establishes a secure network environment with subnets and security rules, facilitating safe communication between resources and external networks.

3. **Azure Kubernetes Service (AKS)**: Deploys a managed Kubernetes cluster with features like auto-scaling, Azure Active Directory integration for role-based access control (RBAC), and a private API server for enhanced security.

4. **Container Registry (ACR)**: Provides a private registry for storing and managing Docker container images, enabling seamless integration with the AKS cluster.

5. **Firewall Rules**: Implements network and application rules to control traffic flow, ensuring secure access to and from the AKS cluster.

6. **Identity and Access Management**: Utilizes Azure Entra for application registration and group management, facilitating secure and efficient RBAC access to the AKS cluster.

## Getting Started

### Prerequisites

- Node.js and npm
- Pulumi CLI
- Azure CLI
- Access to an Azure account

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd az-03-aks-cluster
   ```

2. Install the necessary dependencies using:
   ```bash
   pnpm install
   ```

3. Authenticate with Azure:
   ```bash
   az login
   ```

### Deployment

1. Initialize a new Pulumi stack:
   ```bash
   pulumi stack init <stack-name>
   ```

2. Set the Azure region for deployment:
   ```bash
   pulumi config set azure-native:location <azure-region>
   ```

3. Deploy the infrastructure:
   ```bash
   pulumi up
   ```

4. To tear down the infrastructure:
   ```bash
   pulumi destroy
   ```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Acknowledgments

- Thanks to Pulumi for providing the infrastructure as code platform.
- Thanks to Azure for cloud services and resources.
