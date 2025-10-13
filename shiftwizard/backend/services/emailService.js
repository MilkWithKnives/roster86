const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles all transactional emails for the platform
 */
class EmailService {
    constructor() {
        this.transporter = this.createTransporter();
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@shiftwizard.com';
        this.fromName = process.env.EMAIL_FROM_NAME || 'ShiftWizard';
        this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    }

    /**
     * Create email transporter based on environment
     */
    createTransporter() {
        if (process.env.NODE_ENV === 'production') {
            // Production: Use SendGrid, AWS SES, or other service
            if (process.env.SENDGRID_API_KEY) {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                return sgMail;
            }
            
            // Fallback to SMTP
            return nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD
                }
            });
        } else {
            // Development: Use Ethereal Email or console logging
            if (process.env.SMTP_HOST) {
                return nodemailer.createTransporter({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT || 587,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASSWORD
                    }
                });
            }
            
            // Fallback to console logging in development
            return {
                sendMail: async (options) => {
                    console.log('📧 Email would be sent:');
                    console.log('To:', options.to);
                    console.log('Subject:', options.subject);
                    console.log('Preview:', options.text?.substring(0, 200));
                    return { messageId: 'dev-' + Date.now() };
                }
            };
        }
    }

    /**
     * Send welcome email to new organization owner
     */
    async sendWelcomeEmail(options) {
        const {
            to,
            name,
            organizationName,
            verificationToken,
            planType,
            trialDays = 0
        } = options;

        const verificationUrl = `${this.baseUrl}/verify-email?token=${verificationToken}`;
        
        const subject = `Welcome to ShiftWizard, ${name}! 🎉`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                    .feature { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                    .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to ShiftWizard!</h1>
                        <p>Your employee scheduling just got a whole lot easier</p>
                    </div>
                    <div class="content">
                        <h2>Hi ${name},</h2>
                        <p>Congratulations on creating your ShiftWizard account for <strong>${organizationName}</strong>!</p>
                        
                        ${planType === 'trial' ? `
                            <div class="warning">
                                <strong>🎁 Your ${trialDays}-day free trial has started!</strong><br>
                                No credit card required. Explore all features risk-free.
                            </div>
                        ` : `
                            <p><strong>✅ Your ${planType} plan is active!</strong></p>
                        `}
                        
                        <h3>First things first - verify your email:</h3>
                        <center>
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        </center>
                        
                        <h3>What's next?</h3>
                        <div class="feature">✓ Complete your organization setup</div>
                        <div class="feature">✓ Add your business locations</div>
                        <div class="feature">✓ Invite your team members</div>
                        <div class="feature">✓ Create your first schedule</div>
                        
                        <h3>Need help getting started?</h3>
                        <p>Check out our <a href="${this.baseUrl}/help/getting-started">Getting Started Guide</a> or reply to this email - we're here to help!</p>
                        
                        <p>Best regards,<br>The ShiftWizard Team</p>
                    </div>
                    <div class="footer">
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p>${verificationUrl}</p>
                        <p>&copy; ${new Date().getFullYear()} ShiftWizard. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Welcome to ShiftWizard, ${name}!

Congratulations on creating your ShiftWizard account for ${organizationName}!

${planType === 'trial' 
    ? `Your ${trialDays}-day free trial has started! No credit card required.`
    : `Your ${planType} plan is active!`
}

First, please verify your email address:
${verificationUrl}

What's next?
- Complete your organization setup
- Add your business locations
- Invite your team members
- Create your first schedule

Need help? Visit ${this.baseUrl}/help or reply to this email.

Best regards,
The ShiftWizard Team
        `;

        return this.sendEmail({
            to,
            subject,
            html,
            text
        });
    }

    /**
     * Send team invitation email
     */
    async sendInvitation(options) {
        const {
            email,
            inviterName,
            organizationName,
            role,
            token
        } = options;

        const inviteUrl = `${this.baseUrl}/accept-invite?token=${token}`;
        
        const subject = `You're invited to join ${organizationName} on ShiftWizard`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                    .role-badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #3730a3; border-radius: 12px; font-weight: 600; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>You're Invited!</h1>
                        <p>Join your team on ShiftWizard</p>
                    </div>
                    <div class="content">
                        <h2>Hello!</h2>
                        <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on ShiftWizard as a <span class="role-badge">${role}</span>.</p>
                        
                        <p>ShiftWizard is an employee scheduling platform that makes it easy to:</p>
                        <ul>
                            <li>View your work schedule anytime, anywhere</li>
                            <li>Request time off and swap shifts</li>
                            <li>Communicate with your team</li>
                            <li>Track your hours and availability</li>
                        </ul>
                        
                        <center>
                            <a href="${inviteUrl}" class="button">Accept Invitation</a>
                        </center>
                        
                        <p><small>This invitation will expire in 7 days. If you have any questions, please contact ${inviterName} or your manager.</small></p>
                    </div>
                    <div class="footer">
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p>${inviteUrl}</p>
                        <p>&copy; ${new Date().getFullYear()} ShiftWizard. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
You're invited to join ${organizationName} on ShiftWizard!

${inviterName} has invited you to join as a ${role}.

Accept your invitation here:
${inviteUrl}

This invitation will expire in 7 days.

ShiftWizard makes employee scheduling easy. You'll be able to:
- View your work schedule anytime
- Request time off and swap shifts
- Communicate with your team
- Track your hours

Best regards,
The ShiftWizard Team
        `;

        return this.sendEmail({
            to: email,
            subject,
            html,
            text
        });
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(options) {
        const { email, name, resetToken } = options;
        
        const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
        
        const subject = 'Reset your ShiftWizard password';
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #ef4444; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                    .warning { background: #fee2e2; border: 1px solid #fca5a5; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${name},</h2>
                        <p>We received a request to reset your ShiftWizard password. Click the button below to create a new password:</p>
                        
                        <center>
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </center>
                        
                        <div class="warning">
                            <strong>⚠️ Important:</strong><br>
                            • This link will expire in 2 hours<br>
                            • If you didn't request this, please ignore this email<br>
                            • Your password won't change until you create a new one
                        </div>
                        
                        <p>For security reasons, if you didn't request this password reset, please contact our support team immediately.</p>
                    </div>
                    <div class="footer">
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p>${resetUrl}</p>
                        <p>&copy; ${new Date().getFullYear()} ShiftWizard. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Hi ${name},

We received a request to reset your ShiftWizard password.

Reset your password here:
${resetUrl}

This link will expire in 2 hours.

If you didn't request this, please ignore this email. Your password won't change until you create a new one.

Best regards,
The ShiftWizard Team
        `;

        return this.sendEmail({
            to: email,
            subject,
            html,
            text
        });
    }

    /**
     * Send shift reminder
     */
    async sendShiftReminder(options) {
        const {
            email,
            name,
            shiftDate,
            shiftTime,
            location,
            duration
        } = options;

        const subject = `Reminder: You have a shift tomorrow at ${location}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .shift-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
                    .details { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px; margin-top: 20px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="shift-card">
                        <h1>⏰ Shift Reminder</h1>
                        <h2>Tomorrow, ${shiftDate}</h2>
                    </div>
                    <div class="details">
                        <h3>Hi ${name},</h3>
                        <p>This is a reminder about your upcoming shift:</p>
                        
                        <div class="detail-row">
                            <strong>Date:</strong>
                            <span>${shiftDate}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Time:</strong>
                            <span>${shiftTime}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Location:</strong>
                            <span>${location}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Duration:</strong>
                            <span>${duration}</span>
                        </div>
                        
                        <p style="margin-top: 20px;">
                            <a href="${this.baseUrl}/schedule" style="color: #667eea;">View Full Schedule →</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>Need to swap this shift? Log in to ShiftWizard to request a change.</p>
                        <p>&copy; ${new Date().getFullYear()} ShiftWizard. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Hi ${name},

This is a reminder about your upcoming shift:

Date: ${shiftDate}
Time: ${shiftTime}
Location: ${location}
Duration: ${duration}

View your full schedule at: ${this.baseUrl}/schedule

Need to swap this shift? Log in to ShiftWizard to request a change.

Best regards,
The ShiftWizard Team
        `;

        return this.sendEmail({
            to: email,
            subject,
            html,
            text
        });
    }

    /**
     * Send license expiration warning
     */
    async sendLicenseExpirationWarning(options) {
        const {
            email,
            organizationName,
            daysRemaining,
            expirationDate,
            planType
        } = options;

        const subject = `⚠️ Your ShiftWizard ${planType} plan expires in ${daysRemaining} days`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #f59e0b; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                    .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>License Expiration Notice</h1>
                        <p>${organizationName}</p>
                    </div>
                    <div class="content">
                        <div class="warning">
                            <strong>⚠️ Your ${planType} plan expires on ${expirationDate}</strong><br>
                            That's in ${daysRemaining} days!
                        </div>
                        
                        <p>To ensure uninterrupted service for your team, please renew your subscription before it expires.</p>
                        
                        <h3>What happens when your plan expires?</h3>
                        <ul>
                            <li>Your account will be downgraded to the free plan</li>
                            <li>Some features may become unavailable</li>
                            <li>Historical data will be preserved but read-only</li>
                            <li>You won't be able to create new schedules</li>
                        </ul>
                        
                        <center>
                            <a href="${this.baseUrl}/billing" class="button">Renew Now</a>
                        </center>
                        
                        <p>Questions about your subscription? Contact our support team at support@shiftwizard.com</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} ShiftWizard. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
⚠️ License Expiration Notice for ${organizationName}

Your ${planType} plan expires on ${expirationDate} (in ${daysRemaining} days).

To ensure uninterrupted service, please renew your subscription:
${this.baseUrl}/billing

What happens when your plan expires:
- Your account will be downgraded to the free plan
- Some features may become unavailable
- Historical data will be preserved but read-only
- You won't be able to create new schedules

Questions? Contact support@shiftwizard.com

Best regards,
The ShiftWizard Team
        `;

        return this.sendEmail({
            to: email,
            subject,
            html,
            text
        });
    }

    /**
     * Base email sending function
     */
    async sendEmail(options) {
        const { to, subject, html, text, attachments = [] } = options;

        const mailOptions = {
            from: `${this.fromName} <${this.fromEmail}>`,
            to,
            subject,
            html,
            text,
            attachments
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${to}: ${subject}`);
            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    /**
     * Send bulk emails (with rate limiting)
     */
    async sendBulkEmails(recipients, template, data) {
        const results = [];
        const batchSize = 10; // Send 10 emails at a time
        
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            
            const batchPromises = batch.map(recipient => {
                return this.sendEmail({
                    to: recipient.email,
                    subject: template.subject,
                    html: this.renderTemplate(template.html, { ...data, ...recipient }),
                    text: this.renderTemplate(template.text, { ...data, ...recipient })
                }).catch(error => ({
                    success: false,
                    email: recipient.email,
                    error: error.message
                }));
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Rate limiting: wait 1 second between batches
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }

    /**
     * Render template with data
     */
    renderTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || '';
        });
    }
}

module.exports = new EmailService();