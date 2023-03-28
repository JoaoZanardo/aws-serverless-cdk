import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuid } from 'uuid';

export interface Product {
    id: string;
    model: string;
    code: string;
    price: number;
    productName: string;
}

export class ProductRepository {
    constructor(
        private ddbClient: DocumentClient,
        private productsDdb: string
    ) { }
    
    async getAllProducts(): Promise<Product[]> {
        const data = await this.ddbClient.scan({
            TableName: this.productsDdb
        }).promise();
        return data.Items as Product[];
    }

    async getProductById(productId: string): Promise<Product> {
        const data = await this.ddbClient.get({
            TableName: this.productsDdb,
            Key: {
                id: productId 
            }
        }).promise();

        if (!data.Item) {
            throw new Error('Product not found');
        }

        return data.Item as Product;
    }

    async create(product: Product): Promise<Product> {
        product.id = uuid();

        await this.ddbClient.put({
            TableName: this.productsDdb,
            Item: product,
        }).promise();

        return product;
    }

    async delete(productId: string): Promise<Product> {
        const data =  await this.ddbClient.delete({
            TableName: this.productsDdb,
            Key: {
                id: productId
            },
            ReturnValues: 'ALL_OLD'
        }).promise();

        if (!data.Attributes) {
            throw new Error('Product not found'); 
        }

        return data.Attributes as Product;
    }

    async update(productId: string, product: Product): Promise<Product> {
        const data = await this.ddbClient.update({
            Key: {
                id: productId
            },
            TableName: this.productsDdb,
            ConditionExpression: 'attribute_exists(id)',
            ReturnValues: 'UPDATED_NEW',
            UpdateExpression: 'set productName = :n, code = :c, price = :p, model = :m',
            ExpressionAttributeValues: {
                ':n': product.productName,
                ':c': product.code,
                ':p': product.price,
                ':m': product.model
            }
        }).promise();

       data.Attributes!.id = productId;

       return data.Attributes as Product;
    }
}