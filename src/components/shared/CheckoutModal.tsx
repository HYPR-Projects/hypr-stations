import { useState, useMemo } from 'react';
import { EXECS, SHEETS_WEBHOOK } from '../../lib/constants';
import { formatAudience } from '../../lib/audience';

interface CheckoutStation {
  tipo: string;
  frequencia: string;
  municipio: string;
  uf: string;
  audience: number;
}

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  stations: CheckoutStation[];
}

type Step = 'form' | 'execs';

export default function CheckoutModal({ open, onClose, stations }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', budget: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const kpis = useMemo(() => {
    const totalAud = stations.reduce((s, e) => s + e.audience, 0);
    const ufs = [...new Set(stations.map(e => e.uf))];
    return { count: stations.length, audience: totalAud, ufs: ufs.length };
  }, [stations]);

  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 7) return '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
    if (v.length > 2) return '(' + v.slice(0, 2) + ') ' + v.slice(2);
    return v;
  };

  const submit = async () => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Nome');
    if (!form.company.trim()) errs.push('Empresa');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push('Email válido');
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 10) errs.push('Telefone');
    if (!form.budget) errs.push('Orçamento');
    if (errs.length) { setError('Preencha: ' + errs.join(', ')); return; }
    setError('');
    setSubmitting(true);

    try {
      await fetch(SHEETS_WEBHOOK, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          source: 'HYPR Station',
          name: form.name.trim(), company: form.company.trim(),
          email: form.email.trim(), phone: form.phone,
          budget: form.budget, stations: kpis.count,
          audience: kpis.audience,
          ufs: [...new Set(stations.map(e => e.uf))].join(','),
          stationList: stations.slice(0, 20).map(s => s.frequencia + ' ' + s.municipio + '/' + s.uf).join('; '),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('[Checkout] Failed to send lead:', err);
    }

    setSubmitting(false);
    setStep('execs');
  };

  const waMessage = useMemo(() => {
    const stList = stations.slice(0, 10).map(s => '- ' + s.frequencia + ' ' + s.municipio + '/' + s.uf).join('\n');
    return encodeURIComponent(
      'Olá! Sou ' + form.name + ' da ' + form.company + '.\n\n' +
      'Gostaria de ativar um plano de mídia via HYPR.\n\n' +
      '*Resumo:*\n' + kpis.count + ' estações | ' + formatAudience(kpis.audience) + ' devices est.\n\n' +
      stList + (stations.length > 10 ? '\n... +' + (stations.length - 10) + ' estações' : '') +
      '\n\nOrçamento: ' + (form.budget || 'A definir')
    );
  }, [form, stations, kpis]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3500] flex items-start justify-center p-4 sm:p-5 overflow-y-auto
                    bg-[var(--overlay)]" style={{ backdropFilter: 'blur(4px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Autofill override */}
      <style>{`
        .ck-input:-webkit-autofill,
        .ck-input:-webkit-autofill:hover,
        .ck-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 40px var(--bg-surface2) inset !important;
          -webkit-text-fill-color: var(--text-primary) !important;
          caret-color: var(--text-primary) !important;
        }
      `}</style>

      <div role="dialog" aria-modal="true" aria-labelledby="checkout-title"
           className="bg-[var(--bg-surface)] border-[0.5px] border-[var(--border)] rounded-[16px]
                      w-full max-w-[480px] mt-8 sm:mt-12 relative overflow-hidden"
           onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose} aria-label="Fechar"
                className="absolute top-4 right-4 z-10 w-7 h-7 rounded-lg bg-[var(--bg-surface2)]
                           text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface3)]
                           flex items-center justify-center text-[13px] cursor-pointer transition-all duration-150
                           border-0 outline-none">
          ×
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-1">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${step === 'form' ? 'bg-[var(--accent)]' : 'bg-[var(--border-active)]'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${step === 'execs' ? 'bg-[var(--accent)]' : 'bg-[var(--border-active)]'}`} />
        </div>

        {/* Header */}
        <div className="text-center px-6 pb-5">
          <h2 id="checkout-title" className="font-heading text-[18px] font-semibold text-[var(--text-primary)]">
            {step === 'form' ? 'Montar plano' : 'Enviar via WhatsApp'}
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-1.5">
            {step === 'form' ? 'Revise a seleção e preencha seus dados' : 'Escolha um executivo para contato'}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2.5 px-6 mb-4">
          {[
            { value: kpis.count.toString(), label: 'Estações' },
            { value: formatAudience(kpis.audience), label: 'Devices est.' },
            { value: kpis.ufs.toString(), label: 'UFs' },
          ].map(k => (
            <div key={k.label} className="bg-[var(--bg-surface2)] rounded-[10px] py-3.5 px-3 text-center">
              <div className="font-heading text-[17px] font-semibold text-[var(--accent)] leading-none">{k.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1.5 uppercase tracking-[0.04em]">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Station list */}
        <div className="max-h-32 overflow-y-auto border-y-[0.5px] border-[var(--border)] mb-5">
          {stations.sort((a, b) => b.audience - a.audience).slice(0, 30).map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 px-6 py-2 border-b border-[var(--border)] last:border-b-0 text-[12px]">
              <span className={`font-semibold shrink-0 ${s.tipo === 'FM' ? 'text-[var(--accent)]' : 'text-[var(--color-gold-400)]'}`}>
                {s.tipo}
              </span>
              <span className="text-[var(--text-primary)] truncate">{s.frequencia} · {s.municipio}/{s.uf}</span>
              <span className="ml-auto text-[var(--accent)] text-[11px] font-medium shrink-0">{formatAudience(s.audience)}</span>
            </div>
          ))}
        </div>

        {step === 'form' ? (
          <div className="px-6 pb-6">
            <div className="text-[11px] font-medium tracking-[0.03em] text-[var(--text-muted)] mb-3">
              Seus dados
            </div>
            <div className="flex flex-col gap-2.5 mb-5">
              <input aria-label="Nome" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nome *"
                className="ck-input w-full h-11 px-4 rounded-[10px] text-[13px] border-0 outline-none
                           bg-[var(--bg-surface2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
                           focus:ring-1 focus:ring-[var(--accent)] transition-shadow duration-200" />
              <input aria-label="Empresa" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Empresa *"
                className="ck-input w-full h-11 px-4 rounded-[10px] text-[13px] border-0 outline-none
                           bg-[var(--bg-surface2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
                           focus:ring-1 focus:ring-[var(--accent)] transition-shadow duration-200" />
              <input aria-label="Email" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email *"
                className="ck-input w-full h-11 px-4 rounded-[10px] text-[13px] border-0 outline-none
                           bg-[var(--bg-surface2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
                           focus:ring-1 focus:ring-[var(--accent)] transition-shadow duration-200" />
              <input aria-label="Telefone" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                placeholder="Telefone (DDD)"
                className="ck-input w-full h-11 px-4 rounded-[10px] text-[13px] border-0 outline-none
                           bg-[var(--bg-surface2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
                           focus:ring-1 focus:ring-[var(--accent)] transition-shadow duration-200" />
              <select aria-label="Orçamento estimado" value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                className="ck-input w-full h-11 px-4 rounded-[10px] text-[13px] border-0 outline-none appearance-none
                           bg-[var(--bg-surface2)] text-[var(--text-primary)]
                           focus:ring-1 focus:ring-[var(--accent)] transition-shadow duration-200 cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23708490' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
                <option value="">Orçamento estimado</option>
                <option value="R$50K–100K">R$ 50K – 100K</option>
                <option value="R$100K–250K">R$ 100K – 250K</option>
                <option value="R$250K–500K">R$ 250K – 500K</option>
                <option value="R$500K–1M">R$ 500K – 1M</option>
                <option value="R$1M+">R$ 1M+</option>
              </select>
            </div>
            {error && <p className="text-[12px] text-[var(--color-red-400)] text-center mb-4">{error}</p>}
            <button onClick={submit} disabled={submitting}
                    className="w-full h-12 rounded-[10px] bg-[var(--accent)] text-[var(--on-accent)]
                               font-heading font-semibold text-[13px] cursor-pointer hover:opacity-90 transition-opacity
                               disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2
                               border-0 outline-none">
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[var(--on-accent)] border-t-transparent rounded-full animate-spin" />
                  Enviando…
                </>
              ) : 'Continuar'}
            </button>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div className="text-[11px] font-medium tracking-[0.03em] text-[var(--text-muted)] mb-3">
              Escolha um executivo para contato via WhatsApp
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EXECS.map(ex => (
                <a key={ex.phone} href={`https://wa.me/${ex.phone}?text=${waMessage}`}
                   target="_blank" rel="noopener"
                   className="flex items-center gap-2.5 p-3 rounded-[10px] bg-[var(--bg-surface2)]
                              border-[0.5px] border-[var(--border)] hover:border-[var(--accent)]
                              transition-colors duration-200 no-underline">
                  <img src={`/assets/${ex.img}`} alt={ex.name} width={36} height={36} loading="lazy"
                       className="w-9 h-9 rounded-full object-cover shrink-0"
                       onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)] leading-tight truncate">{ex.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Executivo HYPR</div>
                  </div>
                </a>
              ))}
            </div>
            <button onClick={onClose}
                    className="w-full mt-4 h-10 rounded-[10px] border-[0.5px] border-[var(--border)]
                               text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]
                               cursor-pointer transition-colors duration-200 bg-transparent outline-none">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
