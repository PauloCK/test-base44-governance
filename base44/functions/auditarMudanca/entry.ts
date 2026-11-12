import { createClientFromRequest } from 'npm:@base44/sdk';

// Teste de trilha de auditoria: grava o que o workflow de evento recebe.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let corpo: unknown = null;
  try { corpo = await req.json(); } catch (_) { corpo = null; }
  const user = await base44.auth.me().catch(() => null);
  await base44.asServiceRole.entities.AuditoriaLog.create({
    evento: JSON.stringify(corpo).slice(0, 20000),
    chamador: user ? user.email : null,
  });
  return Response.json({ ok: true });
});
