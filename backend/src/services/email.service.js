import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

// ============================================
// TRANSPORTER CONFIGURATION
// ============================================

const transporter = nodemailer.createTransporter({
    host: ENV.SMTP_HOST || "smtp.gmail.com",
    port: ENV.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: ENV.SMTP_USER, // your email
        pass: ENV.SMTP_PASS, // your email password or app password
    },
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email transporter error:", error);
    } else {
        console.log("✅ Email server is ready to send emails");
    }
});

// ============================================
// EMAIL TEMPLATES
// ============================================

const getEmailTemplate = (title, content, actionUrl, actionText) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background-color: #3B82F6;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }
                .content {
                    background-color: #f9fafb;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #3B82F6;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #6b7280;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${title}</h1>
            </div>
            <div class="content">
                ${content}
                ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText || 'View'}</a>` : ''}
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Education Platform. All rights reserved.</p>
                <p>You received this email because you are registered on our platform.</p>
            </div>
        </body>
        </html>
    `;
};

// ============================================
// SEND EMAIL FUNCTION
// ============================================

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Education Platform" <${ENV.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        
        console.log("✅ Email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Email sending error:", error);
        return { success: false, error: error.message };
    }
};

// ============================================
// WELCOME EMAIL
// ============================================

export const sendWelcomeEmail = async (user) => {
    const subject = "Welcome to Education Platform!";
    
    const content = `
        <h2>Welcome, ${user.firstName}!</h2>
        <p>We're excited to have you join our education community.</p>
        <p>As a <strong>${user.role}</strong>, you now have access to:</p>
        <ul>
            <li>Interactive classes and courses</li>
            <li>Real-time messaging with teachers and students</li>
            <li>Video calls and online meetings</li>
            <li>Assignment submission and grading</li>
            <li>And much more!</li>
        </ul>
        <p>Get started by exploring your dashboard and connecting with your classmates.</p>
    `;
    
    const html = getEmailTemplate(
        "Welcome to Education Platform",
        content,
        `${ENV.CLIENT_URL}/dashboard`,
        "Go to Dashboard"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// NOTIFICATION EMAIL
// ============================================

export const sendNotificationEmail = async (user, notification) => {
    const subject = notification.title;
    
    const content = `
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.data?.metadata ? `<p><em>${notification.data.metadata}</em></p>` : ''}
    `;
    
    const html = getEmailTemplate(
        notification.title,
        content,
        notification.actionUrl ? `${ENV.CLIENT_URL}${notification.actionUrl}` : null,
        notification.actionText || "View Details"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// HOMEWORK DUE EMAIL
// ============================================

export const sendHomeworkDueEmail = async (user, homework) => {
    const subject = `Reminder: ${homework.title} is due soon`;
    
    const dueDate = new Date(homework.deadline).toLocaleDateString();
    const dueTime = new Date(homework.deadline).toLocaleTimeString();
    
    const content = `
        <h2>Homework Reminder</h2>
        <p>Hi ${user.firstName},</p>
        <p>This is a reminder that your homework "<strong>${homework.title}</strong>" is due soon.</p>
        <p><strong>Due Date:</strong> ${dueDate} at ${dueTime}</p>
        <p><strong>Class:</strong> ${homework.className || 'N/A'}</p>
        <p>Make sure to submit your work before the deadline to avoid late penalties.</p>
    `;
    
    const html = getEmailTemplate(
        "Homework Due Reminder",
        content,
        `${ENV.CLIENT_URL}/homework/${homework._id}`,
        "View Homework"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// ANNOUNCEMENT EMAIL
// ============================================

export const sendAnnouncementEmail = async (user, announcement) => {
    const subject = `Announcement: ${announcement.title}`;
    
    const content = `
        <h2>${announcement.title}</h2>
        <p>${announcement.content}</p>
        ${announcement.className ? `<p><strong>Class:</strong> ${announcement.className}</p>` : ''}
        <p><em>Posted by ${announcement.authorName} on ${new Date(announcement.createdAt).toLocaleDateString()}</em></p>
    `;
    
    const html = getEmailTemplate(
        `Announcement: ${announcement.title}`,
        content,
        `${ENV.CLIENT_URL}/posts/${announcement._id}`,
        "View Announcement"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// CLASS INVITE EMAIL
// ============================================

export const sendClassInviteEmail = async (user, classData, invitedBy) => {
    const subject = `You've been invited to join ${classData.name}`;
    
    const content = `
        <h2>Class Invitation</h2>
        <p>Hi ${user.firstName},</p>
        <p>${invitedBy.fullName} has invited you to join the class "<strong>${classData.name}</strong>".</p>
        <p><strong>Subject:</strong> ${classData.subject}</p>
        <p><strong>Grade:</strong> ${classData.grade}</p>
        ${classData.description ? `<p><strong>Description:</strong> ${classData.description}</p>` : ''}
        ${classData.joinCode ? `<p><strong>Join Code:</strong> <code>${classData.joinCode}</code></p>` : ''}
        <p>Click the button below to accept the invitation and join the class.</p>
    `;
    
    const html = getEmailTemplate(
        "Class Invitation",
        content,
        `${ENV.CLIENT_URL}/classes/${classData._id}/join`,
        "Join Class"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// MEETING INVITATION EMAIL
// ============================================

export const sendMeetingInviteEmail = async (user, meeting) => {
    const subject = `Meeting Invitation: ${meeting.title}`;
    
    const startTime = new Date(meeting.scheduledStartTime).toLocaleString();
    const duration = Math.round((new Date(meeting.scheduledEndTime) - new Date(meeting.scheduledStartTime)) / 60000);
    
    const content = `
        <h2>You're Invited to a Meeting</h2>
        <p>Hi ${user.firstName},</p>
        <p>You've been invited to join the meeting "<strong>${meeting.title}</strong>".</p>
        ${meeting.description ? `<p>${meeting.description}</p>` : ''}
        <p><strong>When:</strong> ${startTime}</p>
        <p><strong>Duration:</strong> ${duration} minutes</p>
        ${meeting.meetingCode ? `<p><strong>Meeting Code:</strong> <code>${meeting.meetingCode}</code></p>` : ''}
        <p>Click the button below to join the meeting at the scheduled time.</p>
    `;
    
    const html = getEmailTemplate(
        "Meeting Invitation",
        content,
        `${ENV.CLIENT_URL}/meetings/${meeting._id}`,
        "Join Meeting"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// GRADE NOTIFICATION EMAIL
// ============================================

export const sendGradeNotificationEmail = async (user, homework, grade) => {
    const subject = `Grade Posted: ${homework.title}`;
    
    const content = `
        <h2>Grade Posted</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your teacher has posted a grade for "<strong>${homework.title}</strong>".</p>
        <p><strong>Your Grade:</strong> ${grade.score}/${grade.maxScore}</p>
        ${grade.feedback ? `<p><strong>Feedback:</strong> ${grade.feedback}</p>` : ''}
        <p>Click the button below to view more details.</p>
    `;
    
    const html = getEmailTemplate(
        "Grade Posted",
        content,
        `${ENV.CLIENT_URL}/homework/${homework._id}`,
        "View Details"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// PASSWORD RESET EMAIL (if needed)
// ============================================

export const sendPasswordResetEmail = async (user, resetToken) => {
    const subject = "Password Reset Request";
    
    const content = `
        <h2>Password Reset</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password. Click the button below to reset it.</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    `;
    
    const html = getEmailTemplate(
        "Password Reset",
        content,
        `${ENV.CLIENT_URL}/reset-password?token=${resetToken}`,
        "Reset Password"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// BULK EMAIL SENDING
// ============================================

export const sendBulkEmails = async (users, subject, content, actionUrl, actionText) => {
    const results = [];
    
    for (const user of users) {
        const personalizedContent = content.replace(/\{firstName\}/g, user.firstName)
                                          .replace(/\{lastName\}/g, user.lastName)
                                          .replace(/\{fullName\}/g, user.fullName);
        
        const html = getEmailTemplate(subject, personalizedContent, actionUrl, actionText);
        const result = await sendEmail(user.email, subject, html);
        
        results.push({
            email: user.email,
            success: result.success,
        });
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
};

// ============================================
// EMAIL VERIFICATION (if needed)
// ============================================

export const sendVerificationEmail = async (user, verificationToken) => {
    const subject = "Verify Your Email Address";
    
    const content = `
        <h2>Email Verification</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for registering! Please verify your email address by clicking the button below.</p>
        <p>This link will expire in 24 hours.</p>
    `;
    
    const html = getEmailTemplate(
        "Email Verification",
        content,
        `${ENV.CLIENT_URL}/verify-email?token=${verificationToken}`,
        "Verify Email"
    );
    
    return await sendEmail(user.email, subject, html);
};

// ============================================
// EXPORTS
// ============================================

export default {
    sendWelcomeEmail,
    sendNotificationEmail,
    sendHomeworkDueEmail,
    sendAnnouncementEmail,
    sendClassInviteEmail,
    sendMeetingInviteEmail,
    sendGradeNotificationEmail,
    sendPasswordResetEmail,
    sendBulkEmails,
    sendVerificationEmail,
};