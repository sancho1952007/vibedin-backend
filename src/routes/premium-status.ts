import { Elysia, t } from 'elysia';
import jwt from 'jsonwebtoken';
import PremiumUser from '../models/premium-users';

export default new Elysia().post('/premium-status', async ({ cookie }) => {
    const token: { id: string } = jwt.verify(cookie['vibedin-session'].value!.toString(), Bun.env.JWT_SECRET!) as any;
    const user = await PremiumUser.findById(token.id).lean();
    if (user) {
        return {
            success: true,
            status: user.status,
            premiumSince: user.createdAt,
            nextBillingDate: user.nextPayment
        };
    } else {
        return { success: false, error: "You are not yet a premium user!" };
    }
}, {
    cookie: t.Object({
        'vibedin-session': t.String()
    })
});