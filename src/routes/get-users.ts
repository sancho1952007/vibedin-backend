import { Elysia, t } from 'elysia';
import User from '../models/users';

export default new Elysia().post('/get-users', async ({ body }) => {
    const page = Math.max(1, body.page || 1);
    const q = (body.query || '').trim();

    // escape regex special chars to avoid accidental regex injection
    const escapeForRegex = (s: string) =>
        s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const matchStage: any = {
        $match: {
            isVisible: true,
            ...(body.premiumOnly ? { tier: 'premium' } : {})
        }
    };

    // Always add isPremium flag so premium can be prioritized
    const addIsPremium = {
        $addFields: {
            isPremium: { $cond: [{ $eq: ['$tier', 'premium'] }, 1, 0] }
        }
    };

    const pipeline: any[] = [matchStage, { $sort: { createdAt: -1 } }, addIsPremium];

    if (q) {
        const escaped = escapeForRegex(q);

        pipeline.push({
            // count how many tags match the query (partial, case-insensitive)
            $addFields: {
                tagMatchCount: {
                    $size: {
                        $filter: {
                            input: '$tags',
                            as: 't',
                            cond: { $regexMatch: { input: '$$t', regex: escaped, options: 'i' } }
                        }
                    }
                },
                bioMatch: {
                    $cond: [{ $regexMatch: { input: '$bio', regex: escaped, options: 'i' } }, 1, 0]
                },
                nameMatch: {
                    $cond: [{ $regexMatch: { input: '$name', regex: escaped, options: 'i' } }, 1, 0]
                },
                usernameMatch: {
                    $cond: [{ $regexMatch: { input: '$username', regex: escaped, options: 'i' } }, 1, 0]
                }
            }
        });

        pipeline.push({
            // compute weighted relevance score. Increase or decrease weights as needed.
            $addFields: {
                relevanceScore: {
                    $add: [
                        { $multiply: ['$tagMatchCount', 5] }, // tags are most important — change 5 to tune
                        '$bioMatch',                         // bio partial match (1 point)
                        '$nameMatch',                        // name match (1 point)
                        '$usernameMatch'                     // username match (1 point)
                    ]
                }
            }
        });
    } else {
        // ensure field exists even when no query (helps stable pipeline if sortBy === 'relevance')
        pipeline.push({
            $addFields: { relevanceScore: 0, tagMatchCount: 0, bioMatch: 0, nameMatch: 0, usernameMatch: 0 }
        });
    }

    // Sorting
    if (body.sortBy === 'relevance' && q) {
        pipeline.push({
            $sort: {
                relevanceScore: -1,   // highest relevance first
                isPremium: -1,        // premium users preferred among equal relevance
                createdAt: -1
            }
        });
    } else {
        // newest (or relevance requested but no query) -> fallback to newest with premium preference
        pipeline.push({
            $sort: {
                isPremium: -1,
                createdAt: -1
            }
        });
    }

    pipeline.push(
        { $skip: 20 * (page - 1) },
        { $limit: 20 },
        {
            $project: {
                _id: 0,
                name: 1,
                username: 1,
                pfp: 1,
                tier: 1,
                bio: 1,
                tags: 1,
                relevanceScore: 1,   // helpful for debugging on client
                tagMatchCount: 1
            }
        }
    );

    const users = await User.aggregate(pipeline);

    return { success: true, users };
}, {
    body: t.Object({
        page: t.Number(),
        premiumOnly: t.Boolean(),
        sortBy: t.Union([t.Literal('relevance'), t.Literal('newest')]),
        // allow empty string if user didn't search
        query: t.Optional(t.String())
    })
});
