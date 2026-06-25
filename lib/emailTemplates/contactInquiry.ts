export type ContactInquiryTemplateInput = {
  customerName: string;
  companyName?: string | null;
  email: string;
  phoneNumber: string;
  subject?: string | null;
  message?: string | null;
  sourcePageUrl?: string | null;
  ipAddress?: string | null;
  submittedTime: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeValue(value?: string | null): string {
  const trimmedValue = value?.trim();
  return trimmedValue ? escapeHtml(trimmedValue) : 'Not provided';
}

function buildTableRow(label: string, value?: string | null, preserveWhitespace = false): string {
  const safeValue = normalizeValue(value);
  const valueStyles = preserveWhitespace
    ? 'padding:14px 16px;font-size:14px;line-height:1.7;color:#1f2937;background:#ffffff;white-space:pre-wrap;word-break:break-word;'
    : 'padding:14px 16px;font-size:14px;line-height:1.6;color:#1f2937;background:#ffffff;word-break:break-word;';

  return `
    <tr>
      <td style="padding:14px 16px;font-size:13px;line-height:1.5;font-weight:700;color:#374151;background:#f8fafc;border-bottom:1px solid #e5e7eb;width:34%;">
        ${escapeHtml(label)}
      </td>
      <td style="${valueStyles}border-bottom:1px solid #e5e7eb;">
        ${safeValue}
      </td>
    </tr>
  `;
}

export function buildContactInquirySubject(customerName: string): string {
  const trimmedName = customerName.trim() || 'Website Visitor';
  return `New Website Inquiry - ${trimmedName}`;
}

export function buildContactInquiryHtml(input: ContactInquiryTemplateInput): string {
  const resolvedSubject = input.subject?.trim() || buildContactInquirySubject(input.customerName);

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(resolvedSubject)}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .email-shell {
          width: 100% !important;
        }

        .email-card {
          border-radius: 0 !important;
        }

        .email-padding {
          padding: 24px 18px !important;
        }

        .email-heading {
          font-size: 24px !important;
          line-height: 1.3 !important;
        }

        .email-table td {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="padding:24px 12px;background:#f3f4f6;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-shell" style="max-width:720px;margin:0 auto;">
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
              <tr>
                <td class="email-padding" style="padding:32px 32px 24px;background:linear-gradient(135deg,#111827 0%,#7c2d12 100%);">
                  <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#fde68a;font-weight:700;margin-bottom:12px;">
                    SS Packaging
                  </div>
                  <h1 class="email-heading" style="margin:0;font-size:30px;line-height:1.25;color:#ffffff;font-weight:800;">
                    New Website Inquiry
                  </h1>
                  <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#f9fafb;">
                    A new lead has been submitted through the website contact form. Review the details below and follow up promptly.
                  </p>
                </td>
              </tr>
              <tr>
                <td class="email-padding" style="padding:28px 32px 32px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-table" style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;border-collapse:separate;border-spacing:0;background:#ffffff;">
                    ${buildTableRow('Name', input.customerName)}
                    ${buildTableRow('Company Name', input.companyName)}
                    ${buildTableRow('Email', input.email)}
                    ${buildTableRow('Phone Number', input.phoneNumber)}
                    ${buildTableRow('Subject', resolvedSubject)}
                    ${buildTableRow('Message', input.message, true)}
                    ${buildTableRow('Source Page URL', input.sourcePageUrl)}
                    ${buildTableRow('IP Address', input.ipAddress)}
                    ${buildTableRow('Submitted Time', input.submittedTime)}
                  </table>
                  <p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#6b7280;">
                    This email was generated automatically from the SS Packaging website contact workflow.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
  `.trim();
}

export function buildContactInquiryText(input: ContactInquiryTemplateInput): string {
  const resolvedSubject = input.subject?.trim() || buildContactInquirySubject(input.customerName);

  return [
    'New Website Inquiry',
    '',
    `Name: ${input.customerName.trim() || 'Not provided'}`,
    `Company Name: ${input.companyName?.trim() || 'Not provided'}`,
    `Email: ${input.email.trim() || 'Not provided'}`,
    `Phone Number: ${input.phoneNumber.trim() || 'Not provided'}`,
    `Subject: ${resolvedSubject}`,
    `Message: ${input.message?.trim() || 'Not provided'}`,
    `Source Page URL: ${input.sourcePageUrl?.trim() || 'Not provided'}`,
    `IP Address: ${input.ipAddress?.trim() || 'Not provided'}`,
    `Submitted Time: ${input.submittedTime}`,
  ].join('\n');
}
