import { CfnOutput, StackProps } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Topic } from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

interface SNSProps {
    ackPublisherFunction: IFunction,
    ackTargetFunction: IFunction
}

export class ShoppingCartSNS extends Construct {
    constructor(scope: Construct, id: string, props: SNSProps) {
        super(scope, id);

        const ackTopic = new Topic(this, 'AckTopic', {
            displayName: 'AckTopic',
            topicName: 'AckTopic',
            fifo: false
        });

        ackTopic.grantPublish(props.ackPublisherFunction);
        ackTopic.addSubscription(new LambdaSubscription(props.ackTargetFunction));

    }
}