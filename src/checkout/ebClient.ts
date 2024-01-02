import { EventBridgeClient } from "@aws-sdk/client-eventbridge";

const region = 'ap-south-1';

const ebClient = new EventBridgeClient({ region });

export { ebClient };