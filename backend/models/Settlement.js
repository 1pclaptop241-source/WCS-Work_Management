const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    payer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        default: 'INR',
    },
    type: {
        type: String,
        enum: ['editor_monthly_payout', 'client_payment'],
        required: true,
    },
    payments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
    }],
    status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'completed'],
        default: 'pending',
    },
    transactionDate: {
        type: Date,
        default: Date.now,
    },
    proofHash: {
        type: String, // Screenshot URL or Transaction ID
        default: '',
    },
    month: {
        type: String, // Format: "YYYY-MM"
        default: null,
    },
    notes: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Settlement', settlementSchema);
