import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Link2, MessageCircle, Mail, Copy, KeyRound, UserPlus, Eye, Send } from 'lucide-react';
import {
  createAthleteShare, getAthleteShare, inviteAthlete, createAthleteInviteCode, publicPortalUrl,
} from '../services/athleteApi';

const AthletePortalShareModal = ({ open, onOpenChange, plan, athletes = [] }) => {
  const [shareId, setShareId] = useState(null);
  const [athleteName, setAthleteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [creds, setCreds] = useState(null);
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!open || !plan?.id) return;
    setLoading(true); setCreds(null); setCode(null);
    getAthleteShare(plan.id)
      .then((r) => { setShareId(r.data.share_id); setAthleteName(r.data.athlete_name || ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, plan?.id]);

  const url = shareId ? publicPortalUrl(shareId) : '';

  const genShare = async () => {
    setBusy('share');
    try { const r = await createAthleteShare(plan.id, athleteName); setShareId(r.data.share_id); toast.success('Enlace generado'); }
    catch { toast.error('No se pudo generar el enlace'); }
    finally { setBusy(null); }
  };

  const copy = (txt) => { navigator.clipboard.writeText(txt); toast.success('Copiado al portapapeles'); };

  const sendWhatsApp = () => {
    const msg = `Hola${athleteName ? ' ' + athleteName : ''}! Aquí está tu plan de entrenamiento (solo lectura, puedes marcar tus sesiones): ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };
  const sendEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent('Tu plan de entrenamiento')}&body=${encodeURIComponent('Aquí está tu plan: ' + url)}`, '_blank');
  };

  const doInvite = async () => {
    const ath = athletes.find((a) => a.id === selectedAthlete);
    const email = (inviteEmail || ath?.email || '').trim();
    if (!selectedAthlete) { toast.error('Selecciona un atleta'); return; }
    if (!email) { toast.error('Indica un email para el atleta'); return; }
    setBusy('invite');
    try {
      const r = await inviteAthlete(selectedAthlete, plan.id, email);
      setCreds(r.data);
      toast.success('Acceso creado');
    } catch (e) { toast.error(e?.response?.data?.detail || 'No se pudo crear el acceso'); }
    finally { setBusy(null); }
  };

  const genCode = async () => {
    setBusy('code');
    try { const r = await createAthleteInviteCode(plan.id, athleteName); setCode(r.data.code); toast.success('Código generado'); }
    catch { toast.error('No se pudo generar el código'); }
    finally { setBusy(null); }
  };

  const registerUrl = code ? `${window.location.origin}/atleta/registro?code=${code}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white" data-testid="athlete-portal-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-[#007AFF]" />Compartir con el atleta</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Public link */}
            <section>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-2"><Eye className="w-4 h-4 text-slate-500" />Enlace público (solo lectura)</h4>
              <p className="text-xs text-slate-500 mb-2">El atleta ve su plan y puede marcar sesiones completadas con RPE y comentario. Sin necesidad de crear cuenta.</p>
              <Input value={athleteName} onChange={(e) => setAthleteName(e.target.value)} placeholder="Nombre del atleta (opcional)" className="h-9 text-sm mb-2" data-testid="portal-athlete-name" />
              {shareId ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={url} className="h-9 text-xs font-mono" data-testid="portal-share-url" />
                    <Button size="sm" variant="outline" className="h-9 px-2.5" onClick={() => copy(url)} data-testid="portal-copy-btn"><Copy className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs flex-1 border-emerald-300 text-emerald-700" onClick={sendWhatsApp} data-testid="portal-whatsapp-btn"><MessageCircle className="w-3.5 h-3.5 mr-1" />WhatsApp</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={sendEmail} data-testid="portal-email-btn"><Mail className="w-3.5 h-3.5 mr-1" />Email</Button>
                  </div>
                </>
              ) : (
                <Button size="sm" className="bg-slate-900 text-white h-9 text-xs" onClick={genShare} disabled={busy === 'share'} data-testid="portal-generate-share">
                  {busy === 'share' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Link2 className="w-4 h-4 mr-1.5" />}Generar enlace
                </Button>
              )}
            </section>

            <div className="border-t border-slate-100" />

            {/* Invite account */}
            <section>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-2"><KeyRound className="w-4 h-4 text-slate-500" />Crear cuenta para el atleta</h4>
              <p className="text-xs text-slate-500 mb-2">Genera usuario + contraseña temporal. El atleta inicia sesión en <span className="font-mono">/atleta/login</span>.</p>
              <select value={selectedAthlete} onChange={(e) => { setSelectedAthlete(e.target.value); const a = athletes.find((x) => x.id === e.target.value); setInviteEmail(a?.email || ''); }} className="w-full h-9 px-2.5 rounded-md border border-slate-200 text-sm bg-white mb-2" data-testid="portal-athlete-select">
                <option value="">Selecciona un atleta…</option>
                {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}{a.email ? ` · ${a.email}` : ''}</option>)}
              </select>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email del atleta" className="h-9 text-sm mb-2" data-testid="portal-invite-email" />
              <Button size="sm" className="bg-slate-900 text-white h-9 text-xs" onClick={doInvite} disabled={busy === 'invite'} data-testid="portal-invite-btn">
                {busy === 'invite' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}Generar acceso
              </Button>
              {creds && (
                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm" data-testid="portal-creds">
                  <p className="text-emerald-800 font-medium mb-1">Acceso creado · compártelo con tu atleta:</p>
                  <p className="text-emerald-700">Email: <span className="font-mono">{creds.email}</span></p>
                  <p className="text-emerald-700">Contraseña temporal: <span className="font-mono font-bold">{creds.temp_password}</span></p>
                  <Button size="sm" variant="outline" className="h-7 text-xs mt-2 border-emerald-300" onClick={() => copy(`Email: ${creds.email}\nContraseña: ${creds.temp_password}\nIngresa en: ${window.location.origin}/atleta/login`)}><Copy className="w-3 h-3 mr-1" />Copiar credenciales</Button>
                </div>
              )}
            </section>

            <div className="border-t border-slate-100" />

            {/* Self-register code */}
            <section>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-2"><UserPlus className="w-4 h-4 text-slate-500" />Código de auto-registro</h4>
              <p className="text-xs text-slate-500 mb-2">El atleta crea su propia cuenta con este código y queda vinculado a este plan.</p>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={genCode} disabled={busy === 'code'} data-testid="portal-gencode-btn">
                {busy === 'code' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1.5" />}Generar código
              </Button>
              {code && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm" data-testid="portal-code">
                  <p className="text-blue-800">Código: <span className="font-mono font-bold text-lg">{code}</span></p>
                  <div className="flex items-center gap-2 mt-2">
                    <Input readOnly value={registerUrl} className="h-8 text-xs font-mono" />
                    <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => copy(registerUrl)}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AthletePortalShareModal;
