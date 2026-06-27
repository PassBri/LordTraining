// MÓDULOS 2 (Carga y Fuerza), 5 (Biomecánica), 6 (Tests)
import React, { useState, useMemo } from 'react';
import { Dumbbell, Zap, Activity, Target, Award, Gauge, TrendingUp, Trophy, Layers } from 'lucide-react';
import { CalcCard, Field, Select, BigResult, MiniStat, useCalcT, num, round, fmt } from './CalcShared';

// ========= MÓDULO 2 =========

// 1RM con 7 fórmulas
export const Calc1RM = () => {
  const [peso, setPeso] = useState(100);
  const [reps, setReps] = useState(5);
  const formulas = useMemo(() => {
    const w = num(peso); const r = num(reps);
    if (!w || !r || r < 1) return null;
    return {
      epley: w * (1 + r / 30),
      brzycki: r >= 37 ? null : w * 36 / (37 - r),
      lander: r >= 38 ? null : (100 * w) / (101.3 - 2.67 * r),
      lombardi: w * Math.pow(r, 0.10),
      mayhew: w / (0.522 + 0.419 * Math.exp(-0.055 * r)),
      oconnor: w * (1 + 0.025 * r),
      wathan: (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)),
    };
  }, [peso, reps]);
  const avg = formulas ? Object.values(formulas).filter(v => v != null).reduce((a, b) => a + b, 0) / Object.values(formulas).filter(v => v != null).length : null;

  return (
    <CalcCard title="1RM — Repetición Máxima" subtitle="7 fórmulas científicas + promedio ponderado" icon={Dumbbell} color="#3B82F6" badge="Módulo 2" testid="calc-1rm">
      <Field label="Peso levantado" value={peso} onChange={setPeso} unit="kg" testid="calc-1rm-peso" />
      <Field label="Repeticiones" value={reps} onChange={setReps} unit="reps" testid="calc-1rm-reps" />
      {formulas && (
        <>
          <BigResult value={fmt(avg, 1)} label="1RM Promedio Ponderado" unit="kg" color="#3B82F6" sub="Recomendado para programación" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <MiniStat label="Epley" value={fmt(formulas.epley, 1, ' kg')} />
            <MiniStat label="Brzycki" value={fmt(formulas.brzycki, 1, ' kg')} />
            <MiniStat label="Lander" value={fmt(formulas.lander, 1, ' kg')} />
            <MiniStat label="Lombardi" value={fmt(formulas.lombardi, 1, ' kg')} />
            <MiniStat label="Mayhew" value={fmt(formulas.mayhew, 1, ' kg')} />
            <MiniStat label="O'Connor" value={fmt(formulas.oconnor, 1, ' kg')} />
            <MiniStat label="Wathan" value={fmt(formulas.wathan, 1, ' kg')} />
          </div>
        </>
      )}
    </CalcCard>
  );
};

// %1RM → Zonas
export const CalcPercentage1RM = () => {
  const tc = useCalcT();
  const [oneRM, setOneRM] = useState(100);
  const w = num(oneRM);
  const zones = [
    { range: '90-100%', goal: 'Fuerza Máxima', reps: '1-3', color: '#DC2626' },
    { range: '80-90%', goal: 'Fuerza', reps: '3-6', color: '#EA580C' },
    { range: '70-80%', goal: 'Hipertrofia', reps: '8-12', color: '#CA8A04' },
    { range: '60-70%', goal: 'Resistencia muscular', reps: '12-15', color: '#16A34A' },
    { range: '<60%', goal: 'Resistencia local / Recuperación', reps: '15+', color: '#3B82F6' },
  ];
  return (
    <CalcCard title="% de 1RM → Zonas de entrenamiento" subtitle="Carga relativa por objetivo" icon={Target} color="#8B5CF6" badge="Módulo 2" testid="calc-percent-1rm">
      <Field label="1RM" value={oneRM} onChange={setOneRM} unit="kg" testid="calc-percent-1rm-input" />
      <div className="space-y-1.5 mt-2">
        {zones.map(z => {
          const [lo, hi] = z.range.includes('<') ? [0, 60] : z.range.replace('%', '').split('-').map(Number);
          const wLo = w * lo / 100; const wHi = w * hi / 100;
          return (
            <div key={z.range} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: `${z.color}10`, borderLeft: `3px solid ${z.color}` }}>
              <span className="text-xs font-bold tabular-nums" style={{ color: z.color, minWidth: '60px' }}>{z.range}</span>
              <span className="text-xs flex-1 font-semibold">{tc(z.goal)}</span>
              <span className="text-xs text-slate-500">{z.reps} reps</span>
              <span className="text-xs font-mono font-bold tabular-nums">{fmt(wLo, 1)}–{fmt(wHi, 1)} kg</span>
            </div>
          );
        })}
      </div>
    </CalcCard>
  );
};

// Volumen + MEV/MAV/MRV
export const CalcVolume = () => {
  const [series, setSeries] = useState(4);
  const [reps, setReps] = useState(10);
  const [peso, setPeso] = useState(80);
  const [grupo, setGrupo] = useState('pecho');
  const volumen = num(series) * num(reps) * num(peso);
  const mevMavMrv = {
    pecho: [8, 12, 22], espalda: [10, 14, 25], piernas: [8, 12, 18],
    hombros: [8, 16, 26], biceps: [8, 14, 26], triceps: [6, 14, 22],
    core: [0, 16, 28], pantorrillas: [8, 16, 25],
  }[grupo] || [8, 12, 22];
  return (
    <CalcCard title="Volumen de Carga · MEV/MAV/MRV" subtitle="Tonelaje + sets semanales óptimos" icon={Layers} color="#EF4444" badge="Módulo 2" testid="calc-volume">
      <div className="grid grid-cols-3 gap-2">
        <Field label="Series" value={series} onChange={setSeries} unit="" />
        <Field label="Reps" value={reps} onChange={setReps} unit="" />
        <Field label="Peso" value={peso} onChange={setPeso} unit="kg" />
      </div>
      <Select label="Grupo" value={grupo} onChange={setGrupo} options={[
        { value: 'pecho', label: 'Pecho' }, { value: 'espalda', label: 'Espalda' }, { value: 'piernas', label: 'Piernas' },
        { value: 'hombros', label: 'Hombros' }, { value: 'biceps', label: 'Bíceps' }, { value: 'triceps', label: 'Tríceps' },
        { value: 'core', label: 'Core' }, { value: 'pantorrillas', label: 'Pantorrillas' }
      ]} />
      <BigResult value={fmt(volumen, 0)} label="Volumen total (tonelaje)" unit="kg" color="#EF4444" />
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="MEV (mín)" value={`${mevMavMrv[0]} sets`} color="#16A34A" />
        <MiniStat label="MAV (óptimo)" value={`${mevMavMrv[1]} sets`} color="#3B82F6" />
        <MiniStat label="MRV (máx)" value={`${mevMavMrv[2]} sets`} color="#DC2626" />
      </div>
      <p className="text-[10px] text-slate-500 italic">Sets semanales por grupo muscular · MEV: Mínimo Volumen Efectivo · MAV: Adaptación Máxima · MRV: Recuperable</p>
    </CalcCard>
  );
};

// RPE / RIR
export const CalcRPE = () => {
  const [rpe, setRpe] = useState(8);
  const [oneRM, setOneRM] = useState(100);
  // RPE 10 = 1RM. Tabla de Tuchscherer
  const rpeToPercent = { 10: 1.00, 9.5: 0.978, 9: 0.955, 8.5: 0.933, 8: 0.910, 7.5: 0.888, 7: 0.865, 6.5: 0.843, 6: 0.820 };
  const r = num(rpe); const w = num(oneRM);
  const closest = Object.keys(rpeToPercent).map(Number).sort((a, b) => Math.abs(a - r) - Math.abs(b - r))[0];
  const pct = rpeToPercent[closest] || 0.85;
  const carga = w * pct;
  const rir = Math.max(0, 10 - r);
  return (
    <CalcCard title="RPE / RIR ↔ % 1RM" subtitle="Convertidor escala Borg + reps en reserva" icon={Gauge} color="#F59E0B" badge="Módulo 2" testid="calc-rpe">
      <Field label="RPE (1-10)" value={rpe} onChange={setRpe} step="0.5" testid="calc-rpe-input" />
      <Field label="1RM" value={oneRM} onChange={setOneRM} unit="kg" />
      <BigResult value={`${fmt(pct * 100, 0)}%`} label="% de 1RM equivalente" color="#F59E0B" sub={`Carga sugerida: ${fmt(carga, 1)} kg · RIR: ~${rir.toFixed(0)} reps`} />
    </CalcCard>
  );
};

// ========= MÓDULO 5 — BIOMECÁNICA =========

// Potencia mecánica P=F×v
export const CalcMechPower = () => {
  const [F, setF] = useState(800);
  const [v, setV] = useState(0.5);
  const P = num(F) * num(v);
  return (
    <CalcCard title="Potencia mecánica · P = F × v" subtitle="Watts a partir de fuerza y velocidad" icon={Zap} color="#10B981" badge="Módulo 5" testid="calc-mech-power">
      <Field label="Fuerza" value={F} onChange={setF} unit="N" />
      <Field label="Velocidad" value={v} onChange={setV} unit="m/s" />
      <BigResult value={fmt(P, 1)} label="Potencia mecánica" unit="W" color="#10B981" />
    </CalcCard>
  );
};

// Salto vertical: Bosco / Lewis / Sayers
export const CalcJumpPower = () => {
  const [h, setH] = useState(45);     // cm
  const [m, setM] = useState(75);     // kg
  const [tv, setTv] = useState(0.6);  // tiempo de vuelo (Bosco)
  const hM = num(h) / 100; const mass = num(m); const tvN = num(tv);
  const lewis = mass * Math.sqrt(2 * 9.81 * hM) * 0.5 * 9.81 * 1; // simplificado
  const sayers = 60.7 * num(h) + 45.3 * mass - 2055;
  // Bosco: P = (g²·tv·tt)/(4n(tt-tv)) — simplificado para CMJ único
  const bosco = (9.81 * 9.81 * tvN * 0.05) / (4 * 1 * 0.05) * mass; // estimación
  const altBosco = (9.81 * tvN * tvN) / 8 * 100; // altura cm desde flight time
  return (
    <CalcCard title="Salto vertical · Potencia (Bosco/Lewis/Sayers)" subtitle="Estimación de potencia anaeróbica" icon={TrendingUp} color="#8B5CF6" badge="Módulo 5" testid="calc-jump">
      <Field label="Altura salto" value={h} onChange={setH} unit="cm" />
      <Field label="Masa corporal" value={m} onChange={setM} unit="kg" />
      <Field label="Tiempo vuelo (Bosco)" value={tv} onChange={setTv} unit="s" />
      <BigResult value={fmt(sayers, 0)} label="Sayers (potencia pico)" unit="W" color="#8B5CF6" sub={`Lewis: ${fmt(lewis, 0)} W · Bosco h calc: ${fmt(altBosco, 1)} cm`} />
    </CalcCard>
  );
};

// VBT — velocidad de barra
export const CalcVBT = () => {
  const [v, setV] = useState(0.5);
  // Tabla VBT clásica para sentadilla
  const tabla = [
    { v: 1.0, p: 50 }, { v: 0.9, p: 60 }, { v: 0.8, p: 67 }, { v: 0.7, p: 75 },
    { v: 0.6, p: 80 }, { v: 0.5, p: 85 }, { v: 0.4, p: 90 }, { v: 0.3, p: 95 }, { v: 0.2, p: 100 }
  ];
  const vN = num(v);
  const closest = tabla.reduce((p, c) => Math.abs(c.v - vN) < Math.abs(p.v - vN) ? c : p);
  return (
    <CalcCard title="VBT — Velocity Based Training" subtitle="Velocidad de barra → % 1RM (sentadilla)" icon={Activity} color="#06B6D4" badge="Módulo 5" testid="calc-vbt">
      <Field label="Velocidad media" value={v} onChange={setV} unit="m/s" />
      <BigResult value={`${closest.p}%`} label="% 1RM aproximado" color="#06B6D4" sub={`Velocidad ${closest.v} m/s · ${closest.p < 70 ? 'Velocidad/Potencia' : closest.p < 85 ? 'Hipertrofia/Fuerza' : 'Fuerza máxima'}`} />
    </CalcCard>
  );
};

// ========= MÓDULO 6 — TESTS =========

// Cooper VO2max
export const CalcCooper = () => {
  const [d, setD] = useState(2400);
  const vo2 = (num(d) - 504.9) / 44.73;
  return (
    <CalcCard title="Test de Cooper · 12 min" subtitle="Distancia → VO₂ máx estimado" icon={Activity} color="#EF4444" badge="Módulo 6" testid="calc-cooper">
      <Field label="Distancia 12 min" value={d} onChange={setD} unit="m" />
      <BigResult value={fmt(vo2, 1)} label="VO₂ máx estimado" unit="ml/kg/min" color="#EF4444" sub={vo2 > 60 ? 'Excelente · atleta de élite' : vo2 > 50 ? 'Muy bueno' : vo2 > 40 ? 'Bueno' : vo2 > 30 ? 'Aceptable' : 'Bajo'} />
    </CalcCard>
  );
};

// Yo-Yo
export const CalcYoYo = () => {
  const [d, setD] = useState(1200);
  const vo2 = num(d) * 0.0084 + 36.4;
  return (
    <CalcCard title="Test Yo-Yo Intermittent Recovery L1" subtitle="Distancia total → VO₂ máx" icon={Activity} color="#EA580C" badge="Módulo 6" testid="calc-yoyo">
      <Field label="Distancia total" value={d} onChange={setD} unit="m" />
      <BigResult value={fmt(vo2, 1)} label="VO₂ máx estimado" unit="ml/kg/min" color="#EA580C" />
    </CalcCard>
  );
};

// Course-Navette (Léger)
export const CalcLeger = () => {
  const [palier, setPalier] = useState(10);
  const v = 8 + 0.5 * num(palier);    // velocidad final (km/h)
  const vo2 = 5.857 * v - 19.458;
  return (
    <CalcCard title="Course-Navette / Léger 20m" subtitle="Palier alcanzado → VO₂ máx" icon={Activity} color="#CA8A04" badge="Módulo 6" testid="calc-leger">
      <Field label="Palier alcanzado" value={palier} onChange={setPalier} unit="" />
      <BigResult value={fmt(vo2, 1)} label="VO₂ máx estimado" unit="ml/kg/min" color="#CA8A04" sub={`Velocidad final ${fmt(v, 1)} km/h`} />
    </CalcCard>
  );
};

// Wingate
export const CalcWingate = () => {
  const [pico, setPico] = useState(900);
  const [media, setMedia] = useState(600);
  const [m, setM] = useState(75);
  const ppRel = num(pico) / num(m);
  const pmRel = num(media) / num(m);
  return (
    <CalcCard title="Test de Wingate · 30s" subtitle="Potencia anaeróbica pico y media" icon={Zap} color="#DC2626" badge="Módulo 6" testid="calc-wingate">
      <Field label="Potencia pico" value={pico} onChange={setPico} unit="W" />
      <Field label="Potencia media" value={media} onChange={setMedia} unit="W" />
      <Field label="Masa" value={m} onChange={setM} unit="kg" />
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="P. pico relativa" value={fmt(ppRel, 1, ' W/kg')} color="#DC2626" />
        <MiniStat label="P. media rel." value={fmt(pmRel, 1, ' W/kg')} color="#EA580C" />
      </div>
      <p className="text-[10px] text-slate-500 italic">Índice de fatiga = (Ppico - Pmín) / Ppico × 100</p>
    </CalcCard>
  );
};

// Wilks Score (powerlifting)
export const CalcWilks = () => {
  const [bw, setBw] = useState(80);
  const [total, setTotal] = useState(500);
  const [sex, setSex] = useState('m');
  const wilks = (() => {
    const w = num(bw); const t = num(total);
    const c = sex === 'm'
      ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8]
      : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8];
    const denom = c[0] + c[1] * w + c[2] * w * w + c[3] * w * w * w + c[4] * w * w * w * w + c[5] * w * w * w * w * w;
    return t * 500 / denom;
  })();
  return (
    <CalcCard title="Wilks Score · Powerlifting" subtitle="Comparativa entre levantadores por peso corporal" icon={Trophy} color="#EAB308" badge="Módulo 6" testid="calc-wilks">
      <Field label="Peso corporal" value={bw} onChange={setBw} unit="kg" />
      <Field label="Total (S+B+D)" value={total} onChange={setTotal} unit="kg" />
      <Select label="Sexo" value={sex} onChange={setSex} options={[{ value: 'm', label: 'Masculino' }, { value: 'f', label: 'Femenino' }]} />
      <BigResult value={fmt(wilks, 1)} label="Wilks Score" color="#EAB308" sub={wilks > 500 ? 'Élite mundial' : wilks > 400 ? 'Avanzado' : wilks > 300 ? 'Intermedio' : 'Principiante'} />
    </CalcCard>
  );
};

// IPF GL Points (simplificado)
export const CalcIPFPoints = () => {
  const [bw, setBw] = useState(80);
  const [total, setTotal] = useState(500);
  const [event, setEvent] = useState('classic_men');
  const w = num(bw); const t = num(total);
  // Coeficientes oficiales IPF GL 2020
  const C = {
    classic_men:  [1199.72839, 1025.18162, 0.00921],
    classic_women:[610.32796, 1045.59282, 0.03048],
    raw_men:      [1199.72839, 1025.18162, 0.00921],
    raw_women:    [610.32796, 1045.59282, 0.03048],
  }[event];
  const denom = C[0] - C[1] * Math.exp(-C[2] * w);
  const pts = t * 100 / denom;
  return (
    <CalcCard title="IPF GL Points" subtitle="Goodlift Points — comparativa internacional" icon={Award} color="#3B82F6" badge="Módulo 6" testid="calc-ipf">
      <Field label="Peso corporal" value={bw} onChange={setBw} unit="kg" />
      <Field label="Total" value={total} onChange={setTotal} unit="kg" />
      <Select label="Categoría" value={event} onChange={setEvent} options={[
        { value: 'classic_men', label: 'Classic Hombres' }, { value: 'classic_women', label: 'Classic Mujeres' },
        { value: 'raw_men', label: 'Raw Hombres' }, { value: 'raw_women', label: 'Raw Mujeres' }
      ]} />
      <BigResult value={fmt(pts, 1)} label="IPF GL Points" color="#3B82F6" sub={pts > 100 ? 'Élite IPF' : pts > 80 ? 'Avanzado' : 'Intermedio'} />
    </CalcCard>
  );
};

// DOTS Score
export const CalcDOTS = () => {
  const [bw, setBw] = useState(80);
  const [total, setTotal] = useState(500);
  const [sex, setSex] = useState('m');
  const w = num(bw); const t = num(total);
  const C = sex === 'm'
    ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
    : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706];
  const denom = C[0] + C[1] * w + C[2] * w * w + C[3] * w * w * w + C[4] * w * w * w * w;
  const dots = t * 500 / denom;
  return (
    <CalcCard title="DOTS Score" subtitle="Dynamic Objective Team Scoring" icon={Award} color="#EC4899" badge="Módulo 6" testid="calc-dots">
      <Field label="Peso corporal" value={bw} onChange={setBw} unit="kg" />
      <Field label="Total" value={total} onChange={setTotal} unit="kg" />
      <Select label="Sexo" value={sex} onChange={setSex} options={[{ value: 'm', label: 'Masculino' }, { value: 'f', label: 'Femenino' }]} />
      <BigResult value={fmt(dots, 1)} label="DOTS Score" color="#EC4899" />
    </CalcCard>
  );
};

// CMJ/SJ/ABK simple
export const CalcCMJ = () => {
  const [tv, setTv] = useState(0.55);
  const h = (9.81 * num(tv) * num(tv)) / 8 * 100; // cm
  return (
    <CalcCard title="CMJ / SJ / ABK · Altura desde tiempo de vuelo" subtitle="h = (g·tv²)/8" icon={TrendingUp} color="#14B8A6" badge="Módulo 6" testid="calc-cmj">
      <Field label="Tiempo de vuelo" value={tv} onChange={setTv} unit="s" step="0.01" />
      <BigResult value={fmt(h, 1)} label="Altura del salto" unit="cm" color="#14B8A6" sub={h > 50 ? 'Élite explosivo' : h > 40 ? 'Muy bueno' : h > 30 ? 'Bueno' : 'Aceptable'} />
    </CalcCard>
  );
};
