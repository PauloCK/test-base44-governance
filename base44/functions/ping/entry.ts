import { createClientFromRequest } from 'npm:@base44/sdk';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  return Response.json({ ok: true, versao: 'redeploy-direto', usuario: user ? user.email : null });
});
