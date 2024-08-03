import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as efs from 'aws-cdk-lib/aws-efs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'

export class ExistingInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 3 });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

    const queue = new sqs.Queue(this, 'NlpSqsQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    const fileSystemPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        actions: [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientRootAccess",
          "elasticfilesystem:ClientWrite"
        ],
        principals: [new iam.AnyPrincipal()],
        conditions: {
          Bool: {
            'elasticfilesystem:AccessedViaMountTarget': 'true',
          }
        }
      })]
    })
    const fileSystem = new efs.FileSystem(this, 'NlpV2EfsFileSystem', {
      vpc: vpc,
      fileSystemPolicy: fileSystemPolicy,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const fileSystemSecurityGroupId = fileSystem.connections.securityGroups[0]

    const dbSecurityGroup = new ec2.SecurityGroup(this, "sg-postgres", {
      vpc: vpc
    })

    dbSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432), "Allow port 5432 for db connection from only within the VPC"
    )

    const dbCredentialsSecret = new secretsmanager.Secret(this, "db-credentials-secret", {
      secretName: "db-credentials-secret",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        passwordLength: 8,
        excludePunctuation: true,
      }

    })
    const dbInstance = new rds.DatabaseInstance(this, "PostgresInstance", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_3 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
      databaseName: "ecomms",
      vpc: vpc,
      port: 5432
    });

    new cdk.CfnOutput(this, 'dbArn', {
      value: dbInstance.instanceArn
    })

    new cdk.CfnOutput(this, 'dbEndpointAddress', {
      value: dbInstance.dbInstanceEndpointAddress
    })

    new cdk.CfnOutput(this, 'dbEndpointPort', {
      value: dbInstance.dbInstanceEndpointPort
    })

    new cdk.CfnOutput(this, 'queueName', {
      value: queue.queueName,
    })

    new cdk.CfnOutput(this, 'queueArn', {
      value: queue.queueArn
    })

    new cdk.CfnOutput(this, 'fileSystemId', {
      value: fileSystem.fileSystemId
    })

    new cdk.CfnOutput(this, 'clusterName', {
      value: cluster.clusterName
    })

    new cdk.CfnOutput(this, 'clusterArn', {
      value: cluster.clusterArn
    })

    new cdk.CfnOutput(this, 'VPC Id', {
      value: vpc.vpcId
    })

    new cdk.CfnOutput(this, 'Security Group', {
      value: fileSystemSecurityGroupId.securityGroupId
    })
  }
}
