import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventResource from 'aws-cdk-lib/aws-lambda-event-sources';

export interface OrdersAppStackProps extends cdk.StackProps {
    productsDdb: dynamodb.Table;
    eventsDdb: dynamodb.Table;
}

export class OrdersAppStack extends cdk.Stack {
    readonly ordersHandler: lambdaNodeJS.NodejsFunction;
    readonly orderEventsFetchHandler: lambdaNodeJS.NodejsFunction

    constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
        super(scope, id, props);

        // Orders Layer
        const ordersLayerArn = ssm.StringParameter.valueForStringParameter(this, 
            'OrdersLayerVersionArn');
        const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(this, 
            'OrdersLayerVersionArn', ordersLayerArn);

        // Orders Layer
        const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this, 
            'OrdersApiLayerVersionArn');
        const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, 
            'OrdersApiLayerVersionArn', ordersApiLayerArn);

        // Products Layer
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, 
            'ProductsLayerVersionArn');
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 
            'ProductsLayerVersionArn', productsLayerArn);

        // Order Events Layer
        const orderEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, 
            'OrderEventsLayerVersionArn');
        const orderEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 
            'OrderEventsLayerVersionArn', orderEventsLayerArn);

        // Order Events Repository Layer
        const orderEventsRepositoryLayerArn = ssm.StringParameter.valueForStringParameter(this, 
            'OrderEventRepositoryLayerVersionArn');
        const orderEventsRepositoryLayer = lambda.LayerVersion.fromLayerVersionArn(this, 
            'OrderEventRepositoryLayerVersionArn', orderEventsRepositoryLayerArn);

        const ordersTopic = new sns.Topic(this, 'Order events topic', {
            displayName: 'Order events topic',
            topicName: 'order-events',
        });

        const ordersDdb = new dynamodb.Table(this, 'OrdersDdb', {
            tableName: 'orders',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: 'pk',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'sk',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        });

        this.ordersHandler = new lambdaNodeJS.NodejsFunction(this, 'OrderFunction', {
            functionName: 'OrderFunction',
            entry: 'lambda/orders/orderFunction.ts',
            handler: 'handler',
            environment: {
                ORDERS_DDB: ordersDdb.tableName,
                PRODUCTS_DDB: props.productsDdb.tableName,
                ORDER_EVENTS_TOPIC_ARN: ordersTopic.topicArn
            },
            layers: [
                ordersLayer,
                productsLayer, 
                ordersApiLayer,
                orderEventsLayer
            ],
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: true,
                sourceMap: false
            },
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        });

        ordersTopic.grantPublish(this.ordersHandler);
        ordersDdb.grantReadWriteData(this.ordersHandler);
        props.productsDdb.grantReadData(this.ordersHandler);

        const orderEventsHandler = new lambdaNodeJS.NodejsFunction(this, 'OrderEventsFunction', {
            functionName: 'OrderEventsFunction',
            entry: 'lambda/orders/orderEventsFunction.ts',
            handler: 'handler',
            environment: {
                EVENTS_DDB: props.eventsDdb.tableName
            },
            layers: [orderEventsLayer, orderEventsRepositoryLayer],
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: true,
                sourceMap: false
            },
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        });

        const eventsDdbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:PutItem'],
            resources: [props.eventsDdb.tableArn],
            conditions: {
                ['ForAllValues:StringLike']: {
                    'dynamodb:LeadingKeys': ['#order_*']
                }
            }
        });

        orderEventsHandler.addToRolePolicy(eventsDdbPolicy);
        ordersTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler));

        const billingHandler = new lambdaNodeJS.NodejsFunction(this, 'BillingFunction', {
            functionName: 'BillingFunction',
            entry: 'lambda/orders/billingFunction.ts',
            handler: 'handler',
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: true,
                sourceMap: false
            },
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        });

        ordersTopic.addSubscription(new subs.LambdaSubscription(billingHandler, {
            filterPolicy: {
                eventType: sns.SubscriptionFilter.stringFilter({
                        allowlist: ['ORDER_CREATED']
                })
            }
        }));

        const orderEmailhandler = new lambdaNodeJS.NodejsFunction(this, 'OrderEmailFunction', {
            functionName: 'OrderEmailFunction',
            entry: 'lambda/orders/orderEmailFunction.ts',
            handler: 'handler',
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: true,
                sourceMap: false
            },
            layers: [orderEventsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        }); 

        const orderEmailSesPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*']
        });

        orderEmailhandler.addToRolePolicy(orderEmailSesPolicy)

        const orderEventsDlq = new sqs.Queue(this, 'OrderEventsDlq', {
            queueName: 'order-events-dlq',
            retentionPeriod: cdk.Duration.days(10)
        });

        const orderEventsQueue = new sqs.Queue(this, 'OrderEventsQueue', {
            queueName: 'order-events',
            deadLetterQueue: {
                queue: orderEventsDlq,
                maxReceiveCount: 3
            }
        });

        ordersTopic.addSubscription(new subs.SqsSubscription(orderEventsQueue, {
            filterPolicy: {
                eventType: sns.SubscriptionFilter.stringFilter({
                        allowlist: ['ORDER_CREATED']
                })
            }
        }));
        orderEmailhandler.addEventSource(new lambdaEventResource.SqsEventSource(orderEventsQueue, {
            batchSize: 3,
            enabled: true,
            maxBatchingWindow: cdk.Duration.minutes(1)
        }));
        orderEventsQueue.grantConsumeMessages(orderEmailhandler);

        // Order Events Handler
        this.orderEventsFetchHandler = new lambdaNodeJS.NodejsFunction(this, 'OrderEventsFetchFunction', {
            functionName: 'OrderEventsFetchFunction',
            entry: 'lambda/orders/orderEventsFetchFunction.ts',
            handler: 'handler',
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: true,
                sourceMap: false
            },
            layers: [orderEventsRepositoryLayer],
            environment: {
                EVENTS_DDB: props.eventsDdb.tableName
            },
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        }); 

        const eventsFetchDdbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:Query'],
            resources: [`${props.eventsDdb.tableArn}/index/emailIndex`]
        });

        this.orderEventsFetchHandler.addToRolePolicy(eventsFetchDdbPolicy);
    }
}