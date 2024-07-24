import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as efs from 'aws-cdk-lib/aws-efs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecs from 'aws-cdk-lib/aws-ecs'

export class ExistingInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 1 });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

    const inputQueue = new sqs.Queue(this, 'NlpSqsQueue', {
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

    new cdk.CfnOutput(this, 'queueName', {
      value: inputQueue.queueName,
    })

    new cdk.CfnOutput(this, 'queueArn', {
      value: inputQueue.queueArn
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
