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

        const productsResource = api.root.addResource('products');

        // GET "/products"
        productsResource.addMethod('GET', productsFetchIntegration);

        // POST "/products"
        const productRequestValidator = new apigateway.RequestValidator(this, 'ProductRequestValidator', {
            restApi: api,
            requestValidatorName: 'Product request validator',
            validateRequestBody: true
        });

        const productModel = new apigateway.Model(this, 'ProductModel', {
            restApi: api,
            modelName: 'ProductModel',
            contentType: 'application/json',
            schema: {
                properties: {
                    model: {
                        type: apigateway.JsonSchemaType.STRING
                    },
                    code: {
                        type: apigateway.JsonSchemaType.STRING
                    },
                    price: {
                        type: apigateway.JsonSchemaType.NUMBER
                    },
                    productName: {
                        type: apigateway.JsonSchemaType.STRING
                    }
                },
                required: [
                    'model',
                    'code',
                    'price',
                    'productName'
                ]
            }
        });

        productsResource.addMethod('POST', productsAdminIntegration, {
            requestValidator: productRequestValidator,
            requestModels: {
                'application/json': productModel
            }
        });

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
        const orderRequestValidator = new apigateway.RequestValidator(this, 'OrderRequestValidator', {
            restApi: api,
            validateRequestBody: true,
            requestValidatorName: 'Order request validator'
        });

        const orderModel = new apigateway.Model(this, 'OrderModel', {
            restApi: api,
            modelName: 'OrderModel',
            contentType: 'application/json',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    email: {
                        type: apigateway.JsonSchemaType.STRING
                    },
                    productIds: {
                        type: apigateway.JsonSchemaType.ARRAY,
                        minItems: 1,
                        items: {
                            type: apigateway.JsonSchemaType.STRING
                        }
                    },
                    payment: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD']
                    },
                    shipping: {
                        type: apigateway.JsonSchemaType.OBJECT,
                        properties: {
                            type: {
                                type: apigateway.JsonSchemaType.STRING,
                                enum: ['URGENT', 'ECONOMIC']
                            },
                            carrier: {
                                type: apigateway.JsonSchemaType.STRING,
                                enum: ['FEDEX', 'CORREIOS']
                            }
                        }
                    }
                },
                required: [
                    'email',
                    'productIds',
                    'payment',
                    'shipping'
                ]
            }   
        });

        ordersResource.addMethod('POST', orderIntegration, {
            requestValidator: orderRequestValidator,
            requestModels: {
                'application/json': orderModel
            }
        });

        // GET /orders
        // GET /orders?email=zanardo@gmail.com
        // GET /orders?email=zanardo@gmail.com&orderId=123
        ordersResource.addMethod('GET', orderIntegration);

        // DELETE /orders?email=zanardo@gmail.com&orderId=123
        const orderDeletationValidator = new apigateway.RequestValidator(this, 'OrderDeletationValidator', {
            restApi: api,
            requestValidatorName: 'OrderDeletationValidator',
            validateRequestParameters: true
        });

        ordersResource.addMethod('DELETE', orderIntegration, {
            requestParameters: {
                'method.request.querystring.email': true,
                'method.request.querystring.orderId': true,
            },
            requestValidator: orderDeletationValidator
        });
    }
}