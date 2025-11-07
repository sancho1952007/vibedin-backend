import mongoose from "mongoose";

const UserAnalytic = mongoose.model('user-analytics', new mongoose.Schema({
    type: { type: String, enum: ['click', 'imp'] },
    hash: String,
    userId: String,
    at: { type: Date, default: Date.now }
}, {
    strict: "throw"
}));

export default UserAnalytic;