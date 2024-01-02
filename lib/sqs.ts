import { Duration } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

interface QueueProps {
    checkoutFunction: IFunction;
}

export class ServerlessSQS extends Construct {

    public readonly checkoutQueue: Queue;

    constructor(scope: Construct, id: string, props: QueueProps) {
        super(scope, id);

        this.checkoutQueue = new Queue(this, 'CheckoutQueue', {
            queueName: 'CheckoutQueue',
            visibilityTimeout: Duration.seconds(30)
        });

        props.checkoutFunction.addEventSource(new SqsEventSource(this.checkoutQueue, {
            batchSize: 1
        }))
    }
}
