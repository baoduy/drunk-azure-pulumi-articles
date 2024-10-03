# Azure Infrastructure Setup with Pulumi

This project is designed to automate the setup of essential Azure infrastructure components using Pulumi, a modern infrastructure as code platform. It provides a streamlined approach to managing cloud resources, ensuring consistency and efficiency across deployments.

## Project Overview

The project focuses on setting up a robust infrastructure on Azure, which includes:

- **Shared Resource Group**: A centralized resource group that organizes and manages all related Azure resources efficiently.

- **Vault**: Utilizes Azure Key Vault to securely store and manage environment secrets. This component ensures that sensitive information is protected and easily accessible to authorized applications and users.

- **Log Workspace**: Establishes a centralized log analytics workspace and integrates with Azure Application Insights. This setup provides comprehensive monitoring and logging capabilities, enabling detailed insights into application performance and resource utilization.

- **Automation**: Configures an Azure Automation account to facilitate the automation of routine tasks, such as managing the on/off states of Virtual Machines (VMs) and Azure Kubernetes Service (AKS) clusters. This component helps in reducing manual intervention and improving operational efficiency.

## Components

1. **Resource Group**: Acts as a container that holds related resources for an Azure solution, allowing for easy management and organization.

2. **Vault**: A secure storage solution for secrets, keys, and certificates, with configurable retention policies to meet compliance requirements.

3. **Log Workspace**: Provides a centralized platform for collecting, analyzing, and acting on telemetry data from cloud and on-premises environments.

4. **Application Insights**: Offers deep insights into application performance and user behavior, helping to diagnose issues and understand how applications are used.

5. **Automation**: Enables the automation of frequent, time-consuming, and error-prone cloud management tasks, improving efficiency and reliability.

## Conclusion

This project serves as a foundational setup for Azure infrastructure, providing essential components that enhance security, monitoring, and automation. It is ideal for organizations looking to streamline their cloud operations and ensure a consistent deployment environment.

For more details on each component and how they integrate, please refer to the respective module documentation within the project.