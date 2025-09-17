# AWS Healthcare Infrastructure Migration to CDK with TypeScript

A comprehensive Infrastructure as Code (IaC) solution that migrates a healthcare company's manually-created AWS infrastructure to a secure, version-controlled, and scalable architecture using AWS CDK with TypeScript.

This project demonstrates enterprise-level cloud engineering practices, transforming a 5-year-old manually managed infrastructure into a modern, automated, and secure architecture following AWS Well-Architected Framework principles.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Security Features](#security-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Deployment](#deployment)
- [Testing](#testing)
- [Cleanup](#cleanup)
- [Tools Used](#tools-used)
- [Resources](#resources)
- [Contact](#contact)

## Overview

This project addresses a critical infrastructure challenge faced by a healthcare company that had built their AWS infrastructure manually through the console over 5 years ago. The solution delivers enterprise-grade infrastructure modernization with complete automation and security enhancement.

**The Challenge**: Legacy infrastructure with no version control, poor network segmentation, and vulnerable database exposure across multiple availability zones.

**The Solution**: Complete Infrastructure as Code implementation using AWS CDK with TypeScript, featuring:

- **Secure Architecture**: Multi-AZ VPC with proper public/private subnet segmentation
- **Database Security**: RDS MySQL in isolated subnets with credential management via AWS Secrets Manager
- **Network Protection**: Layered security groups following principle of least privilege
- **High Availability**: Application Load Balancer with auto-scaling EC2 instances
- **Automated Deployment**: Full infrastructure provisioning through code with validation and testing

## Architecture

### Network Architecture

```
Internet
    ↓
Internet Gateway
    ↓
Application Load Balancer (Public Subnets)
    ↓
EC2 Instances (Private Subnets)
    ↓
RDS MySQL Database (Private Isolated Subnets)
```

### Infrastructure Components

- **VPC**: Custom VPC with 2 Availability Zones
- **Public Subnets**: 1 per AZ for Application Load Balancers
- **Private Subnets**: 2 per AZ (one for EC2 instances, one isolated for RDS)
- **Security Groups**: Layered security for ALB, EC2, and RDS
- **IAM Roles**: Secure access management for EC2 instances
- **Bastion Host**: Secure access for administrative tasks
- **AWS Secrets Manager**: Secure credential storage

## 🔒 Security Features

**Layered Network Security**
- Traffic flow: Internet → ALB (Public) → EC2 (Private) → RDS (Isolated)
- Each component only accepts traffic from specific security group sources
- RDS databases completely isolated from internet access

**Security Group Configuration**

| Component | Port | Source | Purpose |
|-----------|------|--------|---------|
| ALB | 80 (HTTP) | 0.0.0.0/0 | Public web access |
| EC2 | 80 | ALB Security Group | Application traffic only |
| RDS | 3306 | EC2 Security Group | Database access only |

**Identity & Access Management**
- IAM roles with temporary credentials for EC2 instances
- AWS Secrets Manager for secure database credential storage
- Systems Manager Session Manager for secure administrative access via Bastion Host

## 📋 Prerequisites

- Node.js (v14 or later)
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed
- TypeScript knowledge
- Valid AWS account with sufficient permissions

## 🚀 Installation

**Clone and Setup**
```bash
git clone https://github.com/yourusername/aws-healthcare-cdk.git
cd aws-healthcare-cdk
npm install
npm install -g aws-cdk  # if not already installed
```

**AWS Configuration**
```bash
aws configure sso
cdk bootstrap  # first time only
```

**Required Dependencies**
```json
{
  "@aws-cdk/aws-ec2": "latest",
  "@aws-cdk/aws-rds": "latest", 
  "@aws-cdk/aws-iam": "latest",
  "@aws-cdk/aws-elasticloadbalancingv2": "latest",
  "@aws-cdk/aws-secretsmanager": "latest"
}
```

## Deployment

**Pre-Deployment Validation**
```bash
cdk synth  # Converts TypeScript to CloudFormation templates
cdk diff   # Shows exactly what will change - ALWAYS REVIEW
```

**Deploy Infrastructure**
```bash
cdk deploy
```

Creates: VPC with proper subnets, ALB, EC2 instances, RDS database, security groups, and IAM roles.

**Post-Deployment**: Verify all resources in AWS Console and test connectivity via Bastion Host.

## Testing

**Bastion Host Connectivity Testing**
```bash
# Connect to bastion via Systems Manager
aws ssm start-session --target i-1234567890abcXXXX

# Install MariaDB client and test RDS connection
sudo dnf install mariadb105 -y
aws secretsmanager get-secret-value --secret-id rds-credentials
mysql -h your-rds-endpoint -u admin -p
```

**Validation Checklist**
- ✅ Internet → ALB → EC2 → RDS connectivity
- ✅ Security group isolation working properly
- ✅ IAM roles and Secrets Manager integration
- ✅ Multi-AZ deployment verification

## Cleanup

```bash
cdk destroy
```
Removes all resources to avoid ongoing AWS charges.

## Tools Used

- **AWS CDK**: Infrastructure as Code framework with TypeScript
- **Node.js & npm**: JavaScript runtime and package management  
- **AWS CLI**: Authentication and resource management
- **Visual Studio Code**: Primary development environment
- **Git & GitHub**: Version control and project hosting
- **AWS Systems Manager**: Secure instance access via Session Manager

## Resources

- **AWS CDK Developer Guide**: [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- **AWS CDK API Reference**: [CDK TypeScript API](https://docs.aws.amazon.com/cdk/api/v2/)
- **AWS Well-Architected Framework**: [Architecture Best Practices](https://aws.amazon.com/architecture/well-architected/)
- **AWS VPC User Guide**: [VPC Documentation](https://docs.aws.amazon.com/vpc/)
- **AWS RDS User Guide**: [RDS Documentation](https://docs.aws.amazon.com/rds/)
- **AWS Secrets Manager**: [Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)

## Let's Connect!

- **LinkedIn**: [https://www.linkedin.com/in/dehan-bekker](https://www.linkedin.com/in/dehan-bekker)
- **Medium Blog**: [https://medium.com/@dehanbekker23](https://medium.com/@dehanbekker23)
