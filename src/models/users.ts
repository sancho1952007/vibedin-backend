import mongoose from "mongoose";

const User = mongoose.model('users', new mongoose.Schema({
    _id: String,
    email: String,
    username: { type: String, unique: true },
    name: String,
    bio: { type: String, default: '' },
    pfp: { type: String, default: '/images/default-pfp.png' },
    // VibedIn tier
    tier: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
    },
    createdAt: { type: Date, default: Date.now },
    tags: { type: [String], default: [] },
    isVisible: { type: Boolean, default: true },
    lastLogin: { type: Date, default: Date.now },
}));

export default User;