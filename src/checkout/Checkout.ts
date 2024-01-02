export interface CheckoutAckPayload {
    userName: string;
    eventAck: boolean;
    eventProcessed?: boolean
}