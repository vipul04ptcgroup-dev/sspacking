import { buildLlmsTxt } from '@/lib/llms';

export const dynamic = 'force-dynamic';

export async function GET() {
  const content = await buildLlmsTxt();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
