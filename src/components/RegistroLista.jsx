import { FileText } from 'lucide-react';

const formatarData = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function RegistroLista({ registros, carregando }) {
  if (carregando) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-[#e3ded6] bg-white/60" />
        ))}
      </div>
    );
  }

  if (!registros.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#ded8cc] bg-white/40 px-6 py-16 text-center">
        <FileText className="h-6 w-6 text-[#b3ad9f]" />
        <p className="text-sm font-medium text-[#6b6659]">Nenhum registro visível para você</p>
        <p className="max-w-xs text-xs leading-relaxed text-[#9c9585]">
          Crie o primeiro registro no formulário ao lado.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {registros.map((registro) => (
        <li
          key={registro.id}
          className="rounded-xl border border-[#e3ded6] bg-white px-5 py-4 transition hover:border-[#cfc8b8]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-[#1a1a18]">{registro.titulo}</h3>
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#a8a191]">
              {formatarData(registro.created_date)}
            </span>
          </div>
          {registro.observacao && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#6b6659]">{registro.observacao}</p>
          )}
        </li>
      ))}
    </ul>
  );
}