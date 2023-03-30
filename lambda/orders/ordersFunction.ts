import { DynamoDB } from "aws-sdk";
import { Order, OrderProduct, OrderRepository } from "./layers/ordersLayer/orderRepository";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import * as AWSXray from 'aws-xray-sdk';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CarrierType, OrderRequest, orderResponse, PaymentType, ShippingType } from "./layers/ordersApiLayer/orderApi";

AWSXray.captureAWS(require('aws-sdk'));

const ordersDdb = process.env.ORDERS_DDB!;
const productsDdb = process.env.PRODUCTS_DDB!;

const ddbClient = new DynamoDB.DocumentClient();

const ordersRepository = new OrderRepository(ddbClient, ordersDdb);
const productsRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;

    if (method === 'GET') {
        const queryString = event.queryStringParameters;

        if (queryString) {
            if (queryString.email && queryString.orderId) {
                // GET /orders?email=anyemail@gmail.com?orderId=any_ID
                try {
                    const order = await ordersRepository.getOrder(queryString.email, queryString.orderId);
                    
                    return {
                        statusCode: 200,
                        body: JSON.stringify(order)
                    }
                } catch (error) {
                    console.log((<Error> error).message);

                    return {
                        statusCode: 404,
                        body: JSON.stringify({
                            message: (<Error> error).message
                        })
                    }
                    
                }
            } else if (queryString.email) {
                // GET /orders?email=anyemail@gmail.com
                const orders = await ordersRepository.getOrdersByEmail(queryString.email);

                return {
                    statusCode: 200,
                    body: JSON.stringify(orders)
                }
            }
        }

        // GET /orders
        const orders = await ordersRepository.getAllOrders();

        return {
            statusCode: 200,
            body: JSON.stringify(orders)
        }
    }
       
    if (method === 'POST') {
        const orderRequest = JSON.parse(event.body!) as OrderRequest;

        const productsIds: string[] = [];
        orderRequest.productIds.map(id => {
            productsIds.push(id);
        });

        const products = await productsRepository.getProductsByIds(productsIds);

        if (orderRequest.productIds.length !== products.length) return {
            statusCode: 404,
            body: JSON.stringify({
                message: 'Product not found'
            })
        }

        const order = buildOrder(orderRequest, products);
        const orderCreated = await ordersRepository.create(order);

        return {
            statusCode: 201,
            body: JSON.stringify(converToOrderResponse(orderCreated))
        }
    }

    if (method === 'DELETE') {
        const email = event.queryStringParameters!.email!;
        const orderId = event.queryStringParameters!.orderId!;

        console.log(`DELETE /orders/${email}/${orderId}`);
        
        try {
            const orderDeleted = await ordersRepository.delete(email, orderId);

            return {
                statusCode: 200,
                body: JSON.stringify(orderDeleted)
            }
        } catch (error) {
            console.log((<Error> error).message);

            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: (<Error> error).message
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

function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
    let totalPrice = 0;
    const orderProducts: OrderProduct[] = [];

    products.map(product => {
        totalPrice += product.price;
        orderProducts.push(product);
    });

    return {
        pk: orderRequest.email,
        shipping: {
            type: orderRequest.shipping.type,
            carrier: orderRequest.shipping.carrier
        },
        billing: {
            payment: orderRequest.payment,
            totalPrice
        },
        products: orderProducts
    }
}

function converToOrderResponse(order: Order): orderResponse {
    return {
        id: order.sk!,
        created_at: order.created_at!,
        email: order.pk,
        shipping: {
            type: order.shipping.type as ShippingType,
            carrier: order.shipping.carrier as CarrierType
        },
        billing: {
            payment: order.billing.payment as PaymentType,
            totalPrice: order.billing.totalPrice
        },
        products: order.products.map(product => {
            return product;
        })
    }
}