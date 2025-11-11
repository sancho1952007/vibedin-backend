import Elysia, { t } from "elysia";
import { DodopaymentsHandler } from 'dodopayments-webhooks';
import PremiumUser from "../models/premium-users";
import User from "../models/users";

const PaymentHandler = new DodopaymentsHandler({
    signing_key: Bun.env.DODO_PAYMENTS_WEBHOOK_SIGNING_KEY!
});

export default new Elysia().post('/payment-webhook', async ({ headers, body, set }) => {
    try {
        const payment = await PaymentHandler.handle({
            headers,
            body: body
        });

        // Subscription start/renewed
        if (payment.type === 'subscription.renewed' && payment.data.product_id === Bun.env.DODO_PAYMENTS_PRODUCT_ID) {
            await PremiumUser.findByIdAndUpdate(payment.data.metadata.userID, {
                subscription_id: payment.data.subscription_id,
                nextPayment: payment.data.next_billing_date,
                status: 'active',
                statusUpdatedAt: new Date().toISOString()
            }, {
                upsert: true
            });

            await User.findOneAndUpdate(
                { _id: payment.data.metadata.userID },
                { tier: 'premium' }
            );
            console.log(`Processed subscription initialization/renewal for user ${payment.data.metadata.userID}`);

            set.status = 200;
            return { success: true, remark: 'Subscription event processed successfully' };
        }

        // Subscription on hold
        else if (payment.type === 'subscription.on_hold' && payment.data.product_id === Bun.env.DODO_PAYMENTS_PRODUCT_ID) {
            await User.findOneAndUpdate(
                { _id: payment.data.metadata.userID },
                { tier: 'free' }
            );

            await PremiumUser.findByIdAndUpdate(payment.data.metadata.userID, {
                status: 'on_hold',
                statusUpdatedAt: new Date()
            });

            console.log(`Processed subscription on-hold for user ${payment.data.metadata.userID}`);

            set.status = 200;
            return { success: true, remark: 'Subscription event processed successfully' };
        }

        // Subscription completely cancelled/expired
        else if ((payment.type === 'subscription.cancelled' || payment.type === 'subscription.expired') && payment.data.product_id === Bun.env.DODO_PAYMENTS_PRODUCT_ID) {
            await User.findOneAndUpdate(
                { _id: payment.data.metadata.userID },
                { tier: 'free' }
            );

            await PremiumUser.findByIdAndDelete(payment.data.metadata.userID);
            console.log(`Processed subscription expiration for user ${payment.data.metadata.userID}`);

            set.status = 200;
            return { success: true, remark: 'Subscription event processed successfully' };
        }

        else {
            set.status = 200;
            return { success: true, remark: 'Unhandlable payment type/product' };
        }
    } catch (e) {
        console.error("Error during webhook handling:", e);
        set.status = 400;
        return { success: false, remark: 'Internal server error' };
    }
}, {
    body: t.Object({}, {
        additionalProperties: true
    })
});