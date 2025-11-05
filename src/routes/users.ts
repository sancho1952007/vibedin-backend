import Elysia, { t } from "elysia";
import Users from "../models/users";

export default new Elysia().post('/users', async () => {
    await Users.findById('/');
}, {
    query: t.Object({
        sortBy: t.Optional(t.UnionEnum(['relevance', 'latest', 'popularity'])),
    }),
    detail: {
        description: 'Get users'
    }
});