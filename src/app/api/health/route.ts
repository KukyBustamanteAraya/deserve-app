import { apiSuccess } from '@/lib/api-response';

export async function GET() {
  return apiSuccess({ ok: true, ts: Date.now() });
}
