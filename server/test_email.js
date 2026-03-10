import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;

console.log('=== ENV CHECK ===');
console.log('SMTP_HOST:', SMTP_HOST);
console.log('SMTP_PORT:', SMTP_PORT);
console.log('SMTP_USER:', SMTP_USER);
console.log('SMTP_PASS:', SMTP_PASS ? `✅ SET (${SMTP_PASS.length} chars)` : '❌ MISSING');
console.log('FROM_EMAIL:', FROM_EMAIL);
console.log('=================\n');

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

console.log('Verifying SMTP connection...');
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection Failed:', error.message);
        console.error('\nFull error:', error);
    } else {
        console.log('✅ SMTP Connection Successful! Sending test email...');

        transporter.sendMail({
            from: `"${process.env.APP_NAME || 'Test'}" <${FROM_EMAIL || SMTP_USER}>`,
            to: SMTP_USER, // send to yourself
            subject: 'ClickMyChat - Test Email ✅',
            html: '<h2>Email is working!</h2><p>Your SMTP configuration is correct.</p>',
        }, (err, info) => {
            if (err) {
                console.error('❌ Send failed:', err.message);
            } else {
                console.log('✅ Email sent! Message ID:', info.messageId);
                console.log('Check your inbox at:', SMTP_USER);
            }
        });
    }
});
