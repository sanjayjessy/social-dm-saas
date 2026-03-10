import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { RESEND_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, APP_NAME } = process.env;
    const fromAddress = FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = APP_NAME || 'ClickMyChat';

    // 1️⃣ Try Brevo (Sendinblue) API First (Best for Render & Free Tier)
    if (process.env.BREVO_API_KEY) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromAddress // Important: must be your verified Brevo email 
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("❌ Brevo API error:", data);
        return { success: false, error: data };
      }
      console.log("✅ Email sent via Brevo. ID:", data.messageId);
      return { success: true, messageId: data.messageId };
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
