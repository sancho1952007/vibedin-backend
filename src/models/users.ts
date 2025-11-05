import mongoose from "mongoose";

const User = mongoose.model('users', new mongoose.Schema({
    _id: String,
    email: String,
    username: String,
    name: String,
    bio: { type: String, default: '' },
    pfp: { type: String, default: '/images/default-pfp.png' },
    // Vibrix tier
    tier: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
    },
    createdAt: { type: Date, default: Date.now },
    tags: { type: [String], default: [] },
    isVisible: { type: Boolean, default: true },
}));

export default User;