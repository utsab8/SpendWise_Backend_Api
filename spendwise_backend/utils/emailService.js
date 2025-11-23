// utils/emailService.js - UPDATED WITH IMPROVED TIMEOUT HANDLING
import nodemailer from 'nodemailer';

// Create email transporter with error checking and optimized settings
const createTransporter = () => {
  console.log('📧 Creating email transporter...');
  
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('\n❌ CRITICAL: Email credentials not configured!');
    console.error('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.error('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'SET (hidden)' : 'NOT SET');
    console.error('\n💡 SOLUTION:');
    console.error('1. Go to https://myaccount.google.com/apppasswords');
    console.error('2. Generate a new App Password for "Mail"');
    console.error('3. Set EMAIL_USER and EMAIL_APP_PASSWORD in your .env file');
    console.error('4. Make sure 2-Factor Authentication is enabled on Gmail\n');
    throw new Error('Email service not configured. Check EMAIL_USER and EMAIL_APP_PASSWORD in environment variables.');
  }

  console.log('✅ Email credentials found');
  console.log(`📧 Email User: ${process.env.EMAIL_USER}`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    // Optimized timeout settings
    connectionTimeout: 30000, // 30 seconds connection timeout
    greetingTimeout: 20000, // 20 seconds greeting timeout
    socketTimeout: 30000, // 30 seconds socket timeout
    // Additional settings for better reliability
    pool: false, // Disable connection pooling for simpler debugging
    maxConnections: 1,
    maxMessages: 1,
    rateDelta: 1000,
    rateLimit: 1
  });

  console.log('✅ Email transporter created');
  return transporter;
};

// Test email connection
export const testEmailConnection = async () => {
  try {
    console.log('\n🧪 Testing email connection...');
    const transporter = createTransporter();
    
    console.log('📡 Verifying SMTP connection...');
    await transporter.verify();
    
    console.log('✅ Email connection verified successfully!\n');
    return { 
      success: true, 
      message: 'Email service is working correctly',
      config: {
        service: 'gmail',
        user: process.env.EMAIL_USER
      }
    };
  } catch (error) {
    console.error('\n❌ Email connection test FAILED');
    console.error('Error:', error.message);
    console.error('Error Code:', error.code);
    
    // Provide specific error messages based on error type
    let troubleshootingTips = [];
    
    if (error.message.includes('Invalid login') || error.code === 'EAUTH') {
      troubleshootingTips = [
        '❌ Authentication failed',
        '💡 Make sure EMAIL_APP_PASSWORD is a Gmail App Password (16 characters)',
        '💡 NOT your regular Gmail password',
        '💡 Enable 2-Factor Authentication on Gmail',
        '💡 Generate new App Password at: https://myaccount.google.com/apppasswords'
      ];
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      troubleshootingTips = [
        '❌ Connection timeout',
        '💡 Check your internet connection',
        '💡 Gmail SMTP might be blocked by firewall',
        '💡 Try using a different network'
      ];
    } else if (error.code === 'ENOTFOUND') {
      troubleshootingTips = [
        '❌ Cannot reach Gmail SMTP server',
        '💡 Check DNS settings',
        '💡 Verify internet connection'
      ];
    } else {
      troubleshootingTips = [
        '❌ Unknown error occurred',
        '💡 Check all environment variables',
        '💡 Verify Gmail account is active'
      ];
    }
    
    troubleshootingTips.forEach(tip => console.error(tip));
    console.error('');
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      troubleshooting: troubleshootingTips
    };
  }
};

// Send OTP Email with improved timeout handling
export const sendOTPEmail = async (email, otp) => {
  console.log('\n' + '='.repeat(70));
  console.log('📧 SENDING OTP EMAIL');
  console.log('='.repeat(70));
  console.log(`📬 To: ${email}`);
  console.log(`🔢 OTP: ${otp}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  try {
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
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .email-wrapper {
              background: white;
              border-radius: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
              margin: 10px 0 0 0;
            }
            .header-icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .description {
              font-size: 15px;
              color: #666;
              margin-bottom: 30px;
              line-height: 1.8;
            }
            .otp-box {
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border: 3px dashed #6D28D9;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
              border-radius: 12px;
            }
            .otp-label {
              font-size: 13px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .otp-code {
              font-size: 48px;
              font-weight: 800;
              color: #6D28D9;
              letter-spacing: 12px;
              font-family: 'Courier New', Consolas, monospace;
              margin: 15px 0;
              text-shadow: 2px 2px 4px rgba(109, 40, 217, 0.1);
            }
            .otp-validity {
              font-size: 13px;
              color: #999;
              margin-top: 15px;
              font-weight: 500;
            }
            .warning {
              background: linear-gradient(to right, #fff3cd, #fff8e1);
              border-left: 5px solid #ffc107;
              padding: 20px 25px;
              margin: 30px 0;
              border-radius: 8px;
            }
            .warning strong {
              color: #856404;
              display: block;
              margin-bottom: 12px;
              font-size: 16px;
            }
            .warning ul {
              margin: 15px 0 0 20px;
              padding: 0;
              color: #856404;
            }
            .warning li {
              margin: 10px 0;
              font-size: 14px;
              line-height: 1.6;
            }
            .closing {
              font-size: 15px;
              color: #666;
              margin-top: 30px;
              line-height: 1.8;
            }
            .signature {
              color: #6D28D9;
              font-weight: 600;
              margin-top: 15px;
              font-size: 16px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 25px 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
            .footer p {
              margin: 8px 0;
              line-height: 1.6;
            }
            .footer a {
              color: #6D28D9;
              text-decoration: none;
            }
            @media only screen and (max-width: 600px) {
              .container { padding: 10px; }
              .header { padding: 30px 20px; }
              .header h1 { font-size: 24px; }
              .content { padding: 30px 20px; }
              .otp-code { font-size: 36px; letter-spacing: 8px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-wrapper">
              <div class="header">
                <div class="header-icon">🔐</div>
                <h1>Password Reset Request</h1>
              </div>
              
              <div class="content">
                <p class="greeting">Hello,</p>
                
                <p class="description">
                  You have requested to reset your password for your <strong>SpendWise</strong> account. 
                  Please use the One-Time Password (OTP) below to proceed with your password reset.
                </p>
                
                <div class="otp-box">
                  <div class="otp-label">Your One-Time Password</div>
                  <div class="otp-code">${otp}</div>
                  <div class="otp-validity">⏱️ Valid for 10 minutes only</div>
                </div>

                <div class="warning">
                  <strong>⚠️ Security Notice</strong>
                  <ul>
                    <li>✓ <strong>Never share</strong> this OTP with anyone, including SpendWise support</li>
                    <li>✓ SpendWise will <strong>never ask</strong> for your OTP via phone or email</li>
                    <li>✓ This code <strong>expires in 10 minutes</strong> for your security</li>
                    <li>✓ If you <strong>didn't request</strong> this reset, please ignore this email and secure your account</li>
                  </ul>
                </div>

                <p class="closing">
                  If you're having trouble resetting your password or didn't request this change, 
                  please contact our support team immediately to secure your account.
                </p>
                
                <p class="closing">
                  Best regards,<br>
                  <span class="signature">The SpendWise Team</span>
                </p>
              </div>
              
              <div class="footer">
                <p><strong>This is an automated email. Please do not reply to this message.</strong></p>
                <p>© ${new Date().getFullYear()} SpendWise. All rights reserved.</p>
                <p>Questions? Visit our <a href="#">support center</a> or contact <a href="mailto:support@spendwise.com">support@spendwise.com</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📤 Sending email via SMTP...');
    console.log(`🎯 SMTP Server: smtp.gmail.com:587`);
    
     // Create timeout promise (8 seconds - very fast response)
     const timeoutPromise = new Promise((_, reject) => {
       setTimeout(() => {
         const timeoutError = new Error('Email sending timeout - SMTP connection took too long');
         timeoutError.code = 'ETIMEDOUT';
         reject(timeoutError);
       }, 8000); // 8 seconds - respond very quickly
     });
     
     // Race between actual email sending and timeout
     const info = await Promise.race([
       transporter.sendMail(mailOptions),
       timeoutPromise
     ]);
    
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📊 Response: ${info.response}`);
    console.log('='.repeat(70) + '\n');
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    };

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ EMAIL SENDING FAILED');
    console.error('='.repeat(70));
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Code: ${error.code || 'UNKNOWN'}`);
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error('='.repeat(70));
    
    // Provide detailed troubleshooting based on error type
    if (error.message.includes('Invalid login') || error.code === 'EAUTH') {
      console.error('\n💡 AUTHENTICATION ERROR - SOLUTIONS:');
      console.error('1. Verify EMAIL_APP_PASSWORD is a Gmail App Password (16 chars)');
      console.error('2. NOT your regular Gmail password');
      console.error('3. Generate new: https://myaccount.google.com/apppasswords');
      console.error('4. Ensure 2-Factor Authentication is enabled on Gmail');
      console.error('5. Update EMAIL_APP_PASSWORD in Render environment variables');
      console.error('6. Wait 5-10 minutes after creating App Password\n');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error('\n💡 TIMEOUT ERROR - SOLUTIONS:');
      console.error('1. Gmail SMTP server is slow or unreachable');
      console.error('2. Check internet connection on server');
      console.error('3. Verify firewall is not blocking port 587');
      console.error('4. Try again - SMTP might be temporarily unavailable');
      console.error('5. Consider using alternative email service (SendGrid, Mailgun)\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 CONNECTION REFUSED - SOLUTIONS:');
      console.error('1. SMTP server refused connection');
      console.error('2. Check if Gmail SMTP is blocked by firewall');
      console.error('3. Verify server can reach smtp.gmail.com:587\n');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DNS ERROR - SOLUTIONS:');
      console.error('1. Cannot resolve smtp.gmail.com');
      console.error('2. Check DNS settings on server');
      console.error('3. Verify internet connection\n');
    } else {
      console.error('\n💡 UNKNOWN ERROR - Try:');
      console.error('1. Check all environment variables');
      console.error('2. Verify Gmail account is active');
      console.error('3. Test with: /api/auth/test-email\n');
    }
    
     // Return error details but don't throw (let controller handle it)
     // This ensures the controller can still respond successfully even if email fails
     return { 
       success: false, 
       error: error.message || 'Email sending failed',
       code: error.code || 'UNKNOWN',
       timestamp: new Date().toISOString()
     };
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
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
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
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 { font-size: 32px; margin: 10px 0; }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #6D28D9;
              margin-top: 30px;
            }
            .feature-list {
              list-style: none;
              padding: 0;
            }
            .feature-list li {
              padding: 12px 0;
              font-size: 16px;
            }
            .cta-button {
              display: inline-block;
              padding: 15px 30px;
              background: linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              background-color: #f9fafb;
              padding: 25px 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
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
                <p style="font-size: 18px;">Hi <strong>${fullName}</strong>,</p>
                <p>Thank you for joining <strong>SpendWise</strong>! We're thrilled to have you on board and excited to help you take control of your finances.</p>
                
                <h2>With SpendWise, you can:</h2>
                <ul class="feature-list">
                  <li>📊 Track your expenses in real-time</li>
                  <li>💰 Set and manage budgets effortlessly</li>
                  <li>📈 View detailed spending reports and insights</li>
                  <li>🎯 Achieve your financial goals faster</li>
                  <li>🔔 Get smart notifications and reminders</li>
                </ul>
                
                <p style="margin-top: 30px;">Ready to get started?</p>
                <a href="#" class="cta-button">Open SpendWise App</a>
                
                <p style="margin-top: 30px; color: #666;">
                  If you have any questions or need help getting started, our support team is here for you!
                </p>
                
                <p style="margin-top: 20px;">Best regards,<br><strong style="color: #6D28D9;">The SpendWise Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} SpendWise. All rights reserved.</p>
                <p>Questions? Contact us at support@spendwise.com</p>
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