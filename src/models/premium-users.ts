import mongoose from "mongoose";

const PremiumUser = mongoose.model('premium-users', new mongoose.Schema({
    _id: String,
    createdAt: { type: Date, default: Date.now },
    subscription_id: String,
    nextPayment: Date,
    status: {
        type: String,
        enum: ['active', 'cancelled', 'on_hold']
    },
    statusUpdatedAt: { type: Date, default: Date.now },
}));

export default PremiumUser;