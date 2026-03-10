import dotenv from 'dotenv';

dotenv.config();

const testResend = async () => {
    const { RESEND_API_KEY } = process.env;

    if (!RESEND_API_KEY) {
        console.log("❌ RESEND_API_KEY is not set in your local .env file. Please add it to test.");
        return;
    }

    console.log("Testing Resend API with key:", RESEND_API_KEY.substring(0, 8) + '...');

    // Change this to the email you used to register on Resend
    const toEmail = "sanjaypbiz15@gmail.com";

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `Test <onboarding@resend.dev>`,
                to: [toEmail],
                subject: 'Test Email from Resend API',
                html: '<p>If you get this, Resend is working!</p>',
            }),
        });

        const data = await response.json();
        console.log("API Status:", response.status);
        console.log("API Response:", data);

        if (response.ok) {
            console.log("✅ SUCCESS! Email sent to", toEmail);
        } else {
            console.log("❌ FAILED! Resend rejected the email.");
            if (data.name === 'validation_error' && data.message.includes('can only send testing emails to its own email address')) {
                console.log("\n⚠️ REASON: On Resend's free plan, you can ONLY send emails TO the email address you used to sign up for Resend.");
                console.log("To send to anyone else, you must verify your own custom domain in Resend dashboard.");
            }
        }
    } catch (err) {
        console.error("Error connecting to Resend:", err);
    }
};

testResend();
