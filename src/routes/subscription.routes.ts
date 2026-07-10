import { Router } from "express"
import { SubscriptionController } from "../controllers/subscription.controller"
import { authorizeRoles, protect } from "../middlewares/auth.middleware"

const router = Router()

router.get('', protect , authorizeRoles("ADMIN" , "EMPLOYEE") , SubscriptionController.getCurrentSubs)

export default router

