import mongoose from "mongoose";

const UserAnalytic = mongoose.model('user-analytics', new mongoose.Schema({
    type: { type: String, enum: ['click'] },
    userId: String,
    at: { type: Date, default: Date.now }
}));

export default UserAnalytic;