import { Stack, StackProps } from "aws-cdk-lib";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction, SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { Function, IFunction } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface EventBusProps {
    publisherFuntion: Function
    targetQueue: IQueue
}

export class ShoppingCartEventBus extends Construct {
    constructor(scope: Construct, id: string, props: EventBusProps) {
        super(scope, id);

        // create custom event bus
        const eventBus = new EventBus(this, 'ShoppingCartEventBus', {
            eventBusName: 'ShoppingCartEventBus'
        });
        
        // create cart checkout rule rule
        const cartCheckoutRule = new Rule(this, 'CartCheckoutRule', {
            eventBus,
            enabled: true,
            description: 'Cart chcekout rule to target Checkout service',
            eventPattern: {
                source: ['com.shoppingCart.cart.cartCheckout'],
                detailType: ['CartCheckout']
            },
            ruleName: 'CartCheckoutRule'
        });

        // TODO: create rule to send an acknowledgement event from checkout service when an event is successfully received
        const checkoutAckRule = new Rule(this, 'CheckoutAckRule', {
            eventBus,
            enabled: true,
            description: `an acknowledgement event from checkout service when an event is successfully received`,
            eventPattern: {
                source: ['com.shoppingCart.cart.checkoutAck'],
                detailType: ['CheckoutAck']
            },
            ruleName: 'CheckoutAckRule'
        })
        // add target micro-service to rule
        //cartCheckoutRule.addTarget(new LambdaFunction(props.targetFunction!));
        //checkoutAckRule.addTarget(new LambdaFunction(props.targetFunction));

        // add target as checkout queue
        cartCheckoutRule.addTarget(new SqsQueue(props.targetQueue));
        // grant required permissions to event Bus
        eventBus.grantPutEventsTo(props.publisherFuntion!);
    }
}