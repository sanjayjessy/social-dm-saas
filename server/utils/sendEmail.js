import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, APP_NAME } = process.env;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL || SMTP_USER}>`,
      to,
      subject,
      html
    });

    console.log("Email sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error("Email error:", error);
    return { success: false };
  }
};

export default sendEmail;