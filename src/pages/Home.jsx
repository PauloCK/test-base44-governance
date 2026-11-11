import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import RegistroForm from '@/components/RegistroForm';
import RegistroLista from '@/components/RegistroLista';

const REGRAS = [
  'Criar: qualquer usuário logado',
  'Ler, editar e excluir: apenas o criador',
];

export default function Home() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    base44.entities.TesteRLS.filter({}, { sort: '-created_date', limit: 50 })
      .then((pagina) => setRegistros(pagina.items ?? []))
      .finally(() => setCarregando(false));
  }, []);

  const criar = async (dados) => {
    const registro = await base44.entities.TesteRLS.create(dados);
    setRegistros((atual) => [registro, ...atual]);
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[#1a1a18]">
      <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="mb-10 border-b border-[#e3ded6] pb-7">
          <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#a8a191]">
            Ambiente interno
          </span>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Teste Governança
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6b6659]">
            Entidade <span className="font-medium text-[#1a1a18]">TesteRLS</span> para validar permissões de
            acesso por criador.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {REGRAS.map((regra) => (
              <span
                key={regra}
                className="rounded-full border border-[#e3ded6] bg-white px-3 py-1 text-[11px] tracking-wide text-[#6b6659]"
              >
                {regra}
              </span>
            ))}
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
          <section className="rounded-2xl border border-[#e3ded6] bg-white p-6 shadow-[0_1px_2px_rgba(26,26,24,0.04)]">
            <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.14em] text-[#8a8577]">
              Novo registro
            </h2>
            <RegistroForm onCriar={criar} />
          </section>

          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[#8a8577]">
                Registros visíveis
              </h2>
              <span className="text-[11px] tracking-wide text-[#a8a191]">
                {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <RegistroLista registros={registros} carregando={carregando} />
          </section>
        </div>
      </div>
    </div>
  );
}