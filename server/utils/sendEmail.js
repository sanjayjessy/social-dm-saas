import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { RESEND_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, APP_NAME } = process.env;
    const fromAddress = FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = APP_NAME || 'ClickMyChat';

    // 1️⃣ Try SendGrid API First (Best for Free Tier / Verified Gmail Sender)
    if (process.env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: { email: fromAddress, name: fromName },
          subject: subject,
          content: [{ type: 'text/html', value: html }]
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error("❌ SendGrid API error:", data);
        return { success: false, error: data };
      }

      console.log("✅ Email sent via SendGrid!");
      return { success: true, messageId: "sendgrid-" + Date.now() };
    }

    // 2️⃣ Fallback to SMTP/Gmail (Works on Localhost, blocked on Render Free)
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false }
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        html,
      });

      console.log("✅ Email sent via SMTP. ID:", info.messageId);
      return { success: true, messageId: info.messageId };
    }

    // 3️⃣ No Credentials Configured
    console.warn("\n⚠️ No Email Provider (Resend or SMTP) configured in .env.");
    console.warn("⚠️ Bypassing email transport and dumping to console:");
    console.warn("==================================================");
    console.warn("TO:", to);
    console.warn("SUBJECT:", subject);
    console.warn("HTML PAYLOAD:\n", html);
    console.warn("==================================================\n");
    return { success: true, bypassed: true };

  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error };
  }
};

export default sendEmail;
