import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  ECommerceApiStack, 
  ProductsAppStack, 
  ProductsLayerStack,
  EventsDdbStack,
  OrdersAppLayersStack,
  OrdersAppStack
} from '../lib/';

const app = new cdk.App();

const env: cdk.Environment = {
  account: '476237660940',
  region: 'us-east-1'
}

const tags = {
  cost: 'ECommerce',
  team: 'ZanardoTeam'
}

const productsAppLayersStack = new ProductsLayerStack(app, 'ProductsAppLayers', {
  tags,
  env
});

const eventsDdbStack = new EventsDdbStack(app, 'EventsDdb', {
  tags,
  env
});
const productsAppStack = new ProductsAppStack(app, 'ProductsApp', {
  eventsDdb: eventsDdbStack.table,
  tags,
  env
});
productsAppStack.addDependency(productsAppLayersStack);

const orderAppLayersStack = new OrdersAppLayersStack(app, 'OrderAppLayers', {
  tags,
  env
})
const ordersAppStack = new OrdersAppStack(app, 'OrdersAppStack', {
  productsDdb: productsAppStack.productsDdb,
  eventsDdb: eventsDdbStack.table,
  tags, 
  env
});
ordersAppStack.addDependency(productsAppStack);
ordersAppStack.addDependency(orderAppLayersStack);

const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: ordersAppStack.ordersHandler,
  orderEventsFetchHandler: ordersAppStack.orderEventsFetchHandler,
  tags,
  env
});

eCommerceApiStack.addDependency(productsAppStack);
eCommerceApiStack.addDependency(ordersAppStack);