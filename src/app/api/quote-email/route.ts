import { NextResponse } from 'next/server';
import { checkContactRateLimit } from '@/lib/contact/rateLimit';
import { sendContactLeadEmails } from '@/lib/contact/mailService';
import { contactLeadSchema, formatValidationErrors } from '@/lib/contact/validation';
import { sanitizeIpAddress, sanitizeUrl } from '@/lib/contact/sanitize';

function getClientIpAddress(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const candidate = forwardedFor?.split(',')[0] || realIp || '';
  return sanitizeIpAddress(candidate);
}

function resolveSourcePageUrl(request: Request, payload: Record<string, unknown>): string {
  const payloadPageUrl =
    sanitizeUrl(payload.pageUrl) ||
    sanitizeUrl(payload.productUrl) ||
    sanitizeUrl(request.headers.get('referer')) ||
    '';

  if (!payloadPageUrl) return '';

  if (/^https?:\/\//i.test(payloadPageUrl)) return payloadPageUrl;

  try {
    const requestUrl = new URL(request.url);
    return new URL(payloadPageUrl, `${requestUrl.protocol}//${requestUrl.host}`).toString();
  } catch {
    return payloadPageUrl;
  }
}

export async function POST(request: Request) {
  const ipAddress = getClientIpAddress(request);
  const rateLimit = checkContactRateLimit(ipAddress || 'anonymous');

  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      {
        ok: false,
        error: 'Too many contact requests. Please wait a few minutes and try again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      },
    );
  }

  try {
    const rawPayload = (await request.json()) as Record<string, unknown>;
    const parsedLead = contactLeadSchema.safeParse({
      ...rawPayload,
      ipAddress,
    });

    if (!parsedLead.success) {
      return NextResponse.json(
        {
          ok: false,
          error: formatValidationErrors(parsedLead.error),
        },
        { status: 400 },
      );
    }

    const lead = {
      ...parsedLead.data,
      sourcePageUrl: resolveSourcePageUrl(request, rawPayload),
      ipAddress,
    };

    const result = await sendContactLeadEmails(lead);

    return NextResponse.json(
      {
        ok: true,
        message: 'Your inquiry has been sent successfully.',
        messageIds: result,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    console.error(
      `Contact email workflow failed | ip=${ipAddress || '-'} | error=${errorMessage} | time=${new Date().toISOString()}`,
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'We could not send your inquiry right now. Please try again later.',
      },
      { status: 500 },
    );
  }
}
