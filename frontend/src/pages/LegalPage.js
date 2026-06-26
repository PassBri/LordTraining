import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, Shield, ScrollText } from 'lucide-react';

const CONTACT = 'juegolaureado@gmail.com';
const BRAND = 'LordTraining';
const UPDATED = '25 de junio de 2026';
const UPDATED_EN = 'June 25, 2026';

// type: 'terms' | 'privacy' | 'policies'
const CONTENT = {
  terms: {
    es: {
      title: 'Términos y Condiciones',
      icon: FileText,
      sections: [
        ['1. Aceptación de los Términos', `Al acceder y utilizar ${BRAND} (la "Plataforma"), aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo, por favor no utilices la Plataforma. ${BRAND} es una herramienta de gestión deportiva para entrenadores que ofrece planificación de periodización, calculadoras, reportes, scouting y herramientas relacionadas.`],
        ['2. Cuentas de usuario', 'Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad realizada bajo tu cuenta. Debes proporcionar información veraz y actualizada al registrarte. Nos reservamos el derecho de suspender cuentas que infrinjan estos términos.'],
        ['3. Periodo de prueba y suscripciones', 'La Plataforma puede ofrecer un periodo de prueba gratuito (actualmente 7 días). Las suscripciones de pago se gestionan a través de terceros (por ejemplo, Hotmart). Los precios, ciclos de facturación y condiciones de renovación se muestran antes de la compra.'],
        ['4. Pagos', `Los pagos se procesan mediante proveedores externos (Hotmart). ${BRAND} no almacena los datos completos de tu tarjeta. Las políticas de reembolso se rigen por las condiciones del proveedor de pago y por la legislación aplicable.`],
        ['5. Uso aceptable', 'Te comprometes a no usar la Plataforma para fines ilícitos, a no intentar vulnerar su seguridad, ni a copiar, revender o redistribuir el contenido sin autorización. El contenido que generes (planes, datos de atletas) es de tu responsabilidad.'],
        ['6. Propiedad intelectual', `Todo el software, diseño, marca y materiales de ${BRAND} son propiedad de sus titulares y están protegidos por las leyes de propiedad intelectual. Se te concede una licencia limitada, no exclusiva e intransferible para usar la Plataforma.`],
        ['7. Inteligencia Artificial', 'Algunas funciones (por ejemplo, análisis y scouting) utilizan modelos de inteligencia artificial. Los resultados generados por IA son orientativos y no sustituyen el criterio profesional del entrenador ni constituyen consejo médico.'],
        ['8. Limitación de responsabilidad', `${BRAND} se ofrece "tal cual". No garantizamos que la Plataforma esté libre de errores o interrupciones. En la máxima medida permitida por la ley, no seremos responsables de daños indirectos derivados del uso de la Plataforma.`],
        ['9. Modificaciones', 'Podemos actualizar estos Términos en cualquier momento. Los cambios entrarán en vigor al publicarse en esta página. El uso continuado de la Plataforma implica la aceptación de los nuevos términos.'],
        ['10. Contacto', `Para cualquier consulta sobre estos Términos, escríbenos a ${CONTACT}.`],
      ],
    },
    en: {
      title: 'Terms & Conditions',
      icon: FileText,
      sections: [
        ['1. Acceptance of Terms', `By accessing and using ${BRAND} (the "Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Platform. ${BRAND} is a sports management tool for coaches offering periodization planning, calculators, reports, scouting and related tools.`],
        ['2. User Accounts', 'You are responsible for keeping your credentials confidential and for all activity under your account. You must provide accurate, up-to-date information when registering. We reserve the right to suspend accounts that violate these terms.'],
        ['3. Trial & Subscriptions', 'The Platform may offer a free trial (currently 7 days). Paid subscriptions are managed through third parties (e.g., Hotmart). Prices, billing cycles and renewal terms are shown before purchase.'],
        ['4. Payments', `Payments are processed by external providers (Hotmart). ${BRAND} does not store full card data. Refund policies are governed by the payment provider's terms and applicable law.`],
        ['5. Acceptable Use', 'You agree not to use the Platform for unlawful purposes, not to attempt to breach its security, and not to copy, resell or redistribute content without authorization. Content you generate (plans, athlete data) is your responsibility.'],
        ['6. Intellectual Property', `All software, design, branding and materials of ${BRAND} are owned by their holders and protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Platform.`],
        ['7. Artificial Intelligence', 'Some features (e.g., analysis and scouting) use AI models. AI-generated outputs are indicative and do not replace the coach\'s professional judgment nor constitute medical advice.'],
        ['8. Limitation of Liability', `${BRAND} is provided "as is". We do not guarantee the Platform is error-free or uninterrupted. To the maximum extent permitted by law, we are not liable for indirect damages arising from use of the Platform.`],
        ['9. Changes', 'We may update these Terms at any time. Changes take effect upon posting on this page. Continued use of the Platform implies acceptance of the new terms.'],
        ['10. Contact', `For any questions about these Terms, contact us at ${CONTACT}.`],
      ],
    },
  },
  privacy: {
    es: {
      title: 'Política de Privacidad',
      icon: Shield,
      sections: [
        ['1. Información que recopilamos', `Recopilamos datos que nos proporcionas al registrarte y usar ${BRAND}: nombre, correo electrónico, datos de atletas y planes de entrenamiento que creas, así como datos técnicos de uso (registros, dispositivo, navegador).`],
        ['2. Cómo usamos tus datos', 'Usamos tus datos para prestar y mejorar el servicio, autenticar tu cuenta, generar reportes y análisis, procesar pagos y comunicarnos contigo sobre el servicio.'],
        ['3. Inteligencia Artificial', 'Algunas funciones envían datos (por ejemplo, texto de análisis o scouting) a proveedores de modelos de IA para generar resultados. No usamos tus datos personales para entrenar modelos de terceros sin tu consentimiento.'],
        ['4. Pagos (Hotmart)', `Los pagos se procesan a través de Hotmart. Compartimos con dicho proveedor la información mínima necesaria para gestionar la transacción. No almacenamos los datos completos de tu tarjeta. Consulta también la política de privacidad de Hotmart.`],
        ['5. Compartición de datos', 'No vendemos tus datos personales. Podemos compartirlos con proveedores que nos ayudan a operar la Plataforma (alojamiento, pagos, IA) bajo obligaciones de confidencialidad, o cuando lo exija la ley.'],
        ['6. Conservación', 'Conservamos tus datos mientras tu cuenta esté activa o según sea necesario para prestar el servicio y cumplir obligaciones legales. Puedes solicitar la eliminación de tu cuenta y datos.'],
        ['7. Tus derechos', 'Puedes solicitar acceso, rectificación, eliminación o portabilidad de tus datos, así como oponerte a ciertos tratamientos, escribiendo a ' + CONTACT + '.'],
        ['8. Seguridad', 'Aplicamos medidas técnicas y organizativas razonables para proteger tus datos. Ningún sistema es 100% seguro, por lo que no podemos garantizar seguridad absoluta.'],
        ['9. Cookies', 'Utilizamos almacenamiento local y cookies técnicas necesarias para el funcionamiento (por ejemplo, mantener tu sesión). No usamos cookies de publicidad de terceros.'],
        ['10. Contacto', `Responsable del tratamiento: ${BRAND}. Para ejercer tus derechos o resolver dudas, escríbenos a ${CONTACT}.`],
      ],
    },
    en: {
      title: 'Privacy Policy',
      icon: Shield,
      sections: [
        ['1. Information We Collect', `We collect data you provide when registering and using ${BRAND}: name, email, athlete data and training plans you create, plus technical usage data (logs, device, browser).`],
        ['2. How We Use Your Data', 'We use your data to deliver and improve the service, authenticate your account, generate reports and analysis, process payments and communicate with you about the service.'],
        ['3. Artificial Intelligence', 'Some features send data (e.g., analysis or scouting text) to AI model providers to generate results. We do not use your personal data to train third-party models without your consent.'],
        ['4. Payments (Hotmart)', 'Payments are processed via Hotmart. We share with that provider only the minimum information needed to handle the transaction. We do not store full card data. Please also review Hotmart\'s privacy policy.'],
        ['5. Data Sharing', 'We do not sell your personal data. We may share it with providers that help us operate the Platform (hosting, payments, AI) under confidentiality obligations, or when required by law.'],
        ['6. Retention', 'We keep your data while your account is active or as needed to provide the service and comply with legal obligations. You may request deletion of your account and data.'],
        ['7. Your Rights', 'You can request access, rectification, deletion or portability of your data, and object to certain processing, by writing to ' + CONTACT + '.'],
        ['8. Security', 'We apply reasonable technical and organizational measures to protect your data. No system is 100% secure, so we cannot guarantee absolute security.'],
        ['9. Cookies', 'We use local storage and necessary technical cookies for functionality (e.g., keeping your session). We do not use third-party advertising cookies.'],
        ['10. Contact', `Data controller: ${BRAND}. To exercise your rights or for questions, contact us at ${CONTACT}.`],
      ],
    },
  },
  policies: {
    es: {
      title: 'Políticas de la Plataforma',
      icon: ScrollText,
      sections: [
        ['1. Política de uso', `${BRAND} está destinada a entrenadores y profesionales del deporte. Su uso debe ser ético y respetuoso con los atletas y demás usuarios.`],
        ['2. Política de contenido', 'Eres responsable del contenido y los datos de atletas que cargas. Debes contar con el consentimiento de los atletas (o de sus tutores) para tratar sus datos en la Plataforma.'],
        ['3. Política de reembolsos', 'Los reembolsos se rigen por las condiciones del proveedor de pago (Hotmart) y la legislación aplicable. Para solicitudes, escribe a ' + CONTACT + '.'],
        ['4. Política de cancelación', 'Puedes cancelar tu suscripción en cualquier momento desde el proveedor de pago. El acceso se mantendrá hasta el final del periodo ya pagado.'],
        ['5. Disponibilidad del servicio', 'Trabajamos para mantener la Plataforma disponible, pero pueden producirse mantenimientos o interrupciones. Avisaremos de mantenimientos relevantes cuando sea posible.'],
        ['6. Conducta y seguridad', 'No se permite el abuso, la manipulación de datos de terceros ni los intentos de vulnerar la seguridad. El incumplimiento puede conllevar la suspensión de la cuenta.'],
        ['7. Contacto', `Para cualquier asunto relacionado con estas políticas, escríbenos a ${CONTACT}.`],
      ],
    },
    en: {
      title: 'Platform Policies',
      icon: ScrollText,
      sections: [
        ['1. Usage Policy', `${BRAND} is intended for coaches and sports professionals. Use must be ethical and respectful toward athletes and other users.`],
        ['2. Content Policy', 'You are responsible for the content and athlete data you upload. You must have consent from athletes (or their guardians) to process their data on the Platform.'],
        ['3. Refund Policy', 'Refunds are governed by the payment provider\'s terms (Hotmart) and applicable law. For requests, write to ' + CONTACT + '.'],
        ['4. Cancellation Policy', 'You may cancel your subscription anytime through the payment provider. Access remains until the end of the already-paid period.'],
        ['5. Service Availability', 'We work to keep the Platform available, but maintenance or outages may occur. We will announce relevant maintenance when possible.'],
        ['6. Conduct & Security', 'Abuse, manipulation of third-party data, or attempts to breach security are not allowed. Violations may lead to account suspension.'],
        ['7. Contact', `For any matter related to these policies, contact us at ${CONTACT}.`],
      ],
    },
  },
};

const TYPE_BY_PATH = { terminos: 'terms', terms: 'terms', privacidad: 'privacy', privacy: 'privacy', politicas: 'policies', policies: 'policies' };

const LegalPage = () => {
  const location = useLocation();
  const slug = (location.pathname || '/').replace(/^\//, '').split('/')[0];
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'es').startsWith('en') ? 'en' : 'es';
  const type = TYPE_BY_PATH[slug] || 'terms';
  const data = CONTENT[type][lang];
  const Icon = data.icon;

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  const tabs = [
    { key: 'terms', path: lang === 'en' ? 'terms' : 'terminos', label: lang === 'en' ? 'Terms' : 'Términos' },
    { key: 'privacy', path: lang === 'en' ? 'privacy' : 'privacidad', label: lang === 'en' ? 'Privacy' : 'Privacidad' },
    { key: 'policies', path: lang === 'en' ? 'policies' : 'politicas', label: lang === 'en' ? 'Policies' : 'Políticas' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200" data-testid="legal-page">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors mb-8" data-testid="legal-back-btn">
          <ArrowLeft className="w-4 h-4" /> {lang === 'en' ? 'Back to home' : 'Volver al inicio'}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{data.title}</h1>
        </div>
        <p className="text-xs text-slate-500 mb-7">{lang === 'en' ? `Last updated: ${UPDATED_EN}` : `Última actualización: ${UPDATED}`}</p>

        <div className="flex gap-2 mb-9 border-b border-white/10 pb-3">
          {tabs.map(tb => (
            <Link key={tb.key} to={`/${tb.path}`} className={`text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors ${type === tb.key ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} data-testid={`legal-tab-${tb.key}`}>
              {tb.label}
            </Link>
          ))}
        </div>

        <div className="space-y-7">
          {data.sections.map(([heading, body], i) => (
            <section key={i}>
              <h2 className="text-base font-semibold text-white mb-1.5">{heading}</h2>
              <p className="text-sm leading-relaxed text-slate-400">{body}</p>
            </section>
          ))}
        </div>

        <p className="mt-12 text-xs text-slate-600 border-t border-white/10 pt-6">© {new Date().getFullYear()} {BRAND}. {lang === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}</p>
      </div>
    </div>
  );
};

export default LegalPage;
