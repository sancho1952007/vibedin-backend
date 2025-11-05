import Elysia from "elysia";
import jwt from "jsonwebtoken";
import User from "../models/users";
import DodoPayClient from "../utils/dodopayments";

export default new Elysia().get('/purchase-premium', async ({ cookie, redirect }) => {
    if (!('session' in cookie) || !cookie.session.value) {
        return redirect(`${Bun.env.FRONTEND_URL}/`);
    }

    const token: { id: string } = jwt.verify(cookie.session.value!.toString(), Bun.env.JWT_SECRET!) as any;

    // Make sure user exists
    const user = await User.findById(token.id).lean();
    if (user) {
        const dodo_session = await DodoPayClient.checkoutSessions.create({
            product_cart: [
                {
                    product_id: Bun.env.DODO_PAYMENTS_PRODUCT_ID!,
                    quantity: 1
                }
            ],
            metadata: {
                userID: user._id?.toString() as string
            },
            return_url: `${Bun.env.FRONTEND_URL}/premium`,
            discount_code: null
        });

        return redirect(dodo_session.checkout_url);
    } else {
        return redirect(`${Bun.env.FRONTEND_URL}/`);
    }
});