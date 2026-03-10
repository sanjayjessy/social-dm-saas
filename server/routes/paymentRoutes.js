import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Workspace from '../models/Workspace.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Initialize Razorpay
const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_SP3LhW2kGpk37Y',
        key_secret: process.env.RAZORPAY_KEY_SECRET || 'iOnIx9loQrfGMjONKf62Z7pG'
    });
};

// Create Order Route
router.post('/create-order', protect, async (req, res) => {
    try {
        const { planType, amount } = req.body;
        const userId = req.user._id;
        const workspaceId = req.user.workspaceId;

        if (!workspaceId) {
            return res.status(400).json({ success: false, message: 'Workspace not found for user' });
        }

        // Check if user already has Growth plan
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found' });
        }

        if (workspace.plan === 'growth') {
            if (workspace.billingCycle === 'yearly') {
                return res.status(400).json({ success: false, message: 'Workspace is already on the yearly growth plan.' });
            }
            if (workspace.billingCycle === 'monthly' && (planType === 'monthly' || planType === 'growth')) {
                return res.status(400).json({ success: false, message: 'Workspace is already on the monthly growth plan.' });
            }
            // Allow monthly to yearly upgrade
        }

        const razorpay = getRazorpayInstance();

        const options = {
            amount: amount * 100, // Amount is strictly in paise
            currency: 'INR',
            receipt: `receipt_order_${workspaceId.toString().substring(0, 10)}`
        };

        const order = await razorpay.orders.create(options);

        // Store payment intention
        const payment = new Payment({
            workspaceId,
            userId,
            orderId: order.id,
            amount: amount,
            status: 'created',
            planType: planType || 'growth'
        });
        await payment.save();

        res.status(200).json({
            success: true,
            message: 'Order created',
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency
            }
        });
    } catch (error) {
        console.error('Error in create-order:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Verify Payment Route
router.post('/verify', protect, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify the signature
        const secret = process.env.RAZORPAY_KEY_SECRET || 'iOnIx9loQrfGMjONKf62Z7pG';

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        const isSignatureValid = expectedSignature === razorpay_signature;

        if (!isSignatureValid) {
            // Update payment record to failed
            await Payment.findOneAndUpdate(
                { orderId: razorpay_order_id },
                { status: 'failed', paymentId: razorpay_payment_id }
            );

            return res.status(400).json({ success: false, message: 'Invalid payment signature. Payment failed.' });
        }

        // Signature is valid, secure to update DB
        const payment = await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id },
            { status: 'paid', paymentId: razorpay_payment_id },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found internally.' });
        }

        const cycle = payment.planType === 'yearly' ? 'yearly' : 'monthly';

        const workspace = await Workspace.findById(payment.workspaceId);
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Workspace for payment not found.' });
        }

        let remainingDays = 0;
        const now = new Date();

        // If upgrading from monthly to yearly, calculate remaining days
        if (workspace.plan === 'growth' && workspace.billingCycle === 'monthly' && cycle === 'yearly') {
            if (workspace.billingCycleEnd && workspace.billingCycleEnd > now) {
                const diffTime = workspace.billingCycleEnd - now;
                remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        const calculatedEndDate = new Date(now);
        if (cycle === 'yearly') {
            calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
        } else {
            calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
        }

        if (remainingDays > 0) {
            calculatedEndDate.setDate(calculatedEndDate.getDate() + remainingDays);
        }

        // Update the workspace to the Growth plan
        await Workspace.findByIdAndUpdate(payment.workspaceId, {
            plan: 'growth',
            billingCycle: cycle,
            billingCycleStart: now,
            billingCycleEnd: calculatedEndDate
        });

        res.status(200).json({
            success: true,
            message: 'Payment verified and workspace upgraded successfully.',
            data: { paymentId: razorpay_payment_id }
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error during verification' });
    }
});

export default router;
