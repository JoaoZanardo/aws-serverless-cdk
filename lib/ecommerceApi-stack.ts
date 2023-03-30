import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cwlogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ECommerceApiStackProps extends cdk.StackProps {
    productsFetchHandler: lambdaNodeJS.NodejsFunction;
    productsAdminHandler: lambdaNodeJS.NodejsFunction;
    ordersHandler: lambdaNodeJS.NodejsFunction;
}

export class ECommerceApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
        super(scope, id, props);

        const logGroup = new cwlogs.LogGroup(this, 'ECommerceApiLogs');
        const api = new apigateway.RestApi(
            this,
            'ECommerceApi',
            {
                restApiName: 'ECommerceApi',
                cloudWatchRole: true,
                deployOptions: {
                    accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                    accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                        httpMethod: true,
                        ip: true,
                        protocol: true,
                        requestTime: true,
                        resourcePath: true,
                        responseLength: true,
                        status: true,
                        caller: true,
                        user: true
                    })
                }
            }
        );

        this.createProductsService(props, api);
        this.createOrdersService(props, api);
    }

    private createProductsService(props: ECommerceApiStackProps, api: apigateway.RestApi): void {
        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler);
        const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler);

        // GET "/products"
        const productsResource = api.root.addResource('products');
        productsResource.addMethod('GET', productsFetchIntegration);

        // POST "/products"
        productsResource.addMethod('POST', productsAdminIntegration);

        // GET "/products/{id}"
        const productIdResource  = productsResource.addResource('{id}');
        productIdResource.addMethod('GET', productsFetchIntegration)

        // PUT "/products/{id}"
        productIdResource.addMethod('PUT', productsAdminIntegration);

        // DELETE "/products/{id}"
        productIdResource.addMethod('DELETE', productsAdminIntegration);
    }

    private createOrdersService(props: ECommerceApiStackProps, api: apigateway.RestApi): void {
        const orderIntegration = new apigateway.LambdaIntegration(props.ordersHandler);
        const ordersResource = api.root.addResource('orders');

        
        // POST /orders
        ordersResource.addMethod('POST', orderIntegration);

        // GET /orders
        // GET /orders?email=zanardo@gmail.com
        // GET /orders?email=zanardo@gmail.com&orderId=123
        ordersResource.addMethod('GET', orderIntegration);

        const orderDeletationValidator = new apigateway.RequestValidator(this, 'OrderDeletationValidator', {
            restApi: api,
            requestValidatorName: 'OrderDeletationValidator',
            validateRequestParameters: true
        })

        // DELETE /orders?email=zanardo@gmail.com&orderId=123
        ordersResource.addMethod('DELETE', orderIntegration, {
            requestParameters: {
                'method.request.querystring.email': true,
                'method.request.querystring.orderId': true,
            },
            requestValidator: orderDeletationValidator
        });
    }
}