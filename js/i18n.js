const TRANSLATIONS = {
  es: {
    nav: {
      about: "Sobre mí",
      specialties: "Especialidades",
      booking: "Reservar cita",
      reviews: "Opiniones",
      contact: "Contacto",
      bookBtn: "Reservar cita"
    },
    hero: {
      badge: "Psicóloga General Sanitaria · +20 años de experiencia",
      title1: "Tu bienestar",
      title2: "es posible",
      subtitle: "Terapia psicológica online y presencial adaptada a ti. Con cercanía, rigor y herramientas reales desde el primer día.",
      ctaPrimary: "Reservar cita online",
      ctaSecondary: "Ver especialidades",
      stat1num: "20+", stat1lbl: "Años de experiencia",
      stat2num: "140", stat2lbl: "Pacientes satisfechos",
      stat3num: "55€", stat3lbl: "Desde / sesión"
    },
    about: {
      label: "Sobre mí",
      title: "Soy Marita, acompaño a personas en sus momentos más difíciles",
      p1: "Llevo ejerciendo la psicología desde 2004. A lo largo de estos años he desarrollado una forma de trabajar que combina experiencia clínica, formación especializada y un enfoque cercano, humano y adaptado a cada persona.",
      p2: "La terapia no es solo hablar: es comprender lo que te ocurre y trabajar contigo para cambiarlo. Cada proceso es único, por eso adapto la intervención a lo que realmente necesitas, sin fórmulas generales.",
      certTitle: "Formación y especialización",
      cert1: "Neuropsicología Forense",
      cert2: "Trauma y EMDR",
      cert3: "Psicología en Catástrofes y Emergencias",
      cert4: "Mediación y Resolución de Conflictos",
      cert5: "Psicogerontología",
      cert6: "Coaching Motivacional y Mentoring Personal"
    },
    modalities: {
      label: "Modalidades",
      title: "Elige cómo quieres trabajar",
      onlineTitle: "Terapia Online",
      onlineBadge: "Recomendada",
      onlineDesc: "Recibe acompañamiento profesional desde cualquier lugar. Sin barreras geográficas, con total comodidad y la misma eficacia que la sesión presencial.",
      onlineFeature1: "Zoom, Skype, Meet o Teams",
      onlineFeature2: "Horario flexible",
      onlineFeature3: "Desde cualquier país",
      onlineFeature4: "Acceso inmediato",
      onlineCta: "Reservar sesión online",
      presencialTitle: "Terapia Presencial",
      presencialDesc: "Sesiones en nuestro centro en Jerez de la Frontera. Un espacio cálido, confidencial y preparado para que te sientas cómodo/a desde el primer momento.",
      presencialFeature1: "Centro en Jerez",
      presencialFeature2: "Av. Alcalde Álvaro Domecq 18",
      presencialFeature3: "Ambiente cálido y privado",
      presencialFeature4: "Fácil aparcamiento",
      presencialCta: "Reservar sesión presencial",
      price: "Desde 55€/sesión · 1 hora"
    },
    specialties: {
      label: "Especialidades",
      title: "Áreas de intervención",
      items: [
        { icon: "◎", title: "Ansiedad y estrés", desc: "Ataques de pánico, preocupación excesiva, estrés laboral y fobias." },
        { icon: "◉", title: "Depresión", desc: "Tristeza persistente, pérdida de motivación y bajo estado de ánimo." },
        { icon: "◈", title: "Autoestima e inseguridad", desc: "Trabajo profundo de identidad, confianza y autoimagen." },
        { icon: "◍", title: "Duelo y pérdidas", desc: "Acompañamiento en procesos de pérdida, cambio y adaptación." },
        { icon: "◌", title: "Pareja y familia", desc: "Conflictos de pareja, dependencia emocional y terapia familiar." },
        { icon: "◐", title: "Trastornos del sueño", desc: "Insomnio, sueño no reparador y dificultades de descanso." },
        { icon: "◑", title: "Niños y adolescentes", desc: "Miedos, acoso escolar, problemas de conducta y aprendizaje." },
        { icon: "◒", title: "Burnout y mobbing", desc: "Agotamiento laboral, acoso en el trabajo y crisis vitales." }
      ]
    },
    booking: {
      label: "Reserva tu cita",
      title: "¿Cuándo empezamos?",
      subtitle: "Elige modalidad, fecha y hora. Recibirás confirmación por email al instante.",
      modalityLabel: "Modalidad",
      online: "Online",
      presencial: "Presencial",
      selectDate: "Selecciona una fecha disponible",
      selectTime: "Selecciona un horario",
      formTitle: "Tus datos",
      nameLabel: "Nombre",
      lastnameLabel: "Apellidos",
      emailLabel: "Email",
      phoneLabel: "Teléfono",
      reasonLabel: "Motivo de consulta (opcional)",
      reasonPlaceholder: "Cuéntame brevemente qué te trae (confidencial)...",
      submitBtn: "Confirmar reserva",
      submitting: "Reservando...",
      successTitle: "¡Cita confirmada!",
      successMsg: "Te hemos enviado un email de confirmación. Nos vemos pronto.",
      errorSlot: "Este horario acaba de ser reservado. Por favor elige otro.",
      errorGeneral: "Ha ocurrido un error. Por favor inténtalo de nuevo.",
      booked: "Ocupado",
      available: "Disponible",
      legend: "Verde = disponible · Gris = no disponible · Rojo = ocupado",
      noSlots: "No hay horarios disponibles este día.",
      loading: "Cargando horarios..."
    },
    reviews: {
      label: "Opiniones",
      title: "Lo que dicen los pacientes",
      verified: "Paciente verificado",
      items: [
        { name: "Lole", date: "11 Abril 2026", text: "Nos ha ayudado mucho a nivel familiar, con orientaciones claras y útiles. Su apoyo con mi hijo ha sido clave para mejorar los problemas de conducta. Muy cercana, implicada y profesional. Estamos muy agradecidos." },
        { name: "Marta", date: "9 Abril 2026", text: "Marita me ha ayudado mucho a gestionar la ansiedad derivada de una situación laboral bastante compleja. He ido ganando calma y claridad para afrontar el problema. Muy profesional y cercana." },
        { name: "Fabio", date: "4 Abril 2026", text: "Terapia efectiva, cómoda y práctica. Se adaptó en todo momento a mis necesidades. Desde mi experiencia 100% recomendable." },
        { name: "Samia", date: "15 Abril 2026", text: "Muy contenta con la atención. Muy profesional y cercana desde el primer momento." },
        { name: "Francisca", date: "6 Abril 2026", text: "Un trato excepcional y una profesional como pocas. Me ha cambiado la vida. Totalmente recomendable." }
      ]
    },
    contact: {
      label: "Contacto",
      title: "¿Tienes alguna pregunta?",
      subtitle: "Puedes escribirme o llamarme. Te respondo en menos de 24 horas.",
      nameLabel: "Nombre",
      emailLabel: "Email",
      messageLabel: "Mensaje",
      submitBtn: "Enviar mensaje",
      submitting: "Enviando...",
      successMsg: "¡Mensaje enviado! Te respondo pronto.",
      errorMsg: "Ha ocurrido un error. Por favor inténtalo de nuevo.",
      phone: "+34 697 911 679",
      email: "maritagpsicologa@gmail.com",
      address: "Av. Alcalde Álvaro Domecq 18, 2ºA · Jerez de la Frontera",
      scheduleTitle: "Horario de atención",
      schedule: "Lunes a viernes: 9:00 – 14:00 y 17:00 – 20:00",
      whatsapp: "Escribir por WhatsApp"
    },
    footer: {
      rights: "Todos los derechos reservados.",
      privacy: "Política de privacidad",
      legal: "Aviso legal",
      cookies: "Cookies"
    }
  },

  en: {
    nav: {
      about: "About me",
      specialties: "Specialties",
      booking: "Book a session",
      reviews: "Reviews",
      contact: "Contact",
      bookBtn: "Book a session"
    },
    hero: {
      badge: "Licensed Clinical Psychologist · 20+ years of experience",
      title1: "Your wellbeing",
      title2: "is possible",
      subtitle: "Online and in-person psychological therapy tailored to you. With warmth, expertise and practical tools from day one.",
      ctaPrimary: "Book online session",
      ctaSecondary: "View specialties",
      stat1num: "20+", stat1lbl: "Years of experience",
      stat2num: "140", stat2lbl: "Happy patients",
      stat3num: "55€", stat3lbl: "From / session"
    },
    about: {
      label: "About me",
      title: "I'm Marita, I support people through their most difficult moments",
      p1: "I have been practising psychology since 2004. Over the years I have developed a way of working that combines clinical experience, specialist training and a warm, human approach adapted to each person.",
      p2: "Therapy is not just talking: it's understanding what is happening to you and working together to change it. Every process is unique, which is why I tailor the intervention to what you really need — no one-size-fits-all formulas.",
      certTitle: "Training & specialisations",
      cert1: "Forensic Neuropsychology",
      cert2: "Trauma & EMDR",
      cert3: "Disaster & Emergency Psychology",
      cert4: "Mediation & Conflict Resolution",
      cert5: "Psychogerontology",
      cert6: "Motivational Coaching & Personal Mentoring"
    },
    modalities: {
      label: "Modalities",
      title: "Choose how you want to work",
      onlineTitle: "Online Therapy",
      onlineBadge: "Recommended",
      onlineDesc: "Get professional support from anywhere. No geographical barriers, full comfort and the same effectiveness as an in-person session.",
      onlineFeature1: "Zoom, Skype, Meet or Teams",
      onlineFeature2: "Flexible schedule",
      onlineFeature3: "From any country",
      onlineFeature4: "Immediate access",
      onlineCta: "Book online session",
      presencialTitle: "In-Person Therapy",
      presencialDesc: "Sessions at our centre in Jerez de la Frontera. A warm, confidential space where you will feel comfortable from the very first moment.",
      presencialFeature1: "Centre in Jerez",
      presencialFeature2: "Av. Alcalde Álvaro Domecq 18",
      presencialFeature3: "Warm & private setting",
      presencialFeature4: "Easy parking",
      presencialCta: "Book in-person session",
      price: "From €55/session · 1 hour"
    },
    specialties: {
      label: "Specialties",
      title: "Areas of intervention",
      items: [
        { icon: "◎", title: "Anxiety & stress", desc: "Panic attacks, excessive worry, work-related stress and phobias." },
        { icon: "◉", title: "Depression", desc: "Persistent sadness, loss of motivation and low mood." },
        { icon: "◈", title: "Self-esteem & insecurity", desc: "Deep work on identity, confidence and self-image." },
        { icon: "◍", title: "Grief & loss", desc: "Support through processes of loss, change and adaptation." },
        { icon: "◌", title: "Couples & family", desc: "Relationship conflicts, emotional dependency and family therapy." },
        { icon: "◐", title: "Sleep disorders", desc: "Insomnia, non-restorative sleep and rest difficulties." },
        { icon: "◑", title: "Children & adolescents", desc: "Fears, bullying, behavioural problems and learning difficulties." },
        { icon: "◒", title: "Burnout & mobbing", desc: "Work exhaustion, workplace harassment and life crises." }
      ]
    },
    booking: {
      label: "Book your session",
      title: "When shall we start?",
      subtitle: "Choose modality, date and time. You'll receive an email confirmation instantly.",
      modalityLabel: "Modality",
      online: "Online",
      presencial: "In-person",
      selectDate: "Select an available date",
      selectTime: "Select a time slot",
      formTitle: "Your details",
      nameLabel: "First name",
      lastnameLabel: "Surname(s)",
      emailLabel: "Email",
      phoneLabel: "Phone",
      reasonLabel: "Reason for consultation (optional)",
      reasonPlaceholder: "Tell me briefly what brings you here (confidential)...",
      submitBtn: "Confirm booking",
      submitting: "Booking...",
      successTitle: "Session confirmed!",
      successMsg: "We've sent you a confirmation email. See you soon.",
      errorSlot: "This slot was just booked. Please choose another.",
      errorGeneral: "An error occurred. Please try again.",
      booked: "Booked",
      available: "Available",
      legend: "Green = available · Grey = unavailable · Red = booked",
      noSlots: "No available times on this day.",
      loading: "Loading times..."
    },
    reviews: {
      label: "Reviews",
      title: "What patients say",
      verified: "Verified patient",
      items: [
        { name: "Lole", date: "11 April 2026", text: "She has helped us enormously as a family, with clear and useful guidance. Her support with my son has been key to improving his behavioural problems. Very warm, committed and professional. We are very grateful." },
        { name: "Marta", date: "9 April 2026", text: "Marita has helped me greatly to manage the anxiety stemming from a very complex work situation. I have gradually gained calm and clarity to face the problem. Very professional and warm." },
        { name: "Fabio", date: "4 April 2026", text: "Effective, comfortable and practical therapy. She adapted to my needs at every step. From my experience, 100% recommended." },
        { name: "Samia", date: "15 April 2026", text: "Very happy with the service. Very professional and warm from the very first moment." },
        { name: "Francisca", date: "6 April 2026", text: "Exceptional treatment and a professional like few others. She has changed my life. Totally recommended." }
      ]
    },
    contact: {
      label: "Contact",
      title: "Do you have any questions?",
      subtitle: "You can write or call me. I reply within 24 hours.",
      nameLabel: "Name",
      emailLabel: "Email",
      messageLabel: "Message",
      submitBtn: "Send message",
      submitting: "Sending...",
      successMsg: "Message sent! I'll reply soon.",
      errorMsg: "An error occurred. Please try again.",
      phone: "+34 697 911 679",
      email: "maritagpsicologa@gmail.com",
      address: "Av. Alcalde Álvaro Domecq 18, 2ºA · Jerez de la Frontera",
      scheduleTitle: "Opening hours",
      schedule: "Monday to Friday: 9:00 – 14:00 and 17:00 – 20:00",
      whatsapp: "Message on WhatsApp"
    },
    footer: {
      rights: "All rights reserved.",
      privacy: "Privacy policy",
      legal: "Legal notice",
      cookies: "Cookies"
    }
  }
};

function t(path) {
  const keys = path.split('.');
  let obj = TRANSLATIONS[window.currentLang || 'es'];
  for (const k of keys) { obj = obj?.[k]; }
  return obj ?? path;
}