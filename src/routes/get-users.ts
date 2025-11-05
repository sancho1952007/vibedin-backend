import { Elysia, t } from 'elysia';
import User from '../models/users';

export default new Elysia().post('/get-users', async ({ body }) => {
    const users =
        await User.aggregate([
            {
                $match: {
                    isVisible: true,
                    ...(body.premiumOnly ? { tier: 'premium' } : {})
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $addFields: {
                    isPremium: { $cond: [{ $eq: ['$tier', 'premium'] }, 1, 0] }
                }
            },
            {
                $sort: {
                    ...body.sortBy === 'relevance' ? { isPremium: -1, createdAt: 1 } : {},
                    ...body.sortBy === 'newest' ? { createdAt: -1 } : {}
                }
            },
            { $skip: 20 * (body.page - 1) },
            { $limit: 20 },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    username: 1,
                    pfp: 1,
                    tier: 1,
                    bio: 1,
                    tags: 1
                }
            }
        ]);

    return { success: true, users: users };
}, {
    body: t.Object({
        page: t.Number(),
        premiumOnly: t.Boolean(),
        sortBy: t.Union([t.Literal('relevance'), t.Literal('newest')])
    })
});