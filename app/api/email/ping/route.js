import { NextResponse } from 'next/server';
import { getTransporter } from '@/lib/mailer';

export async function GET(req) {
  const missing = [];
  const required = ['GMAIL_EMAIL', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];

  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  const { searchParams } = new URL(req.url);
  const shouldVerify = searchParams.get('verify') === '1';

  if (shouldVerify) {
    try {
      if (missing.length > 0) {
        return NextResponse.json({ success: false, error: 'Missing required env vars', missing }, { status: 400 });
      }
      const transporter = getTransporter();
      const verifyRes = await transporter.verify();
      return NextResponse.json({ success: true, verified: true, verifyRes });
    } catch (err) {
      return NextResponse.json({ success: false, verified: false, error: err.message });
    }
  }

  return NextResponse.json({
    success: missing.length === 0,
    missing,
    configured: required.filter(k => !missing.includes(k)),
  });
}
