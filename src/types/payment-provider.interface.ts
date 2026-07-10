import { CreatePaymentRequest, CreatePaymentResponse } from ".";


export interface  PaymentProvider  {

    createPayment (req : CreatePaymentRequest)  : Promise<CreatePaymentResponse>
    verifyPayment (req : CreatePaymentRequest)  : Promise<CreatePaymentResponse>
}