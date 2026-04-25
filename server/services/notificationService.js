const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
}

async function sendEmail(to, subject, text, options = {}) {
  const transport = getTransporter();

  try {
    const info = await transport.sendMail({
      from: process.env.MAIL_FROM || "noreply@sevalink.local",
      to,
      subject,
      text,
    });

    await Notification.create({
      type: options.type || "system",
      recipientEmail: to,
      recipientName: options.recipientName || "",
      subject,
      message: text,
      status: "sent",
      taskId: options.taskId || null,
      ngoId: options.ngoId || null,
      metadata: {
        transport: process.env.SMTP_HOST ? "smtp" : "jsonTransport",
        response: info.messageId || "queued",
      },
    });

    return info;
  } catch (error) {
    await Notification.create({
      type: options.type || "system",
      recipientEmail: to,
      recipientName: options.recipientName || "",
      subject,
      message: text,
      status: "failed",
      taskId: options.taskId || null,
      ngoId: options.ngoId || null,
      metadata: {
        error: error.message,
      },
    });

    throw error;
  }
}

async function notifyVolunteerAssignment(task, volunteer) {
  const subject = `Urgent task near you: ${task.title}`;
  const message = [
    `Hello ${volunteer.name},`,
    "",
    `You have been selected for the task "${task.title}" in ${task.location}.`,
    `Severity: ${task.severity.toUpperCase()}`,
    `Category: ${task.category}`,
    "",
    "Please log in to SevaLink to confirm your assignment.",
  ].join("\n");

  return sendEmail(volunteer.email, subject, message, {
    ngoId: task.ngoId,
    recipientName: volunteer.name,
    taskId: task._id,
    type: "assignment",
  });
}

async function notifyNearbyVolunteers(task, rankedMatches) {
  const volunteersToNotify = rankedMatches.filter((match) => match.matchScore >= 55).slice(0, 3);

  return Promise.all(
    volunteersToNotify.map((match) =>
      sendEmail(
        match.volunteerEmail,
        "Urgent task near you",
        [
          `Hello ${match.volunteerName},`,
          "",
          `A ${task.severity} priority task has been reported near ${task.location}.`,
          `Task: ${task.title}`,
          `Category: ${task.category}`,
          "",
          "Log in to SevaLink to review and apply if you are available.",
        ].join("\n"),
        {
          ngoId: task.ngoId,
          recipientName: match.volunteerName,
          taskId: task._id,
          type: "nearby_alert",
        }
      )
    )
  );
}

async function sendPasswordResetOtp(user, otpCode) {
  const subject = "Your SevaLink password reset code";
  const message = [
    `Hello ${user.name},`,
    "",
    "We received a request to reset your SevaLink password.",
    `Use this one-time code to continue: ${otpCode}`,
    "",
    "This code expires in 10 minutes.",
    "If you did not request this change, you can ignore this message.",
  ].join("\n");

  return sendEmail(user.email, subject, message, {
    recipientName: user.name,
    type: "system",
  });
}

module.exports = {
  notifyNearbyVolunteers,
  notifyVolunteerAssignment,
  sendPasswordResetOtp,
  sendEmail,
};
