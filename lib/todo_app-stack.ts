import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";

import * as cognito from "aws-cdk-lib/aws-cognito";

export class TodoAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "TasksUserPool", {
      userPoolName: "tasks-user-pool",
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "TasksUserPoolClient", {
      userPool,
      userPoolClientName: "tasks-user-pool-client",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "TasksAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    // S3 Bucket

    new s3.Bucket(this, 'TodoBucket', {
      versioned: true,
    });

    const helloLambda = new lambda.Function(this, 'HelloLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'hello.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    const table = new dynamodb.Table(this, 'TasksTable', {
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'taskId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'DoneIndex',
      partitionKey: {
        name: 'done',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    table.grantReadWriteData(helloLambda);

    helloLambda.addEnvironment('TABLE_NAME', table.tableName);

    // API Gateway
    const api = new apigateway.RestApi(this, 'TodoApi', {
      restApiName: 'Todo Service',
      description: 'API para gestionar tareas',
    });

    const tasks = api.root.addResource('tasks');
    const taskById = tasks.addResource('{id}');

    const protectedEndpoint = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    tasks.addMethod(
      'GET',
      new apigateway.LambdaIntegration(helloLambda),
      protectedEndpoint
    );

    taskById.addMethod(
      'GET',
      new apigateway.LambdaIntegration(helloLambda),
      protectedEndpoint
    );

    taskById.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(helloLambda),
      protectedEndpoint
    );

    taskById.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(helloLambda),
      protectedEndpoint
    );

    const tasksDLQ = new sqs.Queue(this, "TasksDLQ", {
      queueName: "tasks-dlq",
    });

    const tasksQueue = new sqs.Queue(this, "TasksQueue", {
      queueName: "tasks-queue",

      deadLetterQueue: {
        queue: tasksDLQ,
        maxReceiveCount: 3,
      },
    });

    const createTaskRequestLambda = new lambda.Function(this, "CreateTaskRequestLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "createTaskRequest.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: {
        TASKS_QUEUE_URL: tasksQueue.queueUrl,
      },
    });

    tasksQueue.grantSendMessages(createTaskRequestLambda);

    const taskCreatedTopic = new sns.Topic(this, "TaskCreatedTopic", {
      topicName: "task-created-topic",
    });

    helloLambda.addEnvironment(
      "TASK_CREATED_TOPIC_ARN",
      taskCreatedTopic.topicArn
    );

    taskCreatedTopic.grantPublish(helloLambda);

    const auditTable = new dynamodb.Table(this, "AuditTable", {
      partitionKey: {
        name: "eventId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const taskAuditLambda = new lambda.Function(
      this,
      "TaskAuditLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "taskAudit.handler",
        code: lambda.Code.fromAsset("lambda"),
        environment: {
          TABLE_NAME: auditTable.tableName,
        },
      },
    );
    
    auditTable.grantWriteData(taskAuditLambda);

    taskCreatedTopic.addSubscription(
      new subscriptions.LambdaSubscription(
        taskAuditLambda
      )
    );

    const processTaskQueueLambda = new lambda.Function(this, "ProcessTaskQueueLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "processTaskQueue.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: {
        TABLE_NAME: table.tableName,
        TOPIC_ARN: taskCreatedTopic.topicArn,
      },
    });

    table.grantReadWriteData(processTaskQueueLambda);

    processTaskQueueLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(tasksQueue)
    );

    taskCreatedTopic.grantPublish(
      processTaskQueueLambda
    );

    tasks.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createTaskRequestLambda),
      protectedEndpoint
    );

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
  }
}