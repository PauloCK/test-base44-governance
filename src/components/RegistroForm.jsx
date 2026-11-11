import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';

export default function RegistroForm({ onCriar }) {
  const [titulo, setTitulo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro('Informe um título.');
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      await onCriar({ titulo: titulo.trim(), observacao: observacao.trim() });
      setTitulo('');
      setObservacao('');
      setSucesso(true);
      setTimeout(() => setSucesso(false), 2200);
    } catch (err) {
      setErro(err?.message || 'Não foi possível salvar o registro.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="titulo" className="block text-xs font-medium uppercase tracking-[0.14em] text-[#8a8577]">
          Título
        </label>
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Teste de leitura restrita"
          className="w-full rounded-lg border border-[#e3ded6] bg-[#fcfbf9] px-3 py-2.5 text-sm text-[#1a1a18] outline-none transition placeholder:text-[#b3ad9f] focus:border-[#3f5d47] focus:bg-white focus:ring-2 focus:ring-[#3f5d47]/10"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="observacao" className="block text-xs font-medium uppercase tracking-[0.14em] text-[#8a8577]">
          Observação
        </label>
        <textarea
          id="observacao"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={4}
          placeholder="Anotações do teste"
          className="w-full resize-none rounded-lg border border-[#e3ded6] bg-[#fcfbf9] px-3 py-2.5 text-sm leading-relaxed text-[#1a1a18] outline-none transition placeholder:text-[#b3ad9f] focus:border-[#3f5d47] focus:bg-white focus:ring-2 focus:ring-[#3f5d47]/10"
        />
      </div>

      {erro && <p className="text-sm text-[#a8422f]">{erro}</p>}

      <button
        type="submit"
        disabled={salvando}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#26332a] px-4 py-2.5 text-sm font-medium text-[#f7f5f2] transition hover:bg-[#3f5d47] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {salvando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Salvando
          </>
        ) : sucesso ? (
          <>
            <Check className="h-4 w-4" /> Registro criado
          </>
        ) : (
          'Criar registro'
        )}
      </button>
    </form>
  );
}