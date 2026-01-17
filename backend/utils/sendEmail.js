const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Use environment variables for SMTP config
    // For dev, we can use Ethereal or just log
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html, // Optional HTML support
    };

    const info = await transporter.sendMail(message);
};

module.exports = sendEmail;
