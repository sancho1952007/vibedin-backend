import Elysia, { redirect, t } from "elysia";
import User from "../models/users";
import UserAnalytic from "../models/user-analytics";
import client from "../utils/redis-client";
import { SHA256 } from "bun";

export default new Elysia().get('/go/:username', async ({ params, headers }) => {
    const user = await User.findOne({ username: params.username });

    // Only allow premium users to access this route
    if (!user || user.tier !== 'premium') {
        return redirect(Bun.env.FRONTEND_URL!);
    }

    // Prevent multiple clicks from the same IP being recorded within a short time frame
    const IPAddress = headers['CF-Connecting-IP'] || headers['X-Forwarded-For'] || '';
    let IPHash = await client.get(`iphash:${IPAddress}`);
    if (!IPHash) {
        IPHash = SHA256.hash(Bun.env.IP_SALT_0 + IPAddress + Bun.env.IP_SALT_1, 'hex');
        // Store the hash in Redis for 5 minutes to reduce computation on repeat impressions as well as withold data protection laws
        await client.set(`iphash:${IPAddress}`, IPHash, 'EX', 300);
    }

    await UserAnalytic.updateOne({
        type: 'click',
        // The reason we hash the IP is to avoid storing PII while still being able to identify unique impressions
        hash: IPHash,
        userId: user._id
    }, {}, {
        upsert: true,
    });

    return redirect('https://x.com/' + params.username);
}, {
    params: t.Object({
        username: t.String()
    })
});