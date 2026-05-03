// MÓDULOS 1 (Planificación estructural) + 10 (Periodización avanzada)
import React, { useState, useMemo } from 'react';
import { Calendar, Layers, Activity, Clock, Repeat, RotateCw, Target, GitBranch } from 'lucide-react';
import { CalcCard, Field, Select, BigResult, MiniStat, num, fmt } from './CalcShared';

// ========= MÓDULO 1 — PLANIFICACIÓN ESTRUCTURAL =========

export const CalcMacrocycle = () => {
  const [obj, setObj] = useState('competitive');
  const [model, setModel] = useState('traditional');
  const [comp, setComp] = useState('2024-12-15');

  const objWeeks = { fitness: 12, build: 24, competitive: 40, season: 52 };
  const ratios = {
    traditional: { prep: 0.65, comp: 0.25, trans: 0.10 },
    atr: { prep: 0.55, comp: 0.30, trans: 0.15 },
    blocks: { prep: 0.70, comp: 0.20, trans: 0.10 },
    undulating_daily: { prep: 0.60, comp: 0.30, trans: 0.10 },
    polarized: { prep: 0.70, comp: 0.20, trans: 0.10 },
    conjugate: { prep: 0.50, comp: 0.40, trans: 0.10 },
    reverse_linear: { prep: 0.55, comp: 0.35, trans: 0.10 },
    triphasic: { prep: 0.60, comp: 0.30, trans: 0.10 },
    vertical_integration: { prep: 0.55, comp: 0.35, trans: 0.10 },
    french_contrast: { prep: 0.50, comp: 0.40, trans: 0.10 },
    tactical: { prep: 0.45, comp: 0.45, trans: 0.10 },
    concurrent: { prep: 0.60, comp: 0.30, trans: 0.10 },
    cybernetic: { prep: 0.50, comp: 0.40, trans: 0.10 },
    pendulum: { prep: 0.55, comp: 0.35, trans: 0.10 },
    sequential: { prep: 0.60, comp: 0.30, trans: 0.10 },
    flexible_nonlinear: { prep: 0.55, comp: 0.35, trans: 0.10 },
    undulating_weekly: { prep: 0.60, comp: 0.30, trans: 0.10 },
  };
  const cfg = ratios[model] || ratios.traditional;
  const total = objWeeks[obj];
  const prepW = Math.round(total * cfg.prep);
  const compW = Math.round(total * cfg.comp);
  const transW = total - prepW - compW;
  const compDate = new Date(comp);
  const start = new Date(compDate); start.setDate(start.getDate() - total * 7);

  return (
    <CalcCard title="Macrociclo · Duración + Distribución de períodos" subtitle="17 modelos de periodización compatibles" icon={Calendar} color="#3B82F6" badge="Módulo 1" testid="calc-macrocycle">
      <Select label="Objetivo" value={obj} onChange={setObj} options={[
        { value: 'fitness', label: 'Fitness · 12 sem' },
        { value: 'build', label: 'Construcción · 24 sem' },
        { value: 'competitive', label: 'Competitivo · 40 sem' },
        { value: 'season', label: 'Temporada anual · 52 sem' },
      ]} />
      <Select label="Modelo" value={model} onChange={setModel} options={[
        { value: 'traditional', label: 'Tradicional (Matveiev)' },
        { value: 'atr', label: 'ATR (Issurin)' },
        { value: 'blocks', label: 'Bloques (Verkhoshansky)' },
        { value: 'undulating_daily', label: 'Ondulatorio Diario' },
        { value: 'undulating_weekly', label: 'Ondulatorio Semanal' },
        { value: 'flexible_nonlinear', label: 'No Lineal Flexible (Kraemer)' },
        { value: 'conjugate', label: 'Conjugado (Westside)' },
        { value: 'triphasic', label: 'Trifásico (Dietz)' },
        { value: 'vertical_integration', label: 'Integración Vertical (Francis)' },
        { value: 'french_contrast', label: 'Contraste Francés' },
        { value: 'tactical', label: 'Táctica (Frade)' },
        { value: 'reverse_linear', label: 'Lineal Inversa' },
        { value: 'concurrent', label: 'Concurrente' },
        { value: 'polarized', label: 'Polarizado (Seiler)' },
        { value: 'cybernetic', label: 'Cibernético (Bondarchuk)' },
        { value: 'pendulum', label: 'Péndulo (Arosiev)' },
        { value: 'sequential', label: 'Secuencial (Tschiene)' },
      ]} />
      <Field label="Fecha competición" value={comp} onChange={setComp} type="date" />
      <BigResult value={`${total} sem`} label="Duración macrociclo" color="#3B82F6"
        sub={`Inicio: ${start.toISOString().split('T')[0]}`} />
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Preparatorio" value={`${prepW} sem`} color="#3B82F6" />
        <MiniStat label="Competitivo" value={`${compW} sem`} color="#DC2626" />
        <MiniStat label="Transitorio" value={`${transW} sem`} color="#10B981" />
      </div>
    </CalcCard>
  );
};

export const CalcLoadWaves = () => {
  const [base, setBase] = useState(100);
  const [pattern, setPattern] = useState('linear');
  const semanas = useMemo(() => {
    const arr = [];
    const b = num(base);
    if (pattern === 'linear') {
      for (let i = 1; i <= 8; i++) arr.push({ s: i, p: Math.round(b * (1 + 0.05 * (i - 1))), c: '#3B82F6' });
    } else if (pattern === 'wave') {
      const w = [85, 100, 110, 70, 95, 110, 120, 65];
      w.forEach((m, i) => arr.push({ s: i + 1, p: Math.round(b * m / 100), c: i % 4 === 3 ? '#10B981' : '#F59E0B' }));
    } else if (pattern === 'block') {
      const w = [80, 90, 100, 110, 60, 95, 110, 75];
      w.forEach((m, i) => arr.push({ s: i + 1, p: Math.round(b * m / 100), c: i < 4 ? '#8B5CF6' : i === 4 ? '#10B981' : '#DC2626' }));
    } else { // step
      const w = [80, 90, 100, 65, 90, 100, 110, 70];
      w.forEach((m, i) => arr.push({ s: i + 1, p: Math.round(b * m / 100), c: m < 80 ? '#10B981' : '#3B82F6' }));
    }
    return arr;
  }, [base, pattern]);

  return (
    <CalcCard title="Ondas de carga · Generador automático" subtitle="Lineal · Ondulante · Bloques · Escalonado" icon={Activity} color="#F59E0B" badge="Módulo 1" testid="calc-load-waves">
      <Field label="Carga base · sem 1" value={base} onChange={setBase} unit="UA" />
      <Select label="Patrón" value={pattern} onChange={setPattern} options={[
        { value: 'linear', label: 'Lineal progresivo' },
        { value: 'wave', label: 'Ondulante (3:1)' },
        { value: 'block', label: 'Bloques 4+1+3' },
        { value: 'step', label: 'Escalonado 3:1' }
      ]} />
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {semanas.map(w => (
          <div key={w.s} className="text-center rounded-lg p-2" style={{ background: `${w.c}15`, borderTop: `3px solid ${w.c}` }}>
            <p className="text-[9px] font-bold text-slate-500">SEM {w.s}</p>
            <p className="text-base font-extrabold tabular-nums" style={{ color: w.c }}>{w.p}</p>
          </div>
        ))}
      </div>
    </CalcCard>
  );
};

export const CalcMesocycle = () => {
  const [tipo, setTipo] = useState('ordinary');
  const [vol, setVol] = useState(100);
  const tipos = {
    ordinary:    { v: 100, i: 70, txt: 'Mesociclo ordinario · desarrollo equilibrado', c: '#3B82F6' },
    shock:       { v: 130, i: 90, txt: 'Mesociclo de choque · sobrecarga deliberada', c: '#DC2626' },
    recovery:    { v: 60, i: 50, txt: 'Mesociclo recuperativo · regeneración', c: '#10B981' },
    competitive: { v: 75, i: 95, txt: 'Mesociclo competitivo · puesta a punto', c: '#F59E0B' },
  };
  const cfg = tipos[tipo];
  return (
    <CalcCard title="Mesociclo · Tipo + % Volumen/Intensidad" subtitle="4 tipos clásicos · distribución de capacidades" icon={Layers} color="#8B5CF6" badge="Módulo 1" testid="calc-mesocycle">
      <Select label="Tipo" value={tipo} onChange={setTipo} options={[
        { value: 'ordinary', label: 'Ordinario' }, { value: 'shock', label: 'De Choque' },
        { value: 'recovery', label: 'Recuperativo' }, { value: 'competitive', label: 'Competitivo' }
      ]} />
      <Field label="Vol. base referencia" value={vol} onChange={setVol} unit="%" />
      <BigResult value={`${cfg.v}%`} label="Volumen relativo" color={cfg.c} sub={cfg.txt} />
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Volumen ajustado" value={`${Math.round(num(vol) * cfg.v / 100)}%`} color={cfg.c} />
        <MiniStat label="Intensidad" value={`${cfg.i}%`} color={cfg.c} />
      </div>
    </CalcCard>
  );
};

export const CalcMicrocycle = () => {
  const [tipo, setTipo] = useState('ordinary');
  const [sesiones, setSesiones] = useState(5);
  const [carga, setCarga] = useState(100);
  const [recup, setRecup] = useState(60);
  const tipos = {
    ordinary:    { dur: 7, ratio: 1.6, txt: 'Microciclo ordinario · trabajo equilibrado' },
    shock:       { dur: 7, ratio: 2.5, txt: 'Microciclo de choque · alta densidad' },
    recovery:    { dur: 7, ratio: 0.7, txt: 'Microciclo recuperativo · descarga' },
    competitive: { dur: 7, ratio: 1.2, txt: 'Microciclo competitivo · tapering' },
    intro:       { dur: 7, ratio: 0.9, txt: 'Microciclo introductorio · adaptación' },
  };
  const cfg = tipos[tipo];
  const densidad = num(carga) / Math.max(num(recup), 1);
  return (
    <CalcCard title="Microciclo · Tipo + Densidad de carga" subtitle="Ratio carga/recuperación · sesiones por semana" icon={Repeat} color="#06B6D4" badge="Módulo 1" testid="calc-microcycle">
      <Select label="Tipo" value={tipo} onChange={setTipo} options={[
        { value: 'ordinary', label: 'Ordinario' }, { value: 'shock', label: 'Choque' },
        { value: 'recovery', label: 'Recuperativo' }, { value: 'competitive', label: 'Competitivo' },
        { value: 'intro', label: 'Introductorio' }
      ]} />
      <Field label="Sesiones / semana" value={sesiones} onChange={setSesiones} />
      <Field label="Carga (min)" value={carga} onChange={setCarga} unit="min" />
      <Field label="Recup. activa (min)" value={recup} onChange={setRecup} unit="min" />
      <BigResult value={fmt(densidad, 2)} label="Densidad carga/recup" color="#06B6D4" sub={`${cfg.txt} · ratio referencia ${cfg.ratio}`} />
    </CalcCard>
  );
};

export const CalcSession = () => {
  const [total, setTotal] = useState(90);
  const [tipo, setTipo] = useState('strength');
  const dist = {
    strength:    { wu: 0.20, main: 0.65, cd: 0.15, txt: 'Fuerza · 20/65/15' },
    endurance:   { wu: 0.15, main: 0.75, cd: 0.10, txt: 'Resistencia · 15/75/10' },
    speed:       { wu: 0.30, main: 0.55, cd: 0.15, txt: 'Velocidad · 30/55/15 (WU largo)' },
    technique:   { wu: 0.25, main: 0.65, cd: 0.10, txt: 'Técnica · 25/65/10' },
    competitive: { wu: 0.30, main: 0.60, cd: 0.10, txt: 'Competitivo · 30/60/10' },
  };
  const cfg = dist[tipo]; const t = num(total);
  return (
    <CalcCard title="Sesión · Estructura WU / Principal / CD" subtitle="Distribución de tiempo + índice de fatiga" icon={Clock} color="#F59E0B" badge="Módulo 1" testid="calc-session">
      <Field label="Duración total" value={total} onChange={setTotal} unit="min" />
      <Select label="Tipo de sesión" value={tipo} onChange={setTipo} options={[
        { value: 'strength', label: 'Fuerza' }, { value: 'endurance', label: 'Resistencia' },
        { value: 'speed', label: 'Velocidad' }, { value: 'technique', label: 'Técnica' },
        { value: 'competitive', label: 'Competitiva' }
      ]} />
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Calentamiento" value={`${Math.round(t * cfg.wu)} min`} color="#F59E0B" />
        <MiniStat label="Parte principal" value={`${Math.round(t * cfg.main)} min`} color="#DC2626" />
        <MiniStat label="Vuelta calma" value={`${Math.round(t * cfg.cd)} min`} color="#10B981" />
      </div>
      <p className="text-[10px] text-slate-500 italic">{cfg.txt} · Índice de fatiga ≈ {fmt((t * cfg.main) / 60 * (cfg.main * 100), 0)} UA</p>
    </CalcCard>
  );
};

// ========= MÓDULO 10 — PERIODIZACIÓN AVANZADA =========

export const GenLinear = () => {
  const [weeks, setWeeks] = useState(12);
  const [startVol, setStartVol] = useState(100);
  const [startInt, setStartInt] = useState(60);
  const w = num(weeks);
  const grid = Array.from({ length: w }, (_, i) => {
    const progress = i / Math.max(w - 1, 1);
    return {
      sem: i + 1,
      vol: Math.round(num(startVol) * (1 - progress * 0.5)),
      int: Math.round(num(startInt) + progress * 40)
    };
  });
  return (
    <CalcCard title="Generador · Periodización LINEAL" subtitle="Volumen ↘ · Intensidad ↗ (Matveiev clásico)" icon={GitBranch} color="#3B82F6" badge="Módulo 10" testid="calc-gen-linear">
      <div className="grid grid-cols-3 gap-2">
        <Field label="Semanas" value={weeks} onChange={setWeeks} />
        <Field label="Vol inicial" value={startVol} onChange={setStartVol} unit="%" />
        <Field label="Int inicial" value={startInt} onChange={setStartInt} unit="%" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-200">
            <th className="text-left p-1 font-bold text-slate-500">Sem</th>
            <th className="text-right p-1 font-bold text-blue-500">Vol %</th>
            <th className="text-right p-1 font-bold text-red-500">Int %</th>
          </tr></thead>
          <tbody>
            {grid.map(r => (
              <tr key={r.sem} className="border-b border-slate-100">
                <td className="p-1 font-bold">{r.sem}</td>
                <td className="p-1 text-right tabular-nums">{r.vol}</td>
                <td className="p-1 text-right tabular-nums">{r.int}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CalcCard>
  );
};

export const GenDUP = () => {
  const [weeks, setWeeks] = useState(8);
  const w = num(weeks);
  const days = ['Hipertrofia', 'Fuerza', 'Potencia'];
  const intensities = { 'Hipertrofia': '70-75%', 'Fuerza': '80-87%', 'Potencia': '90-95%' };
  const reps = { 'Hipertrofia': '8-12', 'Fuerza': '4-6', 'Potencia': '1-3' };
  return (
    <CalcCard title="Generador · DUP (Daily Undulating)" subtitle="3 sesiones/sem rotando hipertrofia/fuerza/potencia" icon={RotateCw} color="#EC4899" badge="Módulo 10" testid="calc-gen-dup">
      <Field label="Semanas" value={weeks} onChange={setWeeks} />
      <div className="space-y-1">
        {Array.from({ length: w }, (_, i) => i + 1).slice(0, 6).map(sem => (
          <div key={sem} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-md text-xs">
            <span className="font-bold tabular-nums w-12">SEM {sem}</span>
            {days.map((d, di) => (
              <div key={di} className="flex-1 text-center px-2 py-1 rounded" style={{ background: ['#EC489920', '#3B82F620', '#DC262620'][di] }}>
                <p className="font-bold text-[10px]" style={{ color: ['#EC4899', '#3B82F6', '#DC2626'][di] }}>{d}</p>
                <p className="text-[9px] text-slate-600">{reps[d]} · {intensities[d]}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      {w > 6 && <p className="text-[10px] text-slate-500 italic">+ {w - 6} semanas más siguiendo el mismo patrón</p>}
    </CalcCard>
  );
};

export const GenBlocks = () => {
  const [weeks, setWeeks] = useState(12);
  const w = num(weeks);
  const fases = [
    { f: 'Acumulación', dur: Math.ceil(w * 0.35), goal: 'Volumen alto · técnica · base aeróbica', c: '#3B82F6' },
    { f: 'Transformación', dur: Math.ceil(w * 0.35), goal: 'Intensidad creciente · trabajo específico', c: '#F59E0B' },
    { f: 'Realización', dur: Math.floor(w * 0.30), goal: 'Velocidad/potencia máxima · puesta a punto', c: '#DC2626' }
  ];
  return (
    <CalcCard title="Generador · Bloques ATR (Issurin)" subtitle="Acumulación → Transformación → Realización" icon={Layers} color="#0F172A" badge="Módulo 10" testid="calc-gen-atr">
      <Field label="Semanas totales" value={weeks} onChange={setWeeks} />
      <div className="space-y-2">
        {fases.map(f => (
          <div key={f.f} className="rounded-xl p-3" style={{ background: `${f.c}15`, borderLeft: `4px solid ${f.c}` }}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm" style={{ color: f.c }}>{f.f}</span>
              <span className="text-xs font-bold tabular-nums">{f.dur} sem</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">{f.goal}</p>
          </div>
        ))}
      </div>
    </CalcCard>
  );
};

export const GenReverse = () => {
  const [comp, setComp] = useState('2024-12-15');
  const fases = [
    { name: 'Tapering', delta: -2, c: '#10B981', desc: '2 sem antes · descarga 40%' },
    { name: 'Pico Específico', delta: -6, c: '#DC2626', desc: '6 sem antes · alta intensidad' },
    { name: 'Específico', delta: -12, c: '#F59E0B', desc: '12 sem antes · trabajo específico' },
    { name: 'Preparatorio', delta: -24, c: '#3B82F6', desc: '24 sem antes · base general' },
  ];
  const cd = new Date(comp);
  return (
    <CalcCard title="Planificación INVERSA desde fecha competición" subtitle="Anclaje en pico · cuenta regresiva" icon={Target} color="#7C3AED" badge="Módulo 10" testid="calc-gen-reverse">
      <Field label="Fecha objetivo" value={comp} onChange={setComp} type="date" />
      <div className="space-y-1.5">
        {fases.map(f => {
          const d = new Date(cd); d.setDate(d.getDate() + f.delta * 7);
          return (
            <div key={f.name} className="flex items-center gap-2 p-2 rounded-md text-xs" style={{ background: `${f.c}10`, borderLeft: `3px solid ${f.c}` }}>
              <span className="font-bold w-32" style={{ color: f.c }}>{f.name}</span>
              <span className="font-mono tabular-nums">{d.toISOString().split('T')[0]}</span>
              <span className="flex-1 text-slate-600 text-[10px]">{f.desc}</span>
            </div>
          );
        })}
      </div>
    </CalcCard>
  );
};

export const GenATR = () => {
  const [blocks, setBlocks] = useState(3);
  const b = num(blocks);
  return (
    <CalcCard title="Modelo ATR (Issurin) · ciclos repetitivos" subtitle="Acumulación + Transformación + Realización × N" icon={GitBranch} color="#7C3AED" badge="Módulo 10" testid="calc-gen-atr-cycles">
      <Field label="N° ciclos ATR" value={blocks} onChange={setBlocks} />
      <div className="space-y-1.5">
        {Array.from({ length: b }, (_, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-xs font-bold w-16">Ciclo {i + 1}</span>
            <div className="flex-1 grid grid-cols-3 gap-1">
              <div className="text-center bg-blue-50 border-l-2 border-blue-500 px-2 py-1 rounded">
                <p className="text-[9px] font-bold text-blue-600">A · 4 sem</p></div>
              <div className="text-center bg-amber-50 border-l-2 border-amber-500 px-2 py-1 rounded">
                <p className="text-[9px] font-bold text-amber-600">T · 4 sem</p></div>
              <div className="text-center bg-red-50 border-l-2 border-red-500 px-2 py-1 rounded">
                <p className="text-[9px] font-bold text-red-600">R · 2 sem</p></div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 italic">Total: {b * 10} sem · {b} mini-picos competitivos</p>
    </CalcCard>
  );
};

export const GenWUP = () => {
  const [weeks, setWeeks] = useState(8);
  const w = num(weeks);
  const pattern = ['Hipertrofia', 'Fuerza', 'Potencia', 'Descarga'];
  const colors = ['#EC4899', '#3B82F6', '#DC2626', '#10B981'];
  return (
    <CalcCard title="Generador · WUP (Weekly Undulating)" subtitle="Énfasis semanal rotativo · 4 semanas/ciclo" icon={Repeat} color="#06B6D4" badge="Módulo 10" testid="calc-gen-wup">
      <Field label="Semanas" value={weeks} onChange={setWeeks} />
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: w }, (_, i) => {
          const idx = i % 4;
          return (
            <div key={i} className="text-center rounded-md p-2" style={{ background: `${colors[idx]}15`, borderTop: `3px solid ${colors[idx]}` }}>
              <p className="text-[9px] text-slate-500 font-bold">SEM {i + 1}</p>
              <p className="text-[10px] font-bold" style={{ color: colors[idx] }}>{pattern[idx]}</p>
            </div>
          );
        })}
      </div>
    </CalcCard>
  );
};
