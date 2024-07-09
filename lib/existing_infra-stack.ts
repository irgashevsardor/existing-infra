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

    // const role = new iam.Role(this, 'Role', {
    //   assumedBy: new iam.ArnPrincipal('arn:aws:iam::408500910341:user/test'),
    //   roleName: "MyAssumableRole"
    // })

    // inputQueue.grantSendMessages(role)

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 1 });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

    const inputQueue = new sqs.Queue(this, 'NlpSqsQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    const nfsIngressAllowSecurityGroup = new ec2.SecurityGroup(this, 'EfsSecurityGroup', { vpc })
    nfsIngressAllowSecurityGroup.addIngressRule(
      nfsIngressAllowSecurityGroup,
      ec2.Port.tcp(2049)
    )

    const fileSystem = new efs.FileSystem(this, 'NlpV2EfsFileSystem', {
      vpc: vpc,
      securityGroup: nfsIngressAllowSecurityGroup
    });

    fileSystem.addToResourcePolicy(new iam.PolicyStatement({
      actions: ["elasticfilesystem:ClientMount"],
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      principals: [new iam.ArnPrincipal("arn:aws:iam::408500910341:user/nlp_user2")]
    }
    ))

    new cdk.CfnOutput(this, 'SQS Name', {
      value: inputQueue.queueName,
    })

    new cdk.CfnOutput(this, 'SQS ARN', {
      value: inputQueue.queueArn
    })

    new cdk.CfnOutput(this, 'FileSystemId', {
      value: fileSystem.fileSystemId
    })

    new cdk.CfnOutput(this, 'Cluster Name', {
      value: cluster.clusterName
    })

    new cdk.CfnOutput(this, 'VPC Id', {
      value: vpc.vpcId
    })
  }
}
