import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB } from 'aws-sdk';
import { ProductRepository } from "/opt/nodejs/productsLayer";
import * as AWSXRay from 'aws-xray-sdk';

AWSXRay.captureAWS(require('aws-sdk'));
 
const productsDdb = process.env.PRODUCTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();

const productsRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
     const method = event.httpMethod;

     if (event.resource === '/products') {
        if (method === 'GET') {
            console.log('GET /products');

            const products = await productsRepository.getAllProducts();

            return {
                statusCode: 200,
                body: JSON.stringify(products)
            }
        }
     }

     if (event.resource === '/products/{id}') {
        const productId = event.pathParameters!.id as string;
        console.log(`GET /products/${productId}`);

        try {
            const product = await productsRepository.getProductById(productId);
            
            return {
                statusCode: 200,
                body: JSON.stringify(product)
            }
        } catch (error) {
            console.log((<Error>error).message);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: (<Error>error).message
                })
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