"""Localización del chrome de los PDFs (Reporte Maestro).

Estrategia de bajo costo SIN LLM: el HTML se arma en español y luego se aplica
una pasada de reemplazo anclada en nodos de texto (`>ES<`) hacia el idioma del
receptor. Solo se traduce el "chrome" (títulos de sección, badges, encabezados
de tabla, etiquetas KPI, meta de portada, etiquetas de fase, footer). El
contenido dinámico proveniente de la BD (nombres de plan, atletas, etc.) se
mantiene tal cual.
"""

LANGS = ["en", "pt", "ar", "hi", "id", "fr", "de", "ja", "ko", "ru", "zh"]

# ES -> {lang: traducción}. El orden de LANGS define el orden de los valores.
_P = {
    # ===== Badges (mayúsculas) =====
    "REPORTE MAESTRO": ["MASTER REPORT", "RELATÓRIO MESTRE", "التقرير الرئيسي", "मास्टर रिपोर्ट", "LAPORAN UTAMA", "RAPPORT MAÎTRE", "HAUPTBERICHT", "マスターレポート", "마스터 리포트", "ГЛАВНЫЙ ОТЧЁТ", "主报告"],
    "ÍNDICE": ["INDEX", "ÍNDICE", "الفهرس", "सूची", "INDEKS", "INDEX", "INHALT", "目次", "목차", "СОДЕРЖАНИЕ", "目录"],
    "PRESENTACIÓN": ["OVERVIEW", "APRESENTAÇÃO", "تقديم", "प्रस्तुति", "PENGANTAR", "PRÉSENTATION", "EINFÜHRUNG", "概要", "소개", "ПРЕДСТАВЛЕНИЕ", "概述"],
    "RETROSPECTIVO": ["RETROSPECTIVE", "RETROSPECTIVO", "استعادي", "पूर्वावलोकन", "RETROSPEKTIF", "RÉTROSPECTIF", "RÜCKBLICK", "振り返り", "회고", "РЕТРОСПЕКТИВА", "回顾"],
    "PLAN ACTIVO": ["ACTIVE PLAN", "PLANO ATIVO", "الخطة النشطة", "सक्रिय योजना", "RENCANA AKTIF", "PLAN ACTIF", "AKTIVER PLAN", "アクティブプラン", "활성 플랜", "АКТИВНЫЙ ПЛАН", "当前计划"],
    "INFORMACIÓN": ["INFORMATION", "INFORMAÇÃO", "معلومات", "जानकारी", "INFORMASI", "INFORMATION", "INFORMATION", "情報", "정보", "ИНФОРМАЦИЯ", "信息"],
    "EVALUACIÓN": ["EVALUATION", "AVALIAÇÃO", "تقييم", "मूल्यांकन", "EVALUASI", "ÉVALUATION", "BEWERTUNG", "評価", "평가", "ОЦЕНКА", "评估"],
    "CALENDARIO": ["CALENDAR", "CALENDÁRIO", "التقويم", "कैलेंडर", "KALENDER", "CALENDRIER", "KALENDER", "カレンダー", "캘린더", "КАЛЕНДАРЬ", "日历"],
    "ESTRUCTURA": ["STRUCTURE", "ESTRUTURA", "الهيكل", "संरचना", "STRUKTUR", "STRUCTURE", "STRUKTUR", "構造", "구조", "СТРУКТУРА", "结构"],
    "CARGA": ["LOAD", "CARGA", "الحِمل", "लोड", "BEBAN", "CHARGE", "BELASTUNG", "負荷", "부하", "НАГРУЗКА", "负荷"],
    "VISUALIZACIÓN": ["VISUALIZATION", "VISUALIZAÇÃO", "العرض المرئي", "दृश्य", "VISUALISASI", "VISUALISATION", "VISUALISIERUNG", "ビジュアル", "시각화", "ВИЗУАЛИЗАЦИЯ", "可视化"],
    "MESOCICLO": ["MESOCYCLE", "MESOCICLO", "الدورة المتوسطة", "मेसोसायकल", "MESOSIKLUS", "MÉSOCYCLE", "MESOZYKLUS", "メソサイクル", "메조사이클", "МЕЗОЦИКЛ", "中周期"],
    "MANUAL DEL PLAN": ["PLAN MANUAL", "MANUAL DO PLANO", "دليل الخطة", "योजना मैनुअल", "PANDUAN RENCANA", "MANUEL DU PLAN", "PLAN-HANDBUCH", "プランマニュアル", "플랜 매뉴얼", "РУКОВОДСТВО ПЛАНА", "计划手册"],
    "SUITE": ["SUITE", "SUITE", "مجموعة", "सुइट", "SUITE", "SUITE", "SUITE", "スイート", "스위트", "НАБОР", "套件"],
    "CIERRE": ["CLOSING", "ENCERRAMENTO", "الخاتمة", "समापन", "PENUTUP", "CLÔTURE", "ABSCHLUSS", "まとめ", "마무리", "ЗАКЛЮЧЕНИЕ", "结尾"],

    # ===== Títulos de sección (h2) =====
    "Tabla de Contenido": ["Table of Contents", "Sumário", "جدول المحتويات", "विषय-सूची", "Daftar Isi", "Table des matières", "Inhaltsverzeichnis", "目次", "목차", "Содержание", "目录"],
    "Introducción": ["Introduction", "Introdução", "مقدمة", "परिचय", "Pendahuluan", "Introduction", "Einleitung", "はじめに", "서론", "Введение", "引言"],
    "Diagnóstico · Plan Anterior": ["Diagnosis · Previous Plan", "Diagnóstico · Plano Anterior", "التشخيص · الخطة السابقة", "निदान · पिछली योजना", "Diagnosis · Rencana Sebelumnya", "Diagnostic · Plan précédent", "Diagnose · Vorheriger Plan", "診断 · 前回のプラン", "진단 · 이전 플랜", "Диагностика · Предыдущий план", "诊断 · 上一计划"],
    "Diagnóstico · Plan Activo": ["Diagnosis · Active Plan", "Diagnóstico · Plano Ativo", "التشخيص · الخطة النشطة", "निदान · सक्रिय योजना", "Diagnosis · Rencana Aktif", "Diagnostic · Plan actif", "Diagnose · Aktiver Plan", "診断 · アクティブプラン", "진단 · 활성 플랜", "Диагностика · Активный план", "诊断 · 当前计划"],
    "Diagnóstico · Plan anterior": ["Diagnosis · Previous plan", "Diagnóstico · Plano anterior", "التشخيص · الخطة السابقة", "निदान · पिछली योजना", "Diagnosis · Rencana sebelumnya", "Diagnostic · Plan précédent", "Diagnose · Vorheriger Plan", "診断 · 前回のプラン", "진단 · 이전 플랜", "Диагностика · Предыдущий план", "诊断 · 上一计划"],
    "Diagnóstico · Plan activo": ["Diagnosis · Active plan", "Diagnóstico · Plano ativo", "التشخيص · الخطة النشطة", "निदान · सक्रिय योजना", "Diagnosis · Rencana aktif", "Diagnostic · Plan actif", "Diagnose · Aktiver Plan", "診断 · アクティブプラン", "진단 · 활성 플랜", "Диагностика · Активный план", "诊断 · 当前计划"],
    "Competencias": ["Competitions", "Competições", "المنافسات", "प्रतियोगिताएँ", "Kompetisi", "Compétitions", "Wettkämpfe", "競技会", "대회", "Соревнования", "比赛"],
    "Periodización · Estructura": ["Periodization · Structure", "Periodização · Estrutura", "التخطيط الدوري · الهيكل", "पीरियडाइज़ेशन · संरचना", "Periodisasi · Struktur", "Périodisation · Structure", "Periodisierung · Struktur", "ピリオダイゼーション · 構造", "주기화 · 구조", "Периодизация · Структура", "周期化 · 结构"],
    "Periodización · Carga": ["Periodization · Load", "Periodização · Carga", "التخطيط الدوري · الحِمل", "पीरियडाइज़ेशन · लोड", "Periodisasi · Beban", "Périodisation · Charge", "Periodisierung · Belastung", "ピリオダイゼーション · 負荷", "주기화 · 부하", "Периодизация · Нагрузка", "周期化 · 负荷"],
    "Plan Gráfico": ["Graphic Plan", "Plano Gráfico", "الخطة البيانية", "ग्राफिक योजना", "Rencana Grafis", "Plan graphique", "Grafischer Plan", "グラフィックプラン", "그래픽 플랜", "Графический план", "图形计划"],
    "Sesiones de Entrenamiento": ["Training Sessions", "Sessões de Treino", "جلسات التدريب", "प्रशिक्षण सत्र", "Sesi Latihan", "Séances d'entraînement", "Trainingseinheiten", "トレーニングセッション", "훈련 세션", "Тренировочные сессии", "训练课"],
    "Sesiones de entrenamiento": ["Training sessions", "Sessões de treino", "جلسات التدريب", "प्रशिक्षण सत्र", "Sesi latihan", "Séances d'entraînement", "Trainingseinheiten", "トレーニングセッション", "훈련 세션", "Тренировочные сессии", "训练课"],
    "Herramientas y calculadoras": ["Tools & Calculators", "Ferramentas e calculadoras", "الأدوات والحاسبات", "उपकरण और कैलकुलेटर", "Alat & Kalkulator", "Outils et calculatrices", "Tools & Rechner", "ツールと計算機", "도구 및 계산기", "Инструменты и калькуляторы", "工具与计算器"],
    "Conclusiones": ["Conclusions", "Conclusões", "الاستنتاجات", "निष्कर्ष", "Kesimpulan", "Conclusions", "Schlussfolgerungen", "結論", "결론", "Выводы", "结论"],

    # ===== Catálogos de Información =====
    "Entidades": ["Entities", "Entidades", "الكيانات", "इकाइयाँ", "Entitas", "Entités", "Einheiten", "団体", "단체", "Организации", "机构"],
    "Equipos": ["Teams", "Equipes", "الفِرق", "टीमें", "Tim", "Équipes", "Teams", "チーム", "팀", "Команды", "队伍"],
    "Atletas": ["Athletes", "Atletas", "الرياضيون", "एथलीट", "Atlet", "Athlètes", "Athleten", "選手", "선수", "Спортсмены", "运动员"],
    "Deportes": ["Sports", "Esportes", "الرياضات", "खेल", "Olahraga", "Sports", "Sportarten", "スポーツ", "종목", "Виды спорта", "运动项目"],
    "Torneos": ["Tournaments", "Torneios", "البطولات", "टूर्नामेंट", "Turnamen", "Tournois", "Turniere", "トーナメント", "토너먼트", "Турниры", "锦标赛"],
    "Entrenadores": ["Coaches", "Treinadores", "المدربون", "कोच", "Pelatih", "Entraîneurs", "Trainer", "コーチ", "코치", "Тренеры", "教练"],
    "Información · Entidades": ["Information · Entities", "Informação · Entidades", "معلومات · الكيانات", "जानकारी · इकाइयाँ", "Informasi · Entitas", "Information · Entités", "Information · Einheiten", "情報 · 団体", "정보 · 단체", "Информация · Организации", "信息 · 机构"],
    "Información · Equipos": ["Information · Teams", "Informação · Equipes", "معلومات · الفِرق", "जानकारी · टीमें", "Informasi · Tim", "Information · Équipes", "Information · Teams", "情報 · チーム", "정보 · 팀", "Информация · Команды", "信息 · 队伍"],
    "Información · Atletas": ["Information · Athletes", "Informação · Atletas", "معلومات · الرياضيون", "जानकारी · एथलीट", "Informasi · Atlet", "Information · Athlètes", "Information · Athleten", "情報 · 選手", "정보 · 선수", "Информация · Спортсмены", "信息 · 运动员"],
    "Información · Deportes": ["Information · Sports", "Informação · Esportes", "معلومات · الرياضات", "जानकारी · खेल", "Informasi · Olahraga", "Information · Sports", "Information · Sportarten", "情報 · スポーツ", "정보 · 종목", "Информация · Виды спорта", "信息 · 运动项目"],
    "Información · Torneos": ["Information · Tournaments", "Informação · Torneios", "معلومات · البطولات", "जानकारी · टूर्नामेंट", "Informasi · Turnamen", "Information · Tournois", "Information · Turniere", "情報 · トーナメント", "정보 · 토너먼트", "Информация · Турниры", "信息 · 锦标赛"],
    "Información · Entrenadores": ["Information · Coaches", "Informação · Treinadores", "معلومات · المدربون", "जानकारी · कोच", "Informasi · Pelatih", "Information · Entraîneurs", "Information · Trainer", "情報 · コーチ", "정보 · 코치", "Информация · Тренеры", "信息 · 教练"],

    # ===== Evaluaciones =====
    "Control Médico": ["Medical Assessment", "Controle Médico", "الفحص الطبي", "चिकित्सा मूल्यांकन", "Pemeriksaan Medis", "Contrôle médical", "Medizinische Kontrolle", "メディカルチェック", "의료 검진", "Медицинский контроль", "医疗检查"],
    "Antropometría": ["Anthropometry", "Antropometria", "القياسات البشرية", "मानवमिति", "Antropometri", "Anthropométrie", "Anthropometrie", "身体計測", "인체측정", "Антропометрия", "人体测量"],
    "Control Físico": ["Physical Assessment", "Controle Físico", "الفحص البدني", "शारीरिक मूल्यांकन", "Pemeriksaan Fisik", "Contrôle physique", "Körperliche Kontrolle", "フィジカルチェック", "체력 검사", "Физический контроль", "体能检查"],
    "Biomecánica": ["Biomechanics", "Biomecânica", "الميكانيكا الحيوية", "बायोमैकेनिक्स", "Biomekanika", "Biomécanique", "Biomechanik", "バイオメカニクス", "생체역학", "Биомеханика", "生物力学"],
    "Control Técnico": ["Technical Assessment", "Controle Técnico", "الفحص الفني", "तकनीकी मूल्यांकन", "Pemeriksaan Teknis", "Contrôle technique", "Technische Kontrolle", "技術チェック", "기술 검사", "Технический контроль", "技术检查"],
    "Control Táctico": ["Tactical Assessment", "Controle Tático", "الفحص التكتيكي", "रणनीतिक मूल्यांकन", "Pemeriksaan Taktis", "Contrôle tactique", "Taktische Kontrolle", "戦術チェック", "전술 검사", "Тактический контроль", "战术检查"],
    "Control Psicológico": ["Psychological Assessment", "Controle Psicológico", "الفحص النفسي", "मनोवैज्ञानिक मूल्यांकन", "Pemeriksaan Psikologis", "Contrôle psychologique", "Psychologische Kontrolle", "心理チェック", "심리 검사", "Психологический контроль", "心理检查"],
    "Control Teórico": ["Theoretical Assessment", "Controle Teórico", "الفحص النظري", "सैद्धांतिक मूल्यांकन", "Pemeriksaan Teoretis", "Contrôle théorique", "Theoretische Kontrolle", "理論チェック", "이론 검사", "Теоретический контроль", "理论检查"],
    "Evaluación · Control médico": ["Evaluation · Medical", "Avaliação · Médico", "تقييم · طبي", "मूल्यांकन · चिकित्सा", "Evaluasi · Medis", "Évaluation · Médical", "Bewertung · Medizinisch", "評価 · メディカル", "평가 · 의료", "Оценка · Медицинский", "评估 · 医疗"],
    "Evaluación · Antropometría": ["Evaluation · Anthropometry", "Avaliação · Antropometria", "تقييم · القياسات البشرية", "मूल्यांकन · मानवमिति", "Evaluasi · Antropometri", "Évaluation · Anthropométrie", "Bewertung · Anthropometrie", "評価 · 身体計測", "평가 · 인체측정", "Оценка · Антропометрия", "评估 · 人体测量"],
    "Evaluación · Control físico": ["Evaluation · Physical", "Avaliação · Físico", "تقييم · بدني", "मूल्यांकन · शारीरिक", "Evaluasi · Fisik", "Évaluation · Physique", "Bewertung · Körperlich", "評価 · フィジカル", "평가 · 체력", "Оценка · Физический", "评估 · 体能"],
    "Evaluación · Biomecánica": ["Evaluation · Biomechanics", "Avaliação · Biomecânica", "تقييم · الميكانيكا الحيوية", "मूल्यांकन · बायोमैकेनिक्स", "Evaluasi · Biomekanika", "Évaluation · Biomécanique", "Bewertung · Biomechanik", "評価 · バイオメカニクス", "평가 · 생체역학", "Оценка · Биомеханика", "评估 · 生物力学"],
    "Evaluación · Control técnico": ["Evaluation · Technical", "Avaliação · Técnico", "تقييم · فني", "मूल्यांकन · तकनीकी", "Evaluasi · Teknis", "Évaluation · Technique", "Bewertung · Technisch", "評価 · 技術", "평가 · 기술", "Оценка · Технический", "评估 · 技术"],
    "Evaluación · Control táctico": ["Evaluation · Tactical", "Avaliação · Tático", "تقييم · تكتيكي", "मूल्यांकन · रणनीतिक", "Evaluasi · Taktis", "Évaluation · Tactique", "Bewertung · Taktisch", "評価 · 戦術", "평가 · 전술", "Оценка · Тактический", "评估 · 战术"],
    "Evaluación · Control psicológico": ["Evaluation · Psychological", "Avaliação · Psicológico", "تقييم · نفسي", "मूल्यांकन · मनोवैज्ञानिक", "Evaluasi · Psikologis", "Évaluation · Psychologique", "Bewertung · Psychologisch", "評価 · 心理", "평가 · 심리", "Оценка · Психологический", "评估 · 心理"],
    "Evaluación · Control teórico": ["Evaluation · Theoretical", "Avaliação · Teórico", "تقييم · نظري", "मूल्यांकन · सैद्धांतिक", "Evaluasi · Teoretis", "Évaluation · Théorique", "Bewertung · Theoretisch", "評価 · 理論", "평가 · 이론", "Оценка · Теоретический", "评估 · 理论"],

    # ===== KPI eyebrows / herramientas =====
    "MODELO": ["MODEL", "MODELO", "النموذج", "मॉडल", "MODEL", "MODÈLE", "MODELL", "モデル", "모델", "МОДЕЛЬ", "模型"],
    "DEPORTE": ["SPORT", "ESPORTE", "الرياضة", "खेल", "OLAHRAGA", "SPORT", "SPORTART", "スポーツ", "종목", "ВИД СПОРТА", "运动"],
    "SEMANAS": ["WEEKS", "SEMANAS", "أسابيع", "सप्ताह", "MINGGU", "SEMAINES", "WOCHEN", "週", "주", "НЕДЕЛИ", "周"],
    "MACROCICLOS": ["MACROCYCLES", "MACROCICLOS", "الدورات الكبرى", "मैक्रोसायकल", "MAKROSIKLUS", "MACROCYCLES", "MAKROZYKLEN", "マクロサイクル", "매크로사이클", "МАКРОЦИКЛЫ", "大周期"],
    "MESOCICLOS": ["MESOCYCLES", "MESOCICLOS", "الدورات المتوسطة", "मेसोसायकल", "MESOSIKLUS", "MÉSOCYCLES", "MESOZYKLEN", "メソサイクル", "메조사이클", "МЕЗОЦИКЛЫ", "中周期"],
    "MICROCICLOS": ["MICROCYCLES", "MICROCICLOS", "الدورات الصغرى", "माइक्रोसायकल", "MIKROSIKLUS", "MICROCYCLES", "MIKROZYKLEN", "マイクロサイクル", "마이크로사이클", "МИКРОЦИКЛЫ", "小周期"],
    "PLANIFICACIÓN": ["PLANNING", "PLANEJAMENTO", "التخطيط", "योजना", "PERENCANAAN", "PLANIFICATION", "PLANUNG", "計画", "계획", "ПЛАНИРОВАНИЕ", "规划"],
    "CARGA Y FUERZA": ["LOAD & STRENGTH", "CARGA E FORÇA", "الحِمل والقوة", "लोड और शक्ति", "BEBAN & KEKUATAN", "CHARGE ET FORCE", "BELASTUNG & KRAFT", "負荷と筋力", "부하 및 근력", "НАГРУЗКА И СИЛА", "负荷与力量"],
    "INTENSIDAD": ["INTENSITY", "INTENSIDADE", "الشدة", "तीव्रता", "INTENSITAS", "INTENSITÉ", "INTENSITÄT", "強度", "강도", "ИНТЕНСИВНОСТЬ", "强度"],
    "CONTROL": ["CONTROL", "CONTROLE", "المراقبة", "नियंत्रण", "KONTROL", "CONTRÔLE", "KONTROLLE", "コントロール", "관리", "КОНТРОЛЬ", "监控"],
    "BIOMECÁNICA": ["BIOMECHANICS", "BIOMECÂNICA", "الميكانيكا الحيوية", "बायोमैकेनिक्स", "BIOMEKANIKA", "BIOMÉCANIQUE", "BIOMECHANIK", "バイオメカニクス", "생체역학", "БИОМЕХАНИКА", "生物力学"],
    "TESTS": ["TESTS", "TESTES", "الاختبارات", "टेस्ट", "TES", "TESTS", "TESTS", "テスト", "테스트", "ТЕСТЫ", "测试"],

    # ===== Meta de portada (mayúsculas y mixtas) =====
    "AUTOR": ["AUTHOR", "AUTOR", "المؤلف", "लेखक", "PENULIS", "AUTEUR", "AUTOR", "著者", "작성자", "АВТОР", "作者"],
    "DIRECCIÓN TÉCNICA": ["TECHNICAL DIRECTOR", "DIREÇÃO TÉCNICA", "الإدارة الفنية", "तकनीकी निदेशक", "DIREKTUR TEKNIK", "DIRECTION TECHNIQUE", "TECHNISCHE LEITUNG", "テクニカルディレクター", "기술 책임자", "ТЕХНИЧЕСКИЙ ДИРЕКТОР", "技术总监"],
    "ATLETA": ["ATHLETE", "ATLETA", "الرياضي", "एथलीट", "ATLET", "ATHLÈTE", "ATHLET", "選手", "선수", "СПОРТСМЕН", "运动员"],
    "PROGRAMA": ["PROGRAM", "PROGRAMA", "البرنامج", "कार्यक्रम", "PROGRAM", "PROGRAMME", "PROGRAMM", "プログラム", "프로그램", "ПРОГРАММА", "项目"],
    "PERIODO": ["PERIOD", "PERÍODO", "الفترة", "अवधि", "PERIODE", "PÉRIODE", "ZEITRAUM", "期間", "기간", "ПЕРИОД", "周期"],
    "UBICACIÓN": ["LOCATION", "LOCAL", "الموقع", "स्थान", "LOKASI", "LIEU", "ORT", "場所", "위치", "МЕСТО", "地点"],
    "FECHA": ["DATE", "DATA", "التاريخ", "तिथि", "TANGGAL", "DATE", "DATUM", "日付", "날짜", "ДАТА", "日期"],
    "CÓDIGO": ["CODE", "CÓDIGO", "الرمز", "कोड", "KODE", "CODE", "CODE", "コード", "코드", "КОД", "编号"],
    "DURACIÓN": ["DURATION", "DURAÇÃO", "المدة", "अवधि", "DURASI", "DURÉE", "DAUER", "期間", "기간", "ДЛИТЕЛЬНОСТЬ", "时长"],
    "Autor": ["Author", "Autor", "المؤلف", "लेखक", "Penulis", "Auteur", "Autor", "著者", "작성자", "Автор", "作者"],
    "Dirección Técnica": ["Technical Director", "Direção Técnica", "الإدارة الفنية", "तकनीकी निदेशक", "Direktur Teknik", "Direction technique", "Technische Leitung", "テクニカルディレクター", "기술 책임자", "Технический директор", "技术总监"],
    "Atleta": ["Athlete", "Atleta", "الرياضي", "एथलीट", "Atlet", "Athlète", "Athlet", "選手", "선수", "Спортсмен", "运动员"],
    "Periodo": ["Period", "Período", "الفترة", "अवधि", "Periode", "Période", "Zeitraum", "期間", "기간", "Период", "周期"],
    "Lugar": ["Location", "Local", "الموقع", "स्थान", "Lokasi", "Lieu", "Ort", "場所", "위치", "Место", "地点"],
    "Fecha": ["Date", "Data", "التاريخ", "तिथि", "Tanggal", "Date", "Datum", "日付", "날짜", "Дата", "日期"],

    # ===== Encabezados de tabla =====
    "Nombre": ["Name", "Nome", "الاسم", "नाम", "Nama", "Nom", "Name", "名前", "이름", "Название", "名称"],
    "Detalle": ["Details", "Detalhe", "التفاصيل", "विवरण", "Detail", "Détail", "Detail", "詳細", "상세", "Детали", "详情"],
    "Aspecto": ["Aspect", "Aspecto", "الجانب", "पहलू", "Aspek", "Aspect", "Aspekt", "項目", "항목", "Аспект", "项目"],
    "Categoría": ["Category", "Categoria", "الفئة", "श्रेणी", "Kategori", "Catégorie", "Kategorie", "カテゴリ", "분류", "Категория", "类别"],
    "Valor": ["Value", "Valor", "القيمة", "मान", "Nilai", "Valeur", "Wert", "値", "값", "Значение", "数值"],
    "Objetivo": ["Target", "Meta", "الهدف", "लक्ष्य", "Target", "Objectif", "Ziel", "目標", "목표", "Цель", "目标"],
    "Unidad": ["Unit", "Unidade", "الوحدة", "इकाई", "Satuan", "Unité", "Einheit", "単位", "단위", "Единица", "单位"],
    "Microciclo": ["Microcycle", "Microciclo", "الدورة الصغرى", "माइक्रोसायकल", "Mikrosiklus", "Microcycle", "Mikrozyklus", "マイクロサイクル", "마이크로사이클", "Микроцикл", "小周期"],
    "Mesociclo": ["Mesocycle", "Mesociclo", "الدورة المتوسطة", "मेसोसायकल", "Mesosiklus", "Mésocycle", "Mesozyklus", "メソサイクル", "메조사이클", "Мезоцикл", "中周期"],
    "Fase": ["Phase", "Fase", "المرحلة", "चरण", "Fase", "Phase", "Phase", "フェーズ", "단계", "Фаза", "阶段"],
    "FASE": ["PHASE", "FASE", "المرحلة", "चरण", "FASE", "PHASE", "PHASE", "フェーズ", "단계", "ФАЗА", "阶段"],
    "MESOCICLO": ["MESOCYCLE", "MESOCICLO", "الدورة المتوسطة", "मेसोसायकल", "MESOSIKLUS", "MÉSOCYCLE", "MESOZYKLUS", "メソサイクル", "메조사이클", "МЕЗОЦИКЛ", "中周期"],
    "Tipo": ["Type", "Tipo", "النوع", "प्रकार", "Tipe", "Type", "Typ", "種類", "유형", "Тип", "类型"],
    "TIPO": ["TYPE", "TIPO", "النوع", "प्रकार", "TIPE", "TYPE", "TYP", "種類", "유형", "ТИП", "类型"],
    "Macro": ["Macro", "Macro", "كبرى", "मैक्रो", "Makro", "Macro", "Makro", "マクロ", "매크로", "Макро", "大周期"],
    "Volumen": ["Volume", "Volume", "الحجم", "वॉल्यूम", "Volume", "Volume", "Volumen", "ボリューム", "볼륨", "Объём", "训练量"],
    "Intens.": ["Intens.", "Intens.", "الشدة", "तीव्रता", "Intens.", "Intens.", "Intens.", "強度", "강도", "Интенс.", "强度"],
    "Ejercicio": ["Exercise", "Exercício", "التمرين", "व्यायाम", "Latihan", "Exercice", "Übung", "種目", "운동", "Упражнение", "练习"],
    "Series": ["Sets", "Séries", "المجموعات", "सेट", "Set", "Séries", "Sätze", "セット", "세트", "Подходы", "组数"],
    "Reps": ["Reps", "Reps", "التكرارات", "रेप्स", "Rep", "Reps", "Wdh.", "回数", "반복", "Повт.", "次数"],
    "Desc.": ["Rest", "Desc.", "الراحة", "विश्राम", "Istirahat", "Repos", "Pause", "休息", "휴식", "Отдых", "休息"],
    "Notas": ["Notes", "Notas", "ملاحظات", "नोट्स", "Catatan", "Notes", "Notizen", "メモ", "메모", "Заметки", "备注"],
    "CARGA": ["LOAD", "CARGA", "الحِمل", "लोड", "BEBAN", "CHARGE", "BELASTUNG", "負荷", "부하", "НАГРУЗКА", "负荷"],

    # ===== Etiquetas de fase =====
    "Preparación General": ["General Preparation", "Preparação Geral", "الإعداد العام", "सामान्य तैयारी", "Persiapan Umum", "Préparation générale", "Allgemeine Vorbereitung", "一般的準備期", "일반 준비기", "Общая подготовка", "一般准备期"],
    "Preparación Específica": ["Specific Preparation", "Preparação Específica", "الإعداد الخاص", "विशिष्ट तैयारी", "Persiapan Khusus", "Préparation spécifique", "Spezielle Vorbereitung", "専門的準備期", "전문 준비기", "Специальная подготовка", "专项准备期"],
    "Pre-Competitivo": ["Pre-Competitive", "Pré-Competitivo", "ما قبل المنافسة", "पूर्व-प्रतिस्पर्धी", "Pra-Kompetisi", "Pré-compétitif", "Vorwettkampf", "試合前期", "시합 준비기", "Предсоревновательный", "赛前期"],
    "Competitivo": ["Competitive", "Competitivo", "تنافسي", "प्रतिस्पर्धी", "Kompetitif", "Compétitif", "Wettkampf", "試合期", "시합기", "Соревновательный", "比赛期"],
    "Transición / Recuperación": ["Transition / Recovery", "Transição / Recuperação", "انتقال / تعافٍ", "संक्रमण / पुनर्प्राप्ति", "Transisi / Pemulihan", "Transition / Récupération", "Übergang / Erholung", "移行期 / 回復期", "전환 / 회복기", "Переход / Восстановление", "过渡期 / 恢复期"],
    "Mantenimiento": ["Maintenance", "Manutenção", "الصيانة", "रखरखाव", "Pemeliharaan", "Maintien", "Erhaltung", "維持期", "유지기", "Поддержание", "保持期"],
    "Personalizada": ["Custom", "Personalizada", "مخصصة", "कस्टम", "Kustom", "Personnalisée", "Benutzerdefiniert", "カスタム", "사용자 지정", "Пользовательская", "自定义"],

    # ===== Misc / footer =====
    "CUMPLIMIENTO": ["COMPLIANCE", "CUMPRIMENTO", "الإنجاز", "अनुपालन", "PEMENUHAN", "CONFORMITÉ", "ERFÜLLUNG", "達成度", "달성도", "ВЫПОЛНЕНИЕ", "完成度"],
    "Objetivo principal": ["Main objective", "Objetivo principal", "الهدف الرئيسي", "मुख्य उद्देश्य", "Tujuan utama", "Objectif principal", "Hauptziel", "主な目標", "주요 목표", "Главная цель", "主要目标"],
    "Generado por": ["Generated by", "Gerado por", "تم الإنشاء بواسطة", "द्वारा निर्मित", "Dibuat oleh", "Généré par", "Erstellt von", "作成者", "생성", "Сформировано", "由"],
}


# Fusionar cadenas-chrome adicionales de los otros generadores PDF (JSON externo).
import os as _os
import json as _json
_ALL = dict(_P)
try:
    _extra_path = _os.path.join(_os.path.dirname(__file__), "pdf_i18n_extra.json")
    with open(_extra_path, encoding="utf-8") as _f:
        _ALL.update(_json.load(_f))
except Exception:
    pass



def _table(lang):
    idx = LANGS.index(lang)
    return {es: vals[idx] for es, vals in _ALL.items()}


def translate_html(html: str, lang: str) -> str:
    """Traduce los nodos de texto del chrome (`>ES<`) al idioma `lang`."""
    if not lang or lang == "es" or lang not in LANGS:
        return html
    out = html
    # Reemplazar primero las frases más largas para evitar colisiones parciales.
    for es, tr in sorted(_table(lang).items(), key=lambda kv: -len(kv[0])):
        if not tr:
            continue
        out = out.replace(f">{es}<", f">{tr}<")
        out = out.replace(f">{es} <", f">{tr} <")
        out = out.replace(f">{es}</", f">{tr}</")
    return out
