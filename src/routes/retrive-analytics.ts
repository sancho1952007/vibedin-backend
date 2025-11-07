import { Elysia, t } from "elysia";
import PremiumUser from "../models/premium-users";
import jwt from "jsonwebtoken";
import UserAnalytic from "../models/user-analytics";

export default new Elysia().post('/retrieve-analytics', async ({ body, cookie: { session } }) => {
    const token: { id: string } = jwt.verify(session.value!.toString(), Bun.env.JWT_SECRET!) as any;
    const user = await PremiumUser.findById(token.id);
    if (user) {
        const clicksCount = await UserAnalytic.find({
            type: 'click',
            userId: user._id,
            at: {
                $gte: new Date(body.startDate),
                $lte: new Date(body.endDate),
            }
        }).countDocuments();

        const impressionCount = await UserAnalytic.find({
            type: 'imp',
            userId: user._id,
            at: {
                $gte: new Date(body.startDate),
                $lte: new Date(body.endDate),
            }
        }).countDocuments();

        return {
            success: true,
            clicks: clicksCount,
            impressions: impressionCount
        }
    } else {
        return { success: false, error: "Premium user not found" };
    }
}, {
    body: t.Object({
        startDate: t.String(),
        endDate: t.String()
    }),
    cookie: t.Object({
        session: t.String()
    })
});