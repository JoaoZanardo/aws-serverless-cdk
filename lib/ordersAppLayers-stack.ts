import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class OrdersAppLayersStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) { 
        super(scope, id, props);

        const ordersLayer = new lambda.LayerVersion(this, 'OrdersLayer', {
            code: lambda.Code.fromAsset('lambda/orders/layers/ordersLayer'),
            layerVersionName: 'OrdersLayer',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X]
        });

        new ssm.StringParameter(this, 'OrdersLayerVersionArn', {
            parameterName: 'OrdersLayerVersionArn',
            stringValue: ordersLayer.layerVersionArn
        });

        const ordersApiLayer = new lambda.LayerVersion(this, 'ordersApiLayer', {
            code: lambda.Code.fromAsset('lambda/orders/layers/ordersApiLayer'),
            layerVersionName: 'ordersApiLayer',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X]
        });

        new ssm.StringParameter(this, 'OrdersApiLayerVersionArn', {
            parameterName: 'OrdersApiLayerVersionArn',
            stringValue: ordersApiLayer.layerVersionArn
        });

        const orderEventsLayer = new lambda.LayerVersion(this, 'OrderEventsLayer', {
            code: lambda.Code.fromAsset('lambda/orders/layers/orderEventsLayer'),
            layerVersionName: 'OrderEventsLayer',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X]
        });

        new ssm.StringParameter(this, 'OrderEventsLayerVersionArn', {
            parameterName: 'OrderEventsLayerVersionArn',
            stringValue: orderEventsLayer.layerVersionArn
        });

        const orderEventsRepositoryLayer = new lambda.LayerVersion(this, 'OrderEventRepositoryLayer', {
            code: lambda.Code.fromAsset('lambda/orders/layers/orderEventRepositoryLayer'),
            layerVersionName: 'OrderEventsRepositoryLayer',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X]
        });

        new ssm.StringParameter(this, 'OrderEventRepositoryLayerVersionArn', {
            parameterName: 'OrderEventRepositoryLayerVersionArn',
            stringValue: orderEventsRepositoryLayer.layerVersionArn
        });
    }
}