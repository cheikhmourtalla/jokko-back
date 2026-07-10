import { PaymentMethod } from "../database/prisma/generated/prisma/enums";

export type CreatePaymentRequest = {
  amount: number;
  currency: string;
  reference: string;
};


export type CreatePaymentResponse = {
  success: boolean;
  status: "PENDING" | "SUCCESS" | "FAILED";
  transactionReference: string;
  paymentUrl?: string;
};
 export type CreatePaymentOptions = {
  shopOwnerId: number;
  subscriptionId: number; 
  planId: number;
  provider: PaymentMethod;
  amount: number;
  planCode?: string;
  planName?: string;
};
