import nodemailer from "nodemailer";

export async function sendEmail(recipient: string, subject: string, message: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: recipient,
    subject,
    text: message
  });
}

async function sendTwilioMessage(
  from: string,
  to: string,
  body: string
) {
  const credentials = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio delivery failed: ${await response.text()}`);
  }
}

export async function sendSms(recipient: string, message: string) {
  await sendTwilioMessage(process.env.TWILIO_SMS_FROM!, recipient, message);
}

export async function sendWhatsapp(recipient: string, message: string) {
  await sendTwilioMessage(process.env.TWILIO_WHATSAPP_FROM!, recipient, message);
}
