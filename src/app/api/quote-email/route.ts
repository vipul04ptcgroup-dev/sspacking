import { NextResponse } from 'next/server';

type QuoteEmailPayload = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  productInterest: string;
  productUrl?: string;
  quantity: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as QuoteEmailPayload;

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.QUOTE_FROM_EMAIL;
    const to = process.env.QUOTE_TO_EMAIL;

    // Keep existing quote flow independent. If email config is absent, skip silently.
    if (!resendApiKey || !from || !to) {
      return NextResponse.json({ ok: false, skipped: true }, { status: 202 });
    }

    const text = [
      'New quote request received.',
      '',
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone}`,
      `Company: ${payload.company || '-'}`,
      `Product Interest: ${payload.productInterest}`,
      `Quantity: ${payload.quantity}`,
      `Product URL: ${payload.productUrl || '-'}`,
      '',
      'Message:',
      payload.message?.trim() || '-',
    ].join('\n');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New Quote Request: ${payload.name}`,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json({ ok: false, error: errorBody }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
