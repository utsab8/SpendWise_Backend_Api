// spendwise_backend/utils/emailService.js - COMPLETE UPDATED VERSION
import nodemailer from 'nodemailer';

// Create email transporter with error checking
const createTransporter = () => {
  console.log('🔧 Creating email transporter...');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('❌ CRITICAL: Email credentials not configured!');
    console.error('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.error('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');
    throw new Error('Email service not configured. Check EMAIL_USER and EMAIL_APP_PASSWORD');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

  return transporter;
};

// Test email connection
export const testEmailConnection = async () => {
  try {
    console.log('🧪 Testing email connection...');
    const transporter = createTransporter();
    
    await transporter.verify();
    console.log('✅ Email connection verified successfully!');
    return { success: true, message: 'Email service is working' };
  } catch (error) {
    console.error('❌ Email connection test failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.error('💡 Tip: Check that EMAIL_APP_PASSWORD is a Gmail App Password, not your regular password');
    }
    
    return { success: false, error: error.message };
  }
};

// Send OTP Email
export const sendOTPEmail = async (email, otp) => {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📧 SENDING OTP EMAIL`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'SpendWise',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Password Reset OTP - SpendWise',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .email-wrapper {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 16px;
              color: #333;
              margin-bottom: 20px;
            }
            .description {
              font-size: 14px;
              color: #666;
              margin-bottom: 30px;
              line-height: 1.8;
            }
            .otp-box {
              background: linear-gradient(135deg, #f0f0f0 0%, #ffffff 100%);
              border: 2px dashed #6D28D9;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
              border-radius: 8px;
            }
            .otp-label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .otp-code {
              font-size: 40px;
              font-weight: 800;
              color: #6D28D9;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
              margin: 0;
            }
            .otp-validity {
              font-size: 12px;
              color: #999;
              margin-top: 10px;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .warning strong {
              color: #856404;
              display: block;
              margin-bottom: 10px;
            }
            .warning ul {
              margin: 10px 0 0 20px;
              padding: 0;
              color: #856404;
            }
            .warning li {
              margin: 8px 0;
              font-size: 13px;
            }
            .closing {
              font-size: 14px;
              color: #666;
              margin-top: 30px;
              line-height: 1.8;
            }
            .signature {
              color: #6D28D9;
              font-weight: 600;
              margin-top: 10px;
            }
            .footer {
              background-color: #f9f9f9;
              padding: 20px 30px;
              text-align: center;
              border-top: 1px solid #eee;
              font-size: 11px;
              color: #999;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-wrapper">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p class="greeting">Hello,</p>
                
                <p class="description">
                  You have requested to reset your password for your SpendWise account. 
                  Please use the OTP code below to proceed with your password reset.
                </p>
                
                <div class="otp-box">
                  <div class="otp-label">Your One-Time Password</div>
                  <p class="otp-code">${otp}</p>
                  <div class="otp-validity">⏱️ Valid for 10 minutes</div>
                </div>

                <div class="warning">
                  <strong>⚠️ Security Notice</strong>
                  <ul>
                    <li>✓ Never share this OTP with anyone</li>
                    <li>✓ SpendWise will never ask for your OTP</li>
                    <li>✓ This code expires in 10 minutes</li>
                    <li>✓ If you didn't request this, ignore this email</li>
                  </ul>
                </div>

                <p class="closing">
                  If you have any issues or didn't request this password reset, 
                  please contact our support team immediately.
                </p>
                
                <p class="closing">
                  Best regards,<br>
                  <span class="signature">SpendWise Team</span>
                </p>
              </div>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>&copy; 2025 SpendWise. All rights reserved.</p>
                <p>Questions? Visit our support center or contact help@spendwise.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📤 Attempting to send email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('='.repeat(60) + '\n');
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ EMAIL SENDING FAILED');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Timestamp:', new Date().toISOString());
    console.error('='.repeat(60));
    
    // Provide helpful debugging info based on error type
    if (error.message.includes('Invalid login') || error.code === 'EAUTH') {
      console.error('\n💡 AUTHENTICATION ERROR - Solutions:');
      console.error('1. Ensure EMAIL_APP_PASSWORD is a Gmail App Password');
      console.error('2. NOT your regular Gmail password');
      console.error('3. Go to: https://myaccount.google.com/apppasswords');
      console.error('4. Generate a NEW app password for Gmail');
      console.error('5. Update EMAIL_APP_PASSWORD in Render environment variables');
      console.error('6. Make sure 2FA is enabled on your Gmail account');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.error('\n💡 CONNECTION ERROR - Solutions:');
      console.error('1. Check your internet connection');
      console.error('2. Try using different SMTP settings');
      console.error('3. Verify Gmail SMTP is not blocked by firewall');
    } else if (error.message.includes('disabled')) {
      console.error('\n💡 GMAIL SECURITY ERROR - Solutions:');
      console.error('1. Enable 2-Step Verification on your Gmail account');
      console.error('2. Create an App Password at https://myaccount.google.com/apppasswords');
      console.error('3. Use the 16-character app password (without spaces)');
    }
    
    console.error('\n');
    throw error;
  }
};

// Send Welcome Email
export const sendWelcomeEmail = async (email, fullName) => {
  try {
    console.log(`\n📧 Sending welcome email to: ${email}`);
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'SpendWise',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Welcome to SpendWise! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .email-wrapper {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .content {
              padding: 40px 30px;
            }
            .footer {
              background-color: #f9f9f9;
              padding: 20px 30px;
              text-align: center;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-wrapper">
              <div class="header">
                <h1>🎉 Welcome to SpendWise!</h1>
              </div>
              <div class="content">
                <p>Hi ${fullName},</p>
                <p>Thank you for joining SpendWise! We're excited to help you manage your finances better.</p>
                
                <h3>With SpendWise, you can:</h3>
                <ul>
                  <li>📊 Track your expenses in real-time</li>
                  <li>💰 Set and manage budgets</li>
                  <li>📈 View detailed spending reports</li>
                  <li>🎯 Achieve your financial goals</li>
                </ul>
                
                <p>Get started by logging into your account and setting up your first budget!</p>
                <p>Best regards,<br><strong>SpendWise Team</strong></p>
              </div>
              <div class="footer">
                <p>&copy; 2025 SpendWise. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Welcome email failed:', error.message);
    return { success: false, error: error.message };
  }
};