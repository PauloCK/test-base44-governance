import { createClientFromRequest } from 'npm:@base44/sdk';

// Teste de governança: lê TesteRLS como o usuário e como service role.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  const comoUsuario = await base44.entities.TesteRLS.list().catch((e) => ({ erro: String(e) }));
  const comoServico = await base44.asServiceRole.entities.TesteRLS.list().catch((e) => ({ erro: String(e) }));
  return Response.json({
    versao: 'branch teste-service-role',
    usuario: user ? user.email : null,
    lidos_como_usuario: Array.isArray(comoUsuario) ? comoUsuario.length : comoUsuario,
    lidos_como_service_role: Array.isArray(comoServico) ? comoServico.map((r) => r.titulo) : comoServico
  });
});
