import Elysia, { redirect, t } from "elysia";
import User from "../models/users";
import UserAnalytic from "../models/user-analytics";

export default new Elysia().get('/go/:username', async ({ params }) => {
    const user = await User.findOne({ username: params.username });

    // Only allow premium users to access this route
    if (!user || user.tier !== 'premium') {
        return redirect(Bun.env.FRONTEND_URL!);
    }

    await new UserAnalytic({
        type: 'click',
        userId: user._id
    }).save();

    return redirect('https://x.com/' + params.username);
}, {
    params: t.Object({
        username: t.String()
    })
});