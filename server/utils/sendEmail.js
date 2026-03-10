import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;

    // Local dev fallback if no SMTP configured
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn("\n⚠️ SMTP credentials not found in environment variables.");
      console.warn("⚠️ Bypassing email transport and dumping to console:");
      console.warn("==================================================");
      console.warn("TO:", to);
      console.warn("SUBJECT:", subject);
      console.warn("HTML PAYLOAD:\n", html);
      console.warn("==================================================\n");
      return { success: true, bypassed: true };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      connectionTimeout: 10000,  // 10s to connect
      greetingTimeout: 10000,    // 10s for SMTP greeting
      socketTimeout: 15000,      // 15s for socket inactivity
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'ClickMyChat'}" <${FROM_EMAIL || SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};

export default sendEmail;
