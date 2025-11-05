import Elysia from "elysia";
import jwt from "jsonwebtoken";
import PremiumUser from "../models/premium-users";
import DodoPayClient from "../utils/dodopayments";

export default new Elysia().post('/uncancel-subscription', async ({ cookie: { session } }) => {
    const token: { id: string } = jwt.verify(session.value!.toString(), Bun.env.JWT_SECRET!) as any;
    const user = await PremiumUser.findById(token.id);
    if (user) {
        const uncancel = await DodoPayClient.subscriptions.update(user.subscription_id as string, {
            cancel_at_next_billing_date: false
        });

        if (uncancel.cancel_at_next_billing_date === false) {
            user.status = 'active';
            user.statusUpdatedAt = new Date();
            await user.save();

            console.log(`User ${user._id} has uncancelled their subscription.`);

            return { success: true };
        } else {
            return { success: false, error: "Failed to uncancel subscription" };
        }
    } else {
        return { success: false, error: "You never subscribe to premium" };
    }
});