import dotenv from 'dotenv';

dotenv.config();

const testSendGrid = async () => {
    const { SENDGRID_API_KEY, FROM_EMAIL } = process.env;

    if (!SENDGRID_API_KEY) {
        console.log("❌ SENDGRID_API_KEY is not set in your local .env file. Please add it to test.");
        return;
    }

    console.log("Testing SendGrid API with key:", SENDGRID_API_KEY.substring(0, 8) + '...');

    const fromAddress = FROM_EMAIL || 'sanjaypbiz15@gmail.com';
    console.log("Using From Email:", fromAddress, "(This MUST be verified in SendGrid)");

    // Change this to the email you used to register
    const toEmail = "sanjaypbiz15@gmail.com";

    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{
                    to: [{ email: toEmail }]
                }],
                from: { email: fromAddress, name: 'ClickMyChat Test' },
                subject: 'Test Email from SendGrid API',
                content: [{ type: 'text/html', value: '<p>If you get this, SendGrid is working!</p>' }]
            }),
        });

        if (response.ok) {
            console.log("✅ SUCCESS! Email sent to", toEmail);
        } else {
            const data = await response.json();
            console.log("❌ FAILED! SendGrid rejected the email.");
            console.log("API Status:", response.status);
            console.log("Error Details:", JSON.stringify(data, null, 2));

            if (data.errors && data.errors[0].message.includes('The from address does not match a verified Sender Identity')) {
                console.log("\n⚠️ REASON: You have not verified the 'From' email address in SendGrid.");
                console.log("Go to SendGrid -> Settings -> Sender Authentication -> Verify a Single Sender.");
                console.log(`Make sure ${fromAddress} is verified!`);
            }
        }
    } catch (err) {
        console.error("Error connecting to SendGrid:", err);
    }
};

testSendGrid();
