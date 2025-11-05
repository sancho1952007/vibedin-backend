import Elysia from "elysia";
import jwt from "jsonwebtoken";
import User from "../models/users";

export default new Elysia().post('/me', async ({ cookie }) => {
    if (cookie.session.value) {
        const token: { id: string } = jwt.verify(cookie.session.value.toString(), Bun.env.JWT_SECRET!) as any;
        const user = await User.findById(token.id).select('-__v -oauth').lean();
        // Just in case
        if (!user) {
            return { success: false, loggedIn: false, error: "User not found" };
        }
        return { success: true, loggedIn: true, user: user };
    } else {
        return { success: true, loggedIn: false };
    }
});