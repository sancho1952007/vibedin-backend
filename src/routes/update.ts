import Elysia, { t } from "elysia";
import jwt from "jsonwebtoken";
import User from "../models/users";

export default new Elysia().post('/update', async ({ body, cookie: { session } }) => {
    const token: { id: string } = jwt.verify(session.value!.toString(), Bun.env.JWT_SECRET!) as any;
    const user = await User.findById(token.id);
    if (!user) {
        return { success: false, error: "User not found" };
    }

    user.bio = body.bio;
    user.tags = body.tags;
    user.isVisible = body.isVisible;

    await user.save();

    return { success: true };
}, {
    cookie: t.Object({ session: t.String() }),
    body: t.Object({
        bio: t.String({ minLength: 0, maxLength: 500 }),
        tags: t.Array(t.String()),
        isVisible: t.Boolean()
    })
});