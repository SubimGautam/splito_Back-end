import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '') || '';
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:3000'; // Add this to .env

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: emailPass,
  },
});

export async function sendResetCode(email: string, code: string) {
  console.log('='.repeat(50));
  console.log('📧 SENDING RESET CODE EMAIL');
  console.log('='.repeat(50));
  console.log('To:', email);
  console.log('Code:', code);

  // Create a web link that will open the verify code page with email prefilled
  const verifyLink = `${webAppUrl}/authentication/verify-code?email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: `"Splito App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Code - Splito',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background-color: #22D3EE; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Splito</h1>
          </div>
          
          <!-- Body -->
          <div style="padding: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Code</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You recently requested to reset your password for your Splito account. 
              Use the 6-digit code below to reset your password. This code will expire in 10 minutes.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f0f0f0; padding: 20px; border-radius: 10px; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #22D3EE;">
                ${code}
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background-color: #22D3EE; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Enter Code Online
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">
              If you didn't request this, please ignore this email and your password will remain unchanged.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Splito. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    console.log('📧 Attempting to send reset code email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Reset code email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending reset code email:');
    console.error(error);
    throw error;
  }
}