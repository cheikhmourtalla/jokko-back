import { PaymentMethod } from "../database/prisma/generated/prisma/enums";
import { NotFoundError } from "../utils/errors";
import { WaveProvider } from "./wave-provider.service";

export const ProviderFactory = {
  getProvider: (provider: PaymentMethod) => {
    switch (provider) {
      case "WAVE":
        return WaveProvider
      case "IN_APP":
        
      default:
        throw new NotFoundError(`Payment provider  is not supported`);
    }
  },
};
