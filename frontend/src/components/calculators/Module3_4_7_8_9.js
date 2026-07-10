// MÓDULOS 3 (Intensidad), 4 (Control de carga), 7 (Antropometría), 8 (Nutrición), 9 (Médico)
import React, { useState, useMemo } from 'react';
import { Heart, Activity, Zap, BarChart3, Ruler, Scale, Apple, Droplets, Brain, Bed } from 'lucide-react';
import { CalcCard, Field, Select, BigResult, MiniStat, useCalcT, num, fmt, round } from './CalcShared';

// ========= MÓDULO 3 — INTENSIDAD =========

export const CalcHRZones = () => {
  const tc = useCalcT();
  const [edad, setEdad] = useState(28);
  const [fcrep, setFcrep] = useState(60);
  const [fcmaxReal, setFcmaxReal] = useState('');
  const fcmax = num(fcmaxReal) || (220 - num(edad));
  const reserva = fcmax - num(fcrep);
  const zones = [
    { label: 'Z1 · Recuperación', lo: 50, hi: 60, color: '#D4AF37' },
    { label: 'Z2 · Aeróbico base', lo: 60, hi: 70, color: '#10B981' },
    { label: 'Z3 · Tempo', lo: 70, hi: 80, color: '#F59E0B' },
    { label: 'Z4 · Umbral', lo: 80, hi: 90, color: '#EA580C' },
    { label: 'Z5 · VO₂max', lo: 90, hi: 100, color: '#DC2626' },
  ];
  return (
    <CalcCard title="Zonas de FC · Karvonen + 220-edad" subtitle="Frecuencia cardíaca por intensidad" icon={Heart} color="#DC2626" badge="Módulo 3" testid="calc-hr-zones">
      <Field label="Edad" value={edad} onChange={setEdad} unit="años" />
      <Field label="FC reposo" value={fcrep} onChange={setFcrep} unit="lpm" />
      <Field label="FC máx real (opc)" value={fcmaxReal} onChange={setFcmaxReal} unit="lpm" placeholder={`${fcmax}`} />
      <BigResult value={fcmax} label="FC máxima" unit="lpm" color="#DC2626" sub={`Reserva (Karvonen): ${reserva} lpm`} />
      <div className="space-y-1 mt-2">
        {zones.map(z => {
          const lo = Math.round(num(fcrep) + reserva * z.lo / 100);
          const hi = Math.round(num(fcrep) + reserva * z.hi / 100);
          return (
            <div key={z.label} className="flex items-center gap-2 p-1.5 rounded-md text-xs" style={{ background: `${z.color}10`, borderLeft: `3px solid ${z.color}` }}>
              <span className="font-bold flex-1" style={{ color: z.color }}>{tc(z.label)}</span>
              <span className="text-slate-500">{z.lo}-{z.hi}%</span>
              <span className="font-mono font-bold tabular-nums">{lo}-{hi} lpm</span>
            </div>
          );
        })}
      </div>
    </CalcCard>
  );
};

export const CalcVO2 = () => {
  const [d, setD] = useState(2400);
  const vo2c = (num(d) - 504.9) / 44.73;
  return (
    <CalcCard title="VO₂ máx · Test Cooper" subtitle="Distancia 12 min → ml/kg/min" icon={Activity} color="#EF4444" badge="Módulo 3" testid="calc-vo2">
      <Field label="Distancia 12 min" value={d} onChange={setD} unit="m" />
      <BigResult value={fmt(vo2c, 1)} label="VO₂ máx" unit="ml/kg/min" color="#EF4444" />
    </CalcCard>
  );
};

export const CalcFTP = () => {
  const [test20, setTest20] = useState(280);
  const ftp = num(test20) * 0.95;
  const zones = [
    { z: 'Z1 · Recuperación', lo: 0, hi: 55, color: '#D4AF37' },
    { z: 'Z2 · Resistencia', lo: 56, hi: 75, color: '#10B981' },
    { z: 'Z3 · Tempo', lo: 76, hi: 90, color: '#F59E0B' },
    { z: 'Z4 · Umbral', lo: 91, hi: 105, color: '#EA580C' },
    { z: 'Z5 · VO₂max', lo: 106, hi: 120, color: '#DC2626' },
    { z: 'Z6 · Anaeróbico', lo: 121, hi: 150, color: '#9333EA' },
    { z: 'Z7 · Neuromuscular', lo: 151, hi: 999, color: '#0F172A' },
  ];
  return (
    <CalcCard title="FTP · Zonas de Potencia (W) · Coggan" subtitle="Test 20 min × 0.95 = FTP" icon={Zap} color="#9333EA" badge="Módulo 3" testid="calc-ftp">
      <Field label="Potencia media test 20'" value={test20} onChange={setTest20} unit="W" />
      <BigResult value={fmt(ftp, 0)} label="FTP" unit="W" color="#9333EA" />
      <div className="space-y-1">
        {zones.map(z => (
          <div key={z.z} className="flex items-center gap-2 p-1.5 rounded-md text-xs" style={{ background: `${z.color}10`, borderLeft: `3px solid ${z.color}` }}>
            <span className="font-bold flex-1" style={{ color: z.color }}>{z.z}</span>
            <span className="text-slate-500">{z.lo}-{z.hi === 999 ? '∞' : z.hi}%</span>
            <span className="font-mono font-bold tabular-nums">{Math.round(ftp * z.lo / 100)}-{z.hi === 999 ? '∞' : Math.round(ftp * z.hi / 100)} W</span>
          </div>
        ))}
      </div>
    </CalcCard>
  );
};

export const CalcPace = () => {
  const [d, setD] = useState(10);
  const [t, setT] = useState(45);
  const paceMin = num(t) / num(d);
  const min = Math.floor(paceMin); const sec = Math.round((paceMin - min) * 60);
  const kmh = num(d) / (num(t) / 60);
  return (
    <CalcCard title="Pace de Carrera · min/km" subtitle="Ritmo + velocidad equivalente" icon={Activity} color="#16A34A" badge="Módulo 3" testid="calc-pace">
      <Field label="Distancia" value={d} onChange={setD} unit="km" />
      <Field label="Tiempo total" value={t} onChange={setT} unit="min" />
      <BigResult value={`${min}:${String(sec).padStart(2, '0')}`} label="Pace medio" unit="min/km" color="#16A34A" sub={`Velocidad: ${fmt(kmh, 2)} km/h`} />
    </CalcCard>
  );
};

export const CalcLactate = () => {
  const [fcmax, setFcmax] = useState(195);
  const lt1 = round(num(fcmax) * 0.75, 0);
  const lt2 = round(num(fcmax) * 0.88, 0);
  return (
    <CalcCard title="Lactato Umbral · LT1 / LT2 estimado" subtitle="LT1 ≈ 75% FCmáx · LT2 ≈ 88% FCmáx" icon={Heart} color="#EAB308" badge="Módulo 3" testid="calc-lactate">
      <Field label="FC máx" value={fcmax} onChange={setFcmax} unit="lpm" />
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="LT1 · aeróbico" value={`${lt1} lpm`} color="#10B981" />
        <MiniStat label="LT2 · anaeróbico" value={`${lt2} lpm`} color="#DC2626" />
      </div>
    </CalcCard>
  );
};

// ========= MÓDULO 4 — CONTROL DE CARGA =========

export const CalcACWR = () => {
  const [aguda, setAguda] = useState(450);
  const [cronica, setCronica] = useState(500);
  const ratio = num(aguda) / num(cronica);
  const status = ratio < 0.8 ? { txt: 'Detraining (carga baja)', c: '#D4AF37' }
    : ratio <= 1.3 ? { txt: 'Sweet spot ✓', c: '#16A34A' }
      : ratio <= 1.5 ? { txt: 'Zona de riesgo', c: '#F59E0B' }
        : { txt: 'Alto riesgo lesional ⚠', c: '#DC2626' };
  return (
    <CalcCard title="ACWR · Acute:Chronic Workload Ratio" subtitle="Aguda / Crónica (carga semana / 4-sem promedio)" icon={BarChart3} color="#0F172A" badge="Módulo 4" testid="calc-acwr">
      <Field label="Carga aguda (UA · 7d)" value={aguda} onChange={setAguda} unit="UA" />
      <Field label="Carga crónica (UA · 28d)" value={cronica} onChange={setCronica} unit="UA" />
      <BigResult value={fmt(ratio, 2)} label="ACWR" color={status.c} sub={status.txt} />
    </CalcCard>
  );
};

export const CalcTSB = () => {
  const [ctl, setCtl] = useState(85);
  const [atl, setAtl] = useState(95);
  const tsb = num(ctl) - num(atl);
  const status = tsb > 25 ? 'Forma · descanso' : tsb > 5 ? 'Forma · listo' : tsb > -10 ? 'Equilibrio' : tsb > -30 ? 'Carga · acumulando' : 'Sobrecarga ⚠';
  return (
    <CalcCard title="TSB · Training Stress Balance (Forma)" subtitle="CTL − ATL = Forma actual" icon={BarChart3} color="#06B6D4" badge="Módulo 4" testid="calc-tsb">
      <Field label="CTL · Fitness (42d)" value={ctl} onChange={setCtl} unit="" />
      <Field label="ATL · Fatiga (7d)" value={atl} onChange={setAtl} unit="" />
      <BigResult value={fmt(tsb, 1)} label="TSB" color={tsb > 5 ? '#16A34A' : tsb < -20 ? '#DC2626' : '#F59E0B'} sub={status} />
    </CalcCard>
  );
};

export const CalcMonotonia = () => {
  const tc = useCalcT();
  const [cargas, setCargas] = useState('300,420,380,500,450,200,0');
  const arr = cargas.split(',').map(s => num(s)).filter(v => !isNaN(v));
  const media = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const sd = arr.length > 1 ? Math.sqrt(arr.map(x => (x - media) ** 2).reduce((a, b) => a + b, 0) / arr.length) : 0;
  const monotonia = sd > 0 ? media / sd : 0;
  const total = arr.reduce((a, b) => a + b, 0);
  const strain = total * monotonia;
  return (
    <CalcCard title="Monotonía de Foster + Strain" subtitle="Media/SD diaria · Strain = Total × Monotonía" icon={BarChart3} color="#7C3AED" badge="Módulo 4" testid="calc-monotonia">
      <div className="grid grid-cols-3 items-center gap-2">
        <label className="text-xs font-semibold text-slate-600">{tc('Cargas (7d)')}</label>
        <textarea value={cargas} onChange={(e) => setCargas(e.target.value)} className="col-span-2 h-16 text-xs border rounded p-2 font-mono"
          placeholder={tc('separadas por coma')} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Total" value={fmt(total, 0)} />
        <MiniStat label="Monotonía" value={fmt(monotonia, 2)} color={monotonia > 2 ? '#DC2626' : monotonia > 1.5 ? '#F59E0B' : '#16A34A'} />
        <MiniStat label="Strain" value={fmt(strain, 0)} color={strain > 6000 ? '#DC2626' : '#0F172A'} />
      </div>
      <p className="text-[10px] text-slate-500 italic">Monotonía &gt;2 + Strain &gt;6000 → riesgo lesión/enfermedad</p>
    </CalcCard>
  );
};

export const CalcRecovery = () => {
  const [sueno, setSueno] = useState(7);
  const [dolor, setDolor] = useState(6);
  const [energia, setEnergia] = useState(7);
  const [estres, setEstres] = useState(6);
  const [animo, setAnimo] = useState(7);
  const total = num(sueno) + num(dolor) + num(energia) + num(estres) + num(animo);
  const pct = total / 50 * 100;
  return (
    <CalcCard title="Índice de Recuperación Percibida" subtitle="Hooper Index modificado · 5 dimensiones × 10" icon={Bed} color="#10B981" badge="Módulo 4" testid="calc-recovery">
      <Field label="Calidad sueño" value={sueno} onChange={setSueno} unit="/10" />
      <Field label="Sin dolor muscular" value={dolor} onChange={setDolor} unit="/10" />
      <Field label="Energía" value={energia} onChange={setEnergia} unit="/10" />
      <Field label="Manejo estrés" value={estres} onChange={setEstres} unit="/10" />
      <Field label="Ánimo" value={animo} onChange={setAnimo} unit="/10" />
      <BigResult value={`${total}/50`} label="Índice de bienestar" color="#10B981" sub={`${fmt(pct, 0)}% · ${pct > 80 ? 'Listo para entrenar' : pct > 60 ? 'Aceptable' : 'Recuperación necesaria'}`} />
    </CalcCard>
  );
};

// ========= MÓDULO 7 — ANTROPOMETRÍA =========

export const CalcBMI = () => {
  const [peso, setPeso] = useState(75);
  const [talla, setTalla] = useState(175);
  const tM = num(talla) / 100;
  const bmi = num(peso) / (tM * tM);
  // OMS
  const cls = bmi < 16 ? { txt: 'Delgadez severa', c: '#7C3AED' }
    : bmi < 17 ? { txt: 'Delgadez moderada', c: '#9333EA' }
    : bmi < 18.5 ? { txt: 'Delgadez leve', c: '#D4AF37' }
    : bmi < 25 ? { txt: 'Normal ✓ (OMS)', c: '#16A34A' }
    : bmi < 30 ? { txt: 'Sobrepeso', c: '#F59E0B' }
    : bmi < 35 ? { txt: 'Obesidad I', c: '#EA580C' }
    : bmi < 40 ? { txt: 'Obesidad II', c: '#DC2626' }
    : { txt: 'Obesidad III · mórbida', c: '#7F1D1D' };
  return (
    <CalcCard title="IMC · Índice de Masa Corporal (OMS)" subtitle="Clasificación según tablas oficiales OMS" icon={Scale} color="#16A34A" badge="Módulo 7" testid="calc-bmi">
      <Field label="Peso" value={peso} onChange={setPeso} unit="kg" />
      <Field label="Talla" value={talla} onChange={setTalla} unit="cm" />
      <BigResult value={fmt(bmi, 1)} label="IMC" unit="kg/m²" color={cls.c} sub={cls.txt} />
    </CalcCard>
  );
};

export const CalcBodyFat = () => {
  const [metodo, setMetodo] = useState('yuhasz');
  const [tricipital, setTricipital] = useState(10);
  const [subescapular, setSubescapular] = useState(12);
  const [suprailiaco, setSuprailiaco] = useState(14);
  const [abdominal, setAbdominal] = useState(18);
  const [muslo, setMuslo] = useState(15);
  const [pierna, setPierna] = useState(10);
  const [pectoral, setPectoral] = useState(8);
  const [axilar, setAxilar] = useState(10);
  const [sex, setSex] = useState('m');

  const sumYuhasz = num(tricipital) + num(subescapular) + num(suprailiaco) + num(abdominal) + num(muslo) + num(pierna);
  const yuhasz = sex === 'm' ? sumYuhasz * 0.1051 + 2.585 : sumYuhasz * 0.1548 + 3.580;

  // Jackson-Pollock 7 pliegues
  const sum7 = num(tricipital) + num(subescapular) + num(suprailiaco) + num(abdominal) + num(muslo) + num(pectoral) + num(axilar);
  const densJP = sex === 'm'
    ? 1.112 - 0.00043499 * sum7 + 0.00000055 * sum7 * sum7 - 0.00028826 * 30
    : 1.097 - 0.00046971 * sum7 + 0.00000056 * sum7 * sum7 - 0.00012828 * 30;
  const jp = (4.95 / densJP - 4.50) * 100;

  // Faulkner (4 pliegues)
  const sumF = num(tricipital) + num(subescapular) + num(suprailiaco) + num(abdominal);
  const faulkner = sumF * 0.153 + 5.783;

  const result = metodo === 'yuhasz' ? yuhasz : metodo === 'jackson' ? jp : faulkner;

  return (
    <CalcCard title="% Grasa Corporal · Yuhasz / Jackson-Pollock / Faulkner" subtitle="Múltiples protocolos antropométricos" icon={Ruler} color="#06B6D4" badge="Módulo 7" testid="calc-body-fat">
      <Select label="Método" value={metodo} onChange={setMetodo} options={[
        { value: 'yuhasz', label: 'Yuhasz (6 pliegues)' },
        { value: 'jackson', label: 'Jackson-Pollock (7 pliegues)' },
        { value: 'faulkner', label: 'Faulkner (4 pliegues)' }
      ]} />
      <Select label="Sexo" value={sex} onChange={setSex} options={[{ value: 'm', label: 'Masculino' }, { value: 'f', label: 'Femenino' }]} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tricipital" value={tricipital} onChange={setTricipital} unit="mm" />
        <Field label="Subescapular" value={subescapular} onChange={setSubescapular} unit="mm" />
        <Field label="Suprailíaco" value={suprailiaco} onChange={setSuprailiaco} unit="mm" />
        <Field label="Abdominal" value={abdominal} onChange={setAbdominal} unit="mm" />
        {metodo !== 'faulkner' && <Field label="Muslo" value={muslo} onChange={setMuslo} unit="mm" />}
        {metodo === 'yuhasz' && <Field label="Pierna" value={pierna} onChange={setPierna} unit="mm" />}
        {metodo === 'jackson' && <Field label="Pectoral" value={pectoral} onChange={setPectoral} unit="mm" />}
        {metodo === 'jackson' && <Field label="Axilar" value={axilar} onChange={setAxilar} unit="mm" />}
      </div>
      <BigResult value={fmt(result, 1)} label="% Grasa corporal" unit="%" color="#06B6D4" sub={
        result < 6 ? 'Esencial' : result < 14 ? 'Atleta' : result < 18 ? 'Fitness' : result < 25 ? 'Aceptable' : 'Sobrepeso'
      } />
    </CalcCard>
  );
};

export const CalcWHR = () => {
  const [c, setC] = useState(85);
  const [ca, setCa] = useState(100);
  const [sex, setSex] = useState('m');
  const r = num(c) / num(ca);
  const limit = sex === 'm' ? 0.95 : 0.85;
  return (
    <CalcCard title="Índice Cintura-Cadera (WHR)" subtitle="Riesgo cardiovascular (OMS)" icon={Ruler} color="#F59E0B" badge="Módulo 7" testid="calc-whr">
      <Field label="Cintura" value={c} onChange={setC} unit="cm" />
      <Field label="Cadera" value={ca} onChange={setCa} unit="cm" />
      <Select label="Sexo" value={sex} onChange={setSex} options={[{ value: 'm', label: 'Masculino' }, { value: 'f', label: 'Femenino' }]} />
      <BigResult value={fmt(r, 2)} label="WHR" color={r > limit ? '#DC2626' : '#16A34A'} sub={r > limit ? `Riesgo elevado (límite ${limit})` : 'Saludable'} />
    </CalcCard>
  );
};

export const CalcFFMI = () => {
  const [peso, setPeso] = useState(80);
  const [talla, setTalla] = useState(180);
  const [grasa, setGrasa] = useState(12);
  const tM = num(talla) / 100;
  const lbm = num(peso) * (1 - num(grasa) / 100);
  const ffmi = lbm / (tM * tM);
  const ffmiAdj = ffmi + 6.1 * (1.8 - tM);
  return (
    <CalcCard title="FFMI · Fat-Free Mass Index" subtitle="Masa libre de grasa relativa" icon={Scale} color="#D4AF37" badge="Módulo 7" testid="calc-ffmi">
      <Field label="Peso" value={peso} onChange={setPeso} unit="kg" />
      <Field label="Talla" value={talla} onChange={setTalla} unit="cm" />
      <Field label="% Grasa" value={grasa} onChange={setGrasa} unit="%" />
      <BigResult value={fmt(ffmi, 1)} label="FFMI" color="#D4AF37" sub={`Ajustado talla: ${fmt(ffmiAdj, 1)} · ${ffmiAdj > 25 ? 'Sospecha PEDs' : ffmiAdj > 22 ? 'Excelente natural' : ffmiAdj > 19 ? 'Atlético' : 'Promedio'}`} />
    </CalcCard>
  );
};

export const CalcSomatotype = () => {
  const [endo, setEndo] = useState(3.5);
  const [meso, setMeso] = useState(5.0);
  const [ecto, setEcto] = useState(2.5);
  const total = num(endo) + num(meso) + num(ecto);
  const dom = num(meso) > num(endo) && num(meso) > num(ecto) ? 'Mesomorfo'
    : num(endo) > num(meso) && num(endo) > num(ecto) ? 'Endomorfo'
    : 'Ectomorfo';
  return (
    <CalcCard title="Somatotipo Heath-Carter" subtitle="Clasificación corporal por componentes" icon={Ruler} color="#9333EA" badge="Módulo 7" testid="calc-soma">
      <Field label="Endomorfia" value={endo} onChange={setEndo} unit="/7" />
      <Field label="Mesomorfia" value={meso} onChange={setMeso} unit="/7" />
      <Field label="Ectomorfia" value={ecto} onChange={setEcto} unit="/7" />
      <BigResult value={`${num(endo)}-${num(meso)}-${num(ecto)}`} label="Somatotipo" color="#9333EA" sub={`Dominante: ${dom}`} />
    </CalcCard>
  );
};

// ========= MÓDULO 8 — NUTRICIÓN =========

export const CalcBMR = () => {
  const [metodo, setMetodo] = useState('mifflin');
  const [peso, setPeso] = useState(75);
  const [talla, setTalla] = useState(175);
  const [edad, setEdad] = useState(28);
  const [sex, setSex] = useState('m');
  const w = num(peso); const h = num(talla); const a = num(edad);
  const harris = sex === 'm'
    ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
    : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
  const mifflin = sex === 'm'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;
  const bmr = metodo === 'harris' ? harris : mifflin;
  return (
    <CalcCard title="TMB · Tasa Metabólica Basal" subtitle="Harris-Benedict / Mifflin-St Jeor" icon={Apple} color="#EA580C" badge="Módulo 8" testid="calc-bmr">
      <Select label="Método" value={metodo} onChange={setMetodo} options={[
        { value: 'mifflin', label: 'Mifflin-St Jeor (recomendado)' },
        { value: 'harris', label: 'Harris-Benedict' }
      ]} />
      <Select label="Sexo" value={sex} onChange={setSex} options={[{ value: 'm', label: 'Masculino' }, { value: 'f', label: 'Femenino' }]} />
      <Field label="Peso" value={peso} onChange={setPeso} unit="kg" />
      <Field label="Talla" value={talla} onChange={setTalla} unit="cm" />
      <Field label="Edad" value={edad} onChange={setEdad} unit="años" />
      <BigResult value={fmt(bmr, 0)} label="TMB" unit="kcal/día" color="#EA580C" />
    </CalcCard>
  );
};

export const CalcTDEE = () => {
  const [bmr, setBmr] = useState(1700);
  const [act, setAct] = useState(1.55);
  const tdee = num(bmr) * num(act);
  return (
    <CalcCard title="GET · Gasto Energético Total" subtitle="TMB × factor de actividad" icon={Apple} color="#CA8A04" badge="Módulo 8" testid="calc-tdee">
      <Field label="TMB" value={bmr} onChange={setBmr} unit="kcal" />
      <Select label="Nivel actividad" value={act} onChange={setAct} options={[
        { value: 1.2, label: 'Sedentario · 1.2' },
        { value: 1.375, label: 'Ligero · 1.375' },
        { value: 1.55, label: 'Moderado · 1.55' },
        { value: 1.725, label: 'Activo · 1.725' },
        { value: 1.9, label: 'Muy activo · 1.9' }
      ]} />
      <BigResult value={fmt(tdee, 0)} label="GET" unit="kcal/día" color="#CA8A04" />
    </CalcCard>
  );
};

export const CalcMacros = () => {
  const [kcal, setKcal] = useState(2800);
  const [peso, setPeso] = useState(80);
  const [obj, setObj] = useState('hipertrofia');
  const presets = {
    fuerza:       { p: 2.0, g: 1.0, frac_carb_left: true },
    hipertrofia:  { p: 1.8, g: 0.9, frac_carb_left: true },
    resistencia:  { p: 1.4, g: 1.0, frac_carb_left: true },
    definicion:   { p: 2.4, g: 0.8, frac_carb_left: true },
  };
  const cfg = presets[obj];
  const p_g = cfg.p * num(peso);
  const g_g = cfg.g * num(peso);
  const p_kcal = p_g * 4;
  const g_kcal = g_g * 9;
  const c_kcal = num(kcal) - p_kcal - g_kcal;
  const c_g = c_kcal / 4;
  return (
    <CalcCard title="Macronutrientes por objetivo" subtitle="g/kg de peso corporal" icon={Apple} color="#16A34A" badge="Módulo 8" testid="calc-macros">
      <Field label="Calorías diarias" value={kcal} onChange={setKcal} unit="kcal" />
      <Field label="Peso corporal" value={peso} onChange={setPeso} unit="kg" />
      <Select label="Objetivo" value={obj} onChange={setObj} options={[
        { value: 'fuerza', label: 'Fuerza' }, { value: 'hipertrofia', label: 'Hipertrofia' },
        { value: 'resistencia', label: 'Resistencia' }, { value: 'definicion', label: 'Definición' }
      ]} />
      <div className="grid grid-cols-3 gap-2 mt-2">
        <MiniStat label="Proteína" value={`${fmt(p_g, 0)} g`} color="#DC2626" />
        <MiniStat label="Carbohidr." value={`${fmt(c_g, 0)} g`} color="#D4AF37" />
        <MiniStat label="Grasas" value={`${fmt(g_g, 0)} g`} color="#F59E0B" />
      </div>
      <p className="text-[10px] text-slate-500 italic">P {cfg.p} g/kg · G {cfg.g} g/kg · CH = restantes ({fmt(c_kcal, 0)} kcal)</p>
    </CalcCard>
  );
};

export const CalcHydration = () => {
  const [peso, setPeso] = useState(80);
  const [horas, setHoras] = useState(1.5);
  const [intensidad, setIntensidad] = useState(0.8); // L/h
  const base = num(peso) * 35 / 1000; // L/d
  const sudor = num(horas) * num(intensidad);
  const total = base + sudor;
  return (
    <CalcCard title="Hidratación · Sudoración + reposición" subtitle="Base 35 ml/kg + pérdidas por entrenamiento" icon={Droplets} color="#06B6D4" badge="Módulo 8" testid="calc-hydration">
      <Field label="Peso" value={peso} onChange={setPeso} unit="kg" />
      <Field label="Horas entrenamiento" value={horas} onChange={setHoras} unit="h" />
      <Field label="Tasa sudoración" value={intensidad} onChange={setIntensidad} unit="L/h" />
      <BigResult value={fmt(total, 1)} label="Total diario" unit="L" color="#06B6D4" sub={`Base ${fmt(base, 1)} L + Sudor ${fmt(sudor, 1)} L`} />
    </CalcCard>
  );
};

// ========= MÓDULO 9 — MÉDICO-DEPORTIVO =========

export const CalcHRV = () => {
  const [rmssd, setRmssd] = useState(55);
  const [baseline, setBaseline] = useState(60);
  const ratio = num(rmssd) / num(baseline);
  const status = ratio > 1.05 ? { txt: 'Súper-recuperado · alta carga ok', c: '#16A34A' }
    : ratio > 0.95 ? { txt: 'Listo para entrenar', c: '#10B981' }
    : ratio > 0.85 ? { txt: 'Recuperación parcial · baja carga', c: '#F59E0B' }
    : { txt: 'Fatigado · descanso ⚠', c: '#DC2626' };
  return (
    <CalcCard title="HRV · Variabilidad de la Frecuencia Cardíaca" subtitle="RMSSD vs baseline (estado autonómico)" icon={Heart} color="#EC4899" badge="Módulo 9" testid="calc-hrv">
      <Field label="RMSSD hoy" value={rmssd} onChange={setRmssd} unit="ms" />
      <Field label="Baseline (7d)" value={baseline} onChange={setBaseline} unit="ms" />
      <BigResult value={fmt(ratio * 100, 0)} label="% baseline" unit="%" color={status.c} sub={status.txt} />
    </CalcCard>
  );
};

export const CalcWellness = () => {
  const [s, setS] = useState(7);
  const [d, setD] = useState(7);
  const [e, setE] = useState(7);
  const [m, setM] = useState(7);
  const sum = num(s) + num(d) + num(e) + num(m);
  return (
    <CalcCard title="Wellness diario (Hooper modificado)" subtitle="Sueño · Dolor · Energía · Motivación" icon={Brain} color="#8B5CF6" badge="Módulo 9" testid="calc-wellness">
      <Field label="Sueño" value={s} onChange={setS} unit="/10" />
      <Field label="Sin dolor" value={d} onChange={setD} unit="/10" />
      <Field label="Energía" value={e} onChange={setE} unit="/10" />
      <Field label="Motivación" value={m} onChange={setM} unit="/10" />
      <BigResult value={`${sum}/40`} label="Wellness" color="#8B5CF6" sub={sum >= 32 ? 'Excelente' : sum >= 24 ? 'Bueno' : sum >= 16 ? 'Mediocre · descanso' : 'Crítico ⚠'} />
    </CalcCard>
  );
};

export const CalcOvertraining = () => {
  const [fcrep, setFcrep] = useState(70);
  const [base, setBase] = useState(60);
  const [wellness, setWellness] = useState(20);
  const [acwr, setAcwr] = useState(1.5);
  const fcDelta = num(fcrep) - num(base);
  // Selye SGA 3 fases
  const score = (fcDelta > 5 ? 1 : 0) + (num(wellness) < 24 ? 1 : 0) + (num(acwr) > 1.5 ? 1 : 0);
  const fase = score === 0 ? { f: 'Adaptación · Eustres', c: '#16A34A' }
    : score === 1 ? { f: 'Resistencia · vigilar', c: '#F59E0B' }
    : score === 2 ? { f: 'Pre-agotamiento · acción', c: '#EA580C' }
    : { f: 'Agotamiento · DETENER ⚠', c: '#DC2626' };
  return (
    <CalcCard title="Sobreentrenamiento · Selye SGA" subtitle="Síndrome General de Adaptación · 3 fases" icon={Brain} color="#7F1D1D" badge="Módulo 9" testid="calc-overtraining">
      <Field label="FC reposo hoy" value={fcrep} onChange={setFcrep} unit="lpm" />
      <Field label="FC reposo basal" value={base} onChange={setBase} unit="lpm" />
      <Field label="Wellness (/40)" value={wellness} onChange={setWellness} />
      <Field label="ACWR" value={acwr} onChange={setAcwr} step="0.01" />
      <BigResult value={`Fase ${score + 1}`} label="Estado fisiológico" color={fase.c} sub={`${fase.f} · ΔFC: ${fcDelta} lpm`} />
    </CalcCard>
  );
};
