import Elysia, { t } from "elysia";
import jwt from "jsonwebtoken";
import PremiumUser from "../models/premium-users";
import DodoPayClient from "../utils/dodopayments";

export default new Elysia().post('/cancel-subscription', async ({ body, cookie }) => {
    const token: { id: string } = jwt.verify(cookie['vibedin-session'].value!.toString(), Bun.env.JWT_SECRET!) as any;
    const user = await PremiumUser.findById(token.id);
    if (user) {
        const cancel = await DodoPayClient.subscriptions.update(user.subscription_id as string, {
            cancel_at_next_billing_date: true
        });

        if (cancel.cancel_at_next_billing_date) {
            user.status = 'cancelled';
            user.statusUpdatedAt = new Date();
            await user.save();

            if (body.reason?.trim() !== '') {
                // Not used `await` to send this asynchronously to avoid delaying the response
                fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        access_key: 'f193232f-1e16-47b3-8fff-fe479bf083c0',
                        'VibedIn Cancel Reason': body.reason,
                    })
                });
            }

            console.log(`User ${user._id} has cancelled their subscription.`);

            return { success: true };
        } else {
            return { success: false, error: "Failed to cancel subscription" };
        }
    } else {
        return { success: false, error: "You are not a premium user" };
    }
}, {
    cookie: t.Object({
        'vibedin-session': t.String()
    }),
    body: t.Object({
        reason: t.Optional(t.String())
    })
});