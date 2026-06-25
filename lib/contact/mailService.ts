import nodemailer from 'nodemailer';
import {
  buildContactInquiryHtml,
  buildContactInquirySubject,
  buildContactInquiryText,
} from '@/lib/emailTemplates';
import type { ContactLead } from './validation';

type LeadEmailDetails = {
  companyName?: string;
  customerName: string;
  email: string;
  ipAddress?: string;
  message: string;
  phoneNumber: string;
  sourcePageUrl?: string;
  subject?: string;
  submittedTime: string;
  quantity?: string;
};

type MailConfig = {
  customerServiceEmail: string;
  fromEmail: string;
  salesEmail: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getMailConfig(): MailConfig {
  const fromEmail = process.env.SMTP_USER?.trim() || '';
  const customerServiceEmail =
    process.env.CUSTOMER_SERVICE_EMAIL?.trim() || 'customerservice.sspackaging@gmail.com';
  const salesEmail = process.env.SALES_EMAIL?.trim() || 'sales.sspackaging@gmail.com';

  if (!process.env.SMTP_HOST?.trim()) {
    throw new Error('Missing SMTP_HOST environment variable.');
  }

  if (!process.env.SMTP_PORT?.trim()) {
    throw new Error('Missing SMTP_PORT environment variable.');
  }

  if (!fromEmail) {
    throw new Error('Missing SMTP_USER environment variable.');
  }

  if (!process.env.SMTP_PASS?.trim()) {
    throw new Error('Missing SMTP_PASS environment variable.');
  }

  return {
    fromEmail,
    customerServiceEmail,
    salesEmail,
  };
}

function createTransporter(allowInsecureTls = false) {
  const port = Number(process.env.SMTP_PORT);

  if (!Number.isFinite(port)) {
    throw new Error('SMTP_PORT must be a valid number.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      servername: process.env.SMTP_HOST,
      rejectUnauthorized: !allowInsecureTls,
    },
  });
}

async function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();

    try {
      await cachedTransporter.verify();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (!message.includes('unable to verify the first certificate')) {
        throw error;
      }

      console.warn('SMTP certificate verification failed. Retrying with relaxed TLS verification.');
      cachedTransporter = createTransporter(true);
      await cachedTransporter.verify();
    }
  }

  return cachedTransporter;
}

function buildEmailContent(details: LeadEmailDetails) {
  const subject = details.subject?.trim() || buildContactInquirySubject(details.customerName);
  const messageWithQuantity = details.quantity?.trim()
    ? `${details.message}\n\nRequested Quantity: ${details.quantity}`
    : details.message;

  const templateInput = {
    customerName: details.customerName,
    companyName: details.companyName,
    email: details.email,
    phoneNumber: details.phoneNumber,
    subject,
    message: messageWithQuantity,
    sourcePageUrl: details.sourcePageUrl,
    ipAddress: details.ipAddress,
    submittedTime: details.submittedTime,
  };

  return {
    subject,
    html: buildContactInquiryHtml(templateInput),
    text: buildContactInquiryText(templateInput),
  };
}

async function sendSingleLeadEmail(
  transporter: nodemailer.Transporter,
  fromEmail: string,
  recipient: string,
  details: LeadEmailDetails,
) {
  const content = buildEmailContent(details);

  try {
    return await transporter.sendMail({
      from: fromEmail,
      to: recipient,
      subject: content.subject,
      html: content.html,
      text: content.text,
      replyTo: details.email,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    console.error(
      `Contact lead email send failed | recipient=${recipient} | customer=${details.customerName} | source=${details.sourcePageUrl || '-'} | error=${errorMessage} | time=${new Date().toISOString()}`,
    );
    throw error;
  }
}

export async function sendContactLeadEmails(lead: ContactLead & { sourcePageUrl?: string; ipAddress?: string }) {
  const config = getMailConfig();
  const transporter = await getTransporter();

  const submittedTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: 'Asia/Calcutta',
  });

  const details: LeadEmailDetails = {
    customerName: lead.name,
    companyName: lead.company,
    email: lead.email,
    phoneNumber: lead.phone,
    subject: lead.subject || lead.productInterest,
    message: lead.message,
    sourcePageUrl: lead.sourcePageUrl,
    ipAddress: lead.ipAddress,
    submittedTime,
    quantity: lead.quantity,
  };

  const customerServiceResult = await sendSingleLeadEmail(
    transporter,
    config.fromEmail,
    config.customerServiceEmail,
    details,
  );

  const salesResult = await sendSingleLeadEmail(
    transporter,
    config.fromEmail,
    config.salesEmail,
    details,
  );

  return {
    customerServiceMessageId: customerServiceResult.messageId,
    salesMessageId: salesResult.messageId,
  };
}
