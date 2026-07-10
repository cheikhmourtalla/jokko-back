import { prisma } from "../config/prisma";
import {
  PaymentMethod,
  PaymentType,
  PlanType,
} from "../database/prisma/generated/prisma/enums";
import { CreatePaymentOptions } from "../types";
import { NotFoundError } from "../utils/errors";
import { PaymentService } from "./payment.service";
import { SubscriptionService } from "./subscription.service";

// Later , wil be user to type billing option
type BillingOptions = {
  shopId: number;
  phoneNumber : string,
  code: PlanType;
  provider: PaymentMethod;
  paymentType?: PaymentType;
};

export const BillingService = {
  checkout: async (billingOptions: BillingOptions) => {
    const getShopOwner = await prisma.shopOwner.findFirst({
      where : { phone : billingOptions.phoneNumber},
    })
    

    if(!getShopOwner){
      throw new NotFoundError("This shop owner is not found")
    }

     const selectedPlan = await prisma.plan.findUnique({
      where: { code: billingOptions.code },
      include: { subscriptions: true },
    });

    if (!selectedPlan) {
      throw new NotFoundError(`Plan does not exist`);
    }


    const amount = selectedPlan.price;

    const currentSubscription = await SubscriptionService.currentSubscription(
      getShopOwner.shopId,
      getShopOwner.userId,
    );


    const paymentData: CreatePaymentOptions = {
      shopOwnerId: getShopOwner.shopId,
      subscriptionId: currentSubscription.id,
      planId: selectedPlan.id,
      planCode: selectedPlan.code,
      planName: selectedPlan.name,
      provider: billingOptions.provider,
      amount: amount,
    };
    console.log({shopOwnerId : paymentData.shopOwnerId})
    
    const payment = await PaymentService.createPayment(paymentData);

    const updatePaymenStatus = await PaymentService.updatePayment(
      payment.id,
      "SUCCESS",
    );

    
    // ok ? update Subscription
    const updateSubscription = await SubscriptionService.renewal(
      payment.subscriptionId,
      payment.shopOwnerId,
      payment.planId,
      // transaction_id
    );

    return {
      updatedPayment: updatePaymenStatus,
      UpdatedSubscription: updateSubscription,
    };
  },
};
