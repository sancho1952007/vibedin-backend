import { Elysia, t } from "elysia";
import UserAnalytics from "../models/user-analytics";
import { SHA256 } from "bun";
import client from "../utils/redis-client";
import User from "../models/users";

export default new Elysia().post('/record-impression', async ({ body, set, headers }) => {
    const user = await User.findOne({ username: body.username });
    if (user && user.tier === 'premium') {

        // Prevent multiple impressions from the same IP being recorded within a short time frame
        const IPAddress = headers['CF-Connecting-IP'] || headers['X-Forwarded-For'] || '';
        let IPHash = await client.get(`iphash:${IPAddress}`);
        if (!IPHash) {
            IPHash = SHA256.hash(Bun.env.IP_SALT_0 + IPAddress + Bun.env.IP_SALT_1, 'hex');
            // Store the hash in Redis for 5 minutes to reduce computation on repeat impressions as well as withold data protection laws
            await client.set(`iphash:${IPAddress}`, IPHash, 'EX', 300);
        }

        await UserAnalytics.updateOne({
            userId: user._id,
            type: 'imp',
            // The reason we hash the IP is to avoid storing PII while still being able to identify unique impressions
            hash: IPHash
        }, {}, {
            upsert: true,
        });

        return { success: true };
    } else {
        set.status = 403;
        return { success: false, error: "User is not a premium user" };
    }
}, {
    body: t.Object({
        username: t.String()
    })
});