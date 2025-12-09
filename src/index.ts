import { Elysia } from 'elysia';
import mongoose from 'mongoose';
import User from './models/users';
import { cors } from '@elysiajs/cors';
import { oauth2 } from "elysia-oauth2";
import jsonwebtoken from 'jsonwebtoken';
import client from './utils/redis-client';
import { OAuth2RequestError, ArcticFetchError } from "arctic";

const app = new Elysia();

app.onBeforeHandle(async ({ headers, set }) => {
    const ip = headers['CF-Connecting-IP'] || 'undefined';
    if (!ip) return;

    const key = `rate_limit:${ip}`;
    const limit = 50;
    const duration = 60; // 60 seconds

    const current = await client.incr(key);

    // Set expiry on first request
    if (current === 1) {
        await client.expire(key, duration);
    }

    if (current > limit) {
        set.status = 429;
        return { success: false, error: 'Too many requests' };
    }
});

app.use(cors({
    origin: Bun.env.FRONTEND_URL!,
    credentials: true
}));

app.use(
    oauth2(
        {
            Twitter: [
                Bun.env.X_CLIENT_ID!,
                Bun.env.X_CLIENT_SECRET!,
                `${Bun.env.API_URL}/auth/x/callback`
            ],
        },
    )
).get('/auth/x', async ({ oauth2 }) => {
    // Use tweet.read instead of users.read - more widely available
    return oauth2.redirect("Twitter", ["users.read", "tweet.read", "users.email"]);
}).get('/auth/x/callback', async ({ oauth2, query, set, cookie, redirect }) => {
    if (query.error) {
        console.error("OAuth error:", query.error, query.error_description);

        if (query.error === "access_denied") {
            return redirect(Bun.env.FRONTEND_URL!);
        }

        set.status = 400;
        return {
            success: false,
            error: query.error,
            description: query.error_description
        };
    }

    try {
        const tokens = await oauth2.authorize("Twitter");
        const accessToken = tokens.accessToken();
        const refreshToken = tokens.hasRefreshToken?.() ? tokens.refreshToken?.() : null;

        // Try the simpler endpoint first
        let userResponse = await fetch(
            "https://api.twitter.com/2/users/me?user.fields=confirmed_email,name,username,id,profile_image_url",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!userResponse.ok) {
            const error = await userResponse.text();
            console.error("Twitter API error:", userResponse.status, error);

            // Provide helpful error message
            let errorMessage = "Failed to fetch user data from Twitter!";
            if (userResponse.status === 403) {
                errorMessage = "Something went wrong on our end :(\n Please try again later!";
            }

            set.status = 500;
            return {
                success: false,
                error: errorMessage,
                details: error,
                status: userResponse.status
            };
        }

        const { data: user } = await userResponse.json();

        console.log(user);

        // Format user data with optional fields
        const userData = {
            id: user.id,
            email: user.confirmed_email || '',
            name: user.name,
            username: user.username
        };

        // Save to MongoDB with upsert to avoid duplicates
        await User.findByIdAndUpdate(userData.id, {
            email: userData.email,
            username: userData.username,
            name: userData.name,
            // Store the higher-res profile image url
            pfp: user.profile_image_url.replace('_normal', '_400x400'),
            refreshToken: refreshToken,
            lastLogin: new Date()
        }, { upsert: true, new: true });

        const token = jsonwebtoken.sign(
            {
                id: userData.id
            },
            Bun.env.JWT_SECRET!,
            {
                algorithm: 'HS256',
                expiresIn: '106d' // ~3.5 months
            });

        cookie['vibedin-session'].value = token;
        cookie['vibedin-session'].domain = Bun.env.COOKIE_DOMAIN!;
        cookie['vibedin-session'].secure = true;
        cookie['vibedin-session'].maxAge = 3 * (4 * 60 * 60 * 24 * 7); // 3 month expiry

        return redirect(`${Bun.env.FRONTEND_URL}/settings`);
    } catch (e) {
        console.error("Authorization error:", e);

        if (e instanceof OAuth2RequestError) {
            set.status = 400;
            return {
                success: false,
                error: "Invalid authorization",
                code: e.code,
                description: e.description
            };
        }

        if (e instanceof ArcticFetchError) {
            set.status = 500;
            return {
                success: false,
                error: "Network error connecting to Twitter"
            };
        }

        set.status = 500;
        return {
            success: false,
            error: e instanceof Error ? e.message : "Authentication failed"
        };
    }
});

// Connect to MongoDB
mongoose.connect(Bun.env.MONGODB_URL!, {
    dbName: 'test'
})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


app.get('/', () => {
    return "Hello From VibedIn Backend!";
});

app.use(import('./routes/go'));
app.use(import('./routes/me'));
app.use(import('./routes/update'));
app.use(import('./routes/get-users'));
app.use(import('./routes/premium-status'));
app.use(import('./routes/payment-webhook'));
app.use(import('./routes/purchase-premium'));
app.use(import('./routes/record-impression'));
app.use(import('./routes/retrive-analytics'));
app.use(import('./routes/cancel-subscription'));
app.use(import('./routes/uncancel-subscription'));

app.onError((err) => {
    if (err.code === 'VALIDATION') {
        return { success: false, error: 'Invalid request data' };
    } else if (err.code === 'NOT_FOUND') {
        return { success: false, error: 'Resource not found' };
    }

    // Store unhandled errors in Sentry only in production
    // if (Bun.env.NODE_ENV === 'production') {
    //     Sentry.captureException(err);
    // }

    console.error(err);
    return { success: false, error: 'Internal Server Error' };
});

app.listen(3000, () => {
    console.log('🚀 Server is running on http://localhost:3000');
});
