import orderModel from './../models/orderModel.js';
import userModel from './../models/userModel.js';
import Razorpay from 'razorpay';

// Create an instance of Razorpay with your keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_m0QJH1ThRAhZUT',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'AH5sU4fBEfZIFZWJadrYeZIZ',
});

// Placing user order for frontend
const placeOrder = async (req, res) => {
    const frontend_url = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address
        });

        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        const totalAmount = req.body.amount * 100; // Razorpay expects the amount in paise (INR currency)

        // Create a Razorpay order
        const options = {
            amount: totalAmount, // amount in paise
            currency: 'INR',
            receipt: newOrder._id.toString(),
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: newOrder._id,
            razorpayOrderId: razorpayOrder.id,
            amount: totalAmount,
            currency: 'INR',
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error placing order" });
    }
};

// Verify Razorpay payment and update the order status
const verifyOrder = async (req, res) => {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    try {
        // Verify the payment signature using Razorpay SDK
        const crypto = await import('crypto');
        const body = orderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpaySignature) {
            // Payment is successful
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Payment successful" });
        } else {
            // Invalid payment signature, delete the order
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error verifying payment" });
    }
};

// User orders for frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching orders" });
    }
};

// Listing orders for admin panel
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching orders" });
    }
};

// API for updating order status
const updateStatus = async (req, res) => {
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
        res.json({ success: true, message: "Status updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error updating status" });
    }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
