"""
Email Service (Resend) — transactional emails.
Falls back gracefully to logger if RESEND_API_KEY is not configured.
"""
import os
import asyncio
import logging
from typing import Optional

import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev").strip()
APP_PUBLIC_URL = os.environ.get("APP_PUBLIC_URL", "").strip().rstrip("/")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def is_email_enabled() -> bool:
    return bool(RESEND_API_KEY)


async def send_email(to: str, subject: str, html: str) -> dict:
    """Send a transactional email. Returns {'sent': bool, 'id'?, 'error'?}."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — email NOT sent (would have gone to %s)", to)
        return {"sent": False, "error": "email_not_configured"}

    params = {
        "from": SENDER_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"sent": True, "id": result.get("id")}
    except Exception as e:
        logger.error("Resend send failed: %s", e)
        return {"sent": False, "error": str(e)}


def render_coach_invite_email(
    *,
    coach_name: str,
    coach_email: str,
    temp_password: str,
    org_name: str,
    inviter_name: str,
    role_label: str = "Entrenador",
) -> str:
    """Branded HTML invitation email (table-based for email-client compatibility)."""
    login_url = f"{APP_PUBLIC_URL}/auth" if APP_PUBLIC_URL else "https://lordtraining.app/auth"

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invitación a {org_name}</title>
</head>
<body style="margin:0; padding:0; background:#0f172a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a; padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.4);">

        <!-- Header lime brand strip -->
        <tr><td style="background:linear-gradient(135deg,#0a0f19 0%,#1a2033 100%); padding:32px 40px; border-bottom:3px solid #CCFF00;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:'Bebas Neue','Arial Black',Arial,sans-serif; font-size:32px; letter-spacing:2px; color:#CCFF00; font-weight:900;">LordTraining</td>
              <td align="right" style="color:#94a3b8; font-size:11px; letter-spacing:1px; text-transform:uppercase;">Sport Periodization Software</td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 16px 40px;">
          <p style="margin:0 0 8px 0; color:#10B981; font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:700;">Invitación al equipo</p>
          <h1 style="margin:0 0 12px 0; color:#0f172a; font-size:26px; font-weight:800; line-height:1.2;">Hola {coach_name},</h1>
          <p style="margin:0 0 18px 0; color:#475569; font-size:15px; line-height:1.6;">
            <strong>{inviter_name}</strong> te ha invitado a unirte a
            <strong style="color:#0f172a;">{org_name}</strong> como <strong>{role_label}</strong> en LordTraining — la plataforma profesional de periodización deportiva.
          </p>
        </td></tr>

        <!-- Credentials box -->
        <tr><td style="padding:0 40px 24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fefce8; border:1px solid #fde047; border-radius:12px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 14px 0; color:#a16207; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; font-weight:700;">🔑 Tus credenciales de acceso</p>

              <p style="margin:0 0 4px 0; color:#78716c; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Email</p>
              <p style="margin:0 0 14px 0; color:#0f172a; font-size:15px; font-family:'Courier New',monospace; font-weight:700;">{coach_email}</p>

              <p style="margin:0 0 4px 0; color:#78716c; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Contraseña temporal</p>
              <p style="margin:0; color:#854d0e; font-size:20px; font-family:'Courier New',monospace; font-weight:900; letter-spacing:2px;">{temp_password}</p>
            </td></tr>
          </table>
          <p style="margin:14px 0 0 0; color:#94a3b8; font-size:12px; line-height:1.5;">
            Por seguridad, se te pedirá <strong style="color:#475569;">cambiar esta contraseña</strong> en tu primer inicio de sesión.
          </p>
        </td></tr>

        <!-- CTA Button -->
        <tr><td align="center" style="padding:8px 40px 32px 40px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#0f172a; border-radius:10px;">
              <a href="{login_url}" style="display:inline-block; padding:14px 36px; color:#CCFF00; font-size:14px; font-weight:800; text-decoration:none; letter-spacing:1px; text-transform:uppercase;">
                Iniciar sesión en LordTraining →
              </a>
            </td></tr>
          </table>
          <p style="margin:14px 0 0 0; color:#94a3b8; font-size:11px;">
            O copia y pega: <a href="{login_url}" style="color:#10B981; text-decoration:none;">{login_url}</a>
          </p>
        </td></tr>

        <!-- What you can do -->
        <tr><td style="padding:0 40px 32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border-radius:12px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px 0; color:#0f172a; font-size:13px; font-weight:700;">Como parte del equipo de {org_name} podrás:</p>
              <table width="100%" cellpadding="0" cellspacing="4" border="0" style="color:#475569; font-size:13px; line-height:1.6;">
                <tr><td>✓ Crear y gestionar planes de entrenamiento</td></tr>
                <tr><td>✓ Periodización completa (ATR, Bloques, Ondulatoria)</td></tr>
                <tr><td>✓ Generaciones con IA, calculadoras científicas y reportes PDF</td></tr>
                <tr><td>✓ Pizarra táctica y análisis avanzado</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f172a; padding:24px 40px; text-align:center;">
          <p style="margin:0 0 6px 0; color:#94a3b8; font-size:11px;">
            Si no esperabas esta invitación, puedes ignorar este email.
          </p>
          <p style="margin:0; color:#64748b; font-size:10px; letter-spacing:1px; text-transform:uppercase;">
            © LordTraining · Sport Periodization Software
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_coach_invitation(
    *,
    coach_name: str,
    coach_email: str,
    temp_password: str,
    org_name: str,
    inviter_name: str,
    role_label: str = "Entrenador",
) -> dict:
    subject = f"Invitación a {org_name} en LordTraining"
    html = render_coach_invite_email(
        coach_name=coach_name,
        coach_email=coach_email,
        temp_password=temp_password,
        org_name=org_name,
        inviter_name=inviter_name,
        role_label=role_label,
    )
    return await send_email(coach_email, subject, html)


async def send_password_reset(
    *,
    coach_name: str,
    coach_email: str,
    temp_password: str,
    org_name: str,
) -> dict:
    subject = f"Nueva contraseña temporal — {org_name}"
    html = render_coach_invite_email(
        coach_name=coach_name,
        coach_email=coach_email,
        temp_password=temp_password,
        org_name=org_name,
        inviter_name="el administrador",
        role_label="Entrenador",
    )
    return await send_email(coach_email, subject, html)



def _esc(s) -> str:
    import html as _h
    return _h.escape(str(s or ""))


async def send_showcase_lead_notification(
    *,
    coach_email: str,
    coach_name: str = "",
    from_name: str,
    from_email: str,
    organization: str = "",
    message: str,
    prospect_name: str = "",
    showcase_title: str = "",
) -> dict:
    """Notifica al coach que llegó un contacto nuevo desde su vitrina pública."""
    subject = f"Nuevo contacto desde tu vitrina — {from_name}"
    if prospect_name:
        subject = f"Interés en {prospect_name} — {from_name}"
    org_row = (f'<tr><td style="padding:4px 0;color:#64748b;font-size:13px;width:120px">Organización</td>'
               f'<td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:600">{_esc(organization)}</td></tr>'
               if organization else "")
    prospect_row = (f'<tr><td style="padding:4px 0;color:#64748b;font-size:13px">Interesado en</td>'
                    f'<td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:700">{_esc(prospect_name)}</td></tr>'
                    if prospect_name else "")
    html = f"""<!DOCTYPE html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="background:#0A0F1E;padding:22px 28px">
        <span style="color:#ffffff;font-weight:800;letter-spacing:.5px;font-size:18px">LORD<span style="color:#D4AF37">TRAINING</span></span>
        <div style="color:#94a3b8;font-size:12px;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Nuevo contacto · {_esc(showcase_title or 'Vitrina Cantera')}</div>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a">Tienes un nuevo interesado 🎯</h1>
        <p style="margin:0 0 20px;color:#475569;font-size:14px">Un reclutador escribió desde tu vitrina pública.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
          <tr><td style="padding:4px 0;color:#64748b;font-size:13px;width:120px">Nombre</td><td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:700">{_esc(from_name)}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;font-size:13px">Email</td><td style="padding:4px 0"><a href="mailto:{_esc(from_email)}" style="color:#2563eb;font-size:14px;font-weight:600">{_esc(from_email)}</a></td></tr>
          {org_row}{prospect_row}
        </table>
        <div style="margin:18px 0 6px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Mensaje</div>
        <div style="background:#ffffff;border-left:3px solid #D4AF37;padding:12px 16px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap">{_esc(message)}</div>
        <a href="mailto:{_esc(from_email)}?subject=Re:%20tu%20interes%20en%20{_esc(prospect_name or 'un talento')}" style="display:inline-block;margin-top:22px;background:#D4AF37;color:#0A0F1E;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:14px">Responder ahora</a>
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">Recibiste este correo porque tu Vitrina Cantera está activa en LordTraining.</td></tr>
    </table>
  </td></tr></table>
</body></html>"""
    return await send_email(coach_email, subject, html)
