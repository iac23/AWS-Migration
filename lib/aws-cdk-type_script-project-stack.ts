import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// Imported VPC construct
import * as ec2 from 'aws-cdk-lib/aws-ec2';
// Imported RDS construct
import * as rds from 'aws-cdk-lib/aws-rds';
// Imported ELB construct
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
// Imported IAM construct
import * as iam from 'aws-cdk-lib/aws-iam';
// Import CFN Parameter
import { CfnParameter } from 'aws-cdk-lib';


// Class Stack for CDK code
export class AwsCdkTypeScriptProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

// OpenID Connect Provider construct for GitHub Actions
const provider = new iam.OpenIdConnectProvider(this, 'MyProvider', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: [ 'sts.amazonaws.com' ],
});

// IAM Role for GitHub Actions
const githubRole = new iam.Role(this, 'githubrole', {
  assumedBy: new iam.PrincipalWithConditions(
    new iam.OpenIdConnectPrincipal(provider), 
    {
      StringLike: {
        'token.actions.githubusercontent.com:sub': 'repo:iac23/AWS-Migration:ref:refs/heads/main'
      },
    }
  ),
});

// IAM Role Policy for GitHub Actions
githubRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
); 

// Create the VPC resource construct
const vpc = new ec2.Vpc(this, 'my-vpc', {
  ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
  maxAzs: 2,  // This tells CDK to use 2 AZs
  subnetConfiguration: [
     {
       cidrMask: 24,    // Use a subnet-specific CIDR mask
       name: 'public',
       subnetType: ec2.SubnetType.PUBLIC,
     },
     {
        cidrMask: 24,
        name: 'private-subnet-egress',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
     },
     {
        cidrMask: 28,   // Smaller mask for DB is good practice
        name: 'private-subnet-rds',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
     },
  ]
});

// Bastion Host in Public Subnet
const bastionHost = new ec2.BastionHostLinux(this, 'my-bastion-host', {
  vpc: vpc,
    subnetSelection: {
      subnetType: ec2.SubnetType.PUBLIC},
  instanceName: 'MyBastionHost',

});

// Security group for ALB
const albSecurityGroup = new ec2.SecurityGroup(this, 'sg-alb', {
  vpc: vpc,
  description: 'Allow web traffic from the internet'
});

// Ingress rule for the ALB SG
const ingressRuleAlb = albSecurityGroup.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(80),
  'Allow web traffic from the internet',
);

// Security group for EC2
const ec2SecurityGroup = new ec2.SecurityGroup(this, 'SG-EC2', {
  vpc: vpc,
  description: 'Only allow sg-alb traffic'
});

// Ingress rule for the EC2 SG
const ingressRuleEC2 = ec2SecurityGroup.addIngressRule(
  ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
  ec2.Port.tcp(80),
  'Only allow sg-alb traffic'
);

// Security group for RDS
const rdsSecurityGroup = new ec2.SecurityGroup(this, 'SG-RDS', {
  vpc: vpc,
  description: 'Only allow EC2 Instance with IAM role'
});

// Ingress rule for RDS database
const ingressRuleRds = rdsSecurityGroup.addIngressRule(
  ec2.Peer.securityGroupId(ec2SecurityGroup.securityGroupId),
  ec2.Port.tcp(3306),
  'Only allow EC2 Instance with IAM role'
);

// Ingress rule for Bastion Host to RDS database
rdsSecurityGroup.addIngressRule(
  bastionHost.connections.securityGroups[0],   // this establishes a trust relationship between Security groups
  ec2.Port.tcp(3306),
  'Allow MySQL access from the Bastion Host'
);

// Create IAM Role for EC2 Instances
const DBAccessRole = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

// Declare an empty array
const ec2Instances : ec2.Instance[] = [];

// Ensure only the egress subnets are selected for the EC2 instances
const egressSubnets = vpc.selectSubnets({
  subnetGroupName: 'private-subnet-egress'
}).subnets;

// Create EC2 instances in a VPC. Inside egress private subnets
for (let i = 0; i < 2; i++) {  
  const instance = new ec2.Instance(this, `ec2-instance-${i}`, {
    vpc: vpc,
    role: DBAccessRole,
    securityGroup: ec2SecurityGroup,
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.T3, ec2.InstanceSize.MICRO
    ),
    machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    vpcSubnets: { 
      subnets: [egressSubnets[i]]
    },
});

// Add the newly created instances to the array
  ec2Instances.push(instance);
}

// Declare an empty array
const rdsInstances : rds.DatabaseInstance[] = [];

// Create RDS databases in VPC. Inside isolated private subnets
for (let db = 0; db < 2; db++) {
  const DatabaseInstance = new rds.DatabaseInstance(this, `rds-instance-${db}`, {
    engine: rds.DatabaseInstanceEngine.mysql({ 
      version: rds.MysqlEngineVersion.VER_8_0_39 
    }),
    vpc: vpc,
    credentials: rds.Credentials.fromGeneratedSecret('health_tech_admin'),
    securityGroups: [rdsSecurityGroup],
    vpcSubnets: { 
      subnetGroupName: 'private-subnet-rds' 
    },

    instanceType: 
      ec2.InstanceType.of(
      ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO
    ),
    
    storageType: rds.StorageType.GP3,
    allocatedStorage: 20,
    multiAz: true,
    iamAuthentication: true,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

// Add RDS database instances to the array
  rdsInstances.push(DatabaseInstance);
}

// Creating the Application Load Balancer
const lb = new elbv2.ApplicationLoadBalancer(this, 'app-load-balancer', {
  vpc: vpc,
  internetFacing: true,
  securityGroup: albSecurityGroup,
});

// Create Listener for ALB
const listener = lb.addListener('http-listener', { 
  port: 80,
  protocol: elbv2.ApplicationProtocol.HTTP,
});

// target to the listener
listener.addTargets('ApplicationFleet', {
  port: 80,
  protocol: elbv2.ApplicationProtocol.HTTP,
  targets: ec2Instances.map(instance => new targets.InstanceTarget(instance)),
});

// Policy to read secret from Secrets Manager
DBAccessRole.addToPolicy(new iam.PolicyStatement({
  resources: [rdsInstances[0].secret!.secretArn],  // reference the Secrets Manager ARN
  actions: ['secretsmanager:GetSecretValue'],
}));

// Policy for IAM database Authentication
DBAccessRole.addToPolicy(new iam.PolicyStatement({
  resources: rdsInstances.map(instance => instance.instanceArn), // refernce the RDS ARN
  actions: ['rds-db:connect'],
}));

// Policy for Bastion Host to read from Secrets Manager
(bastionHost.role as iam.Role).addToPolicy(new iam.PolicyStatement({  // returns the IAM role the Bastion construct creates
    resources: [rdsInstances[0].secret!.secretArn],
    actions: ['secretsmanager:GetSecretValue'],


}));

}
} 