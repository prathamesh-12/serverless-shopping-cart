import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ShoppingCartAPI } from './apiGatway';
import { ShoppingCartDatabase } from './database';
import { ShoppingCartMicroservices } from './microservices';
import { ShoppingCartEventBus } from './eventBus';
import { ShoppingCartSNS } from './sns';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ServerlessShoppingCartStack extends cdk.Stack {


  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new ShoppingCartDatabase(this, 'ShoppingCartDatabase');

    const microservice = new ShoppingCartMicroservices(this, 'ShoppingCartMicroservice', {
      productsTable: database.productsTable,
      cartsTable: database.cartsTable,
      checkoutTable: database.checkoutTable
    })

    const api = new ShoppingCartAPI(this, 'ShoppingCartAPI', {
      productService: microservice.productsMicroservice,
      cartsService: microservice.cartsMicroservice,
      checkoutService: microservice.checkoutMicroservice
    })

    //Event Bus / Event Bridge integration
    const eventBus = new ShoppingCartEventBus(this, 'ShoppingCartEventBus', {
      publisherFuntion: microservice.cartsMicroservice,
      targetFunction: microservice.checkoutMicroservice
    })
    

    const sns = new ShoppingCartSNS(this, 'SNS', {
      ackPublisherFunction: microservice.checkoutMicroservice,
      ackTargetFunction: microservice.cartsMicroservice
    })
  }
}
