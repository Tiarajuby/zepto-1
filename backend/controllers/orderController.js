const placeOrder = async (req, res) => {
    const frontend_url = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
        // Create new order in the database
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address
        });

        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        // Create Stripe line_items for each product
        const line_items = req.body.items.map((item) => ({
            price_data: {
                currency: "INR",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100  // Ensure price is in paise (₹500 becomes 50000 paise)
            },
            quantity: item.quantity
        }));

        // Add delivery charges as a separate item
        line_items.push({
            price_data: {
                currency: "INR",
                product_data: {
                    name: "Delivery Charges"
                },
                unit_amount: 20 * 100  // Delivery charge in paise (₹20)
            },
            quantity: 1
        });

        // Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: 'payment',  // One-time payment
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`
        });

        // Send session URL to the frontend
        res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};
