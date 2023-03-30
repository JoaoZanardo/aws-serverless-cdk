import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB, Lambda } from 'aws-sdk';
import { ProductRepository, Product } from "/opt/nodejs/productsLayer";
import * as AWSXRay from 'aws-xray-sdk';
import { ProductEvent, ProductEventType } from "./layers/productEventsLayer/productEvent";

AWSXRay.captureAWS(require('aws-sdk'));

const productEventsFunctionName = process.env.PRODUCT_EVENT_FUNCTION_NAME!;
const lambdaClient = new Lambda();
 
const productsDdb = process.env.PRODUCTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();

const productsRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const lambdaRequestId = context.awsRequestId;

    if (event.resource === '/products') {
        console.log('POST /products');

        const product = JSON.parse(event.body!) as Product;
        const productCreated = await productsRepository.create(product);

        const response = await sendProductEvent(
            productCreated, 
            ProductEventType.CREATED, 
            lambdaRequestId, 
            'zanardo@gmail.com'
        ); 
        console.log({ response });

        return {
            statusCode: 201,
            body: JSON.stringify(productCreated)
        }
    }

    if (event.resource === '/products/{id}') {
        const productId = event.pathParameters!.id as string;

        if (method === 'PUT') {
            console.log(`PUT /products/${productId}`);

            const product = JSON.parse(event.body!) as Product;
            try {
                const productUpdated = await productsRepository.update(productId, product);

                const response = await sendProductEvent(
                    productUpdated, 
                    ProductEventType.UPDATED, 
                    lambdaRequestId, 
                    'zanardo@gmail.com'
                ); 
                console.log({ response });
        
            
                return {
                    statusCode: 200,
                    body: JSON.stringify(productUpdated)
                }
            } catch (ConditionalCheckFailedException) {
                console.error(ConditionalCheckFailedException);
                
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: 'Product not found'
                    })
                }
            }
        }

        if (method === 'DELETE') {
            console.log(`DELETE /products/${productId}`);

            try {
                const productDeleted = await productsRepository.delete(productId); 

                const response = await sendProductEvent(
                    productDeleted, 
                    ProductEventType.DELETED, 
                    lambdaRequestId, 
                    'zanardo@gmail.com'
                ); 
                console.log({ response });

                return {
                    statusCode: 200,
                    body: JSON.stringify(productDeleted)
                }
            } catch (error) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: (<Error> error).message
                    })
                }
            }
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({
            message: 'BAD REQUEST'
        })
    }
}

export async function sendProductEvent(
    product: Product, 
    eventType: ProductEventType, 
    lambdaRequestId: string,
    email: string
) {
    const event: ProductEvent = {
        email,
        eventType,
        requestId: lambdaRequestId,
        productCode: product.code,
        productId: product.id,
        productPrice: product.price
    }

    return await lambdaClient.invoke({
       FunctionName: productEventsFunctionName,
       Payload: JSON.stringify(event),
       InvocationType: 'RequestResponse'
    }).promise();
}