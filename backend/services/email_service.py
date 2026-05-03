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
    login_url = f"{APP_PUBLIC_URL}/auth" if APP_PUBLIC_URL else "https://itrain.app/auth"

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
              <td style="font-family:'Bebas Neue','Arial Black',Arial,sans-serif; font-size:32px; letter-spacing:2px; color:#CCFF00; font-weight:900;">i<span style="color:#fff;">TRAIN</span></td>
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
            <strong style="color:#0f172a;">{org_name}</strong> como <strong>{role_label}</strong> en iTRAIN — la plataforma profesional de periodización deportiva.
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
                Iniciar sesión en iTRAIN →
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
            © iTRAIN · Sport Periodization Software
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
    subject = f"Invitación a {org_name} en iTRAIN"
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
