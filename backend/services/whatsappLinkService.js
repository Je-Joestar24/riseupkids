function escapeForTemplate(value) {
  if (value == null) return '';
  return String(value).trim();
}

function getFirstName(parentName) {
  const name = escapeForTemplate(parentName);
  if (!name) return '';
  return name.split(/\s+/)[0] || '';
}

function normalizeWhatsAppPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  // wa.me requires country code + number, digits only (no +, spaces, parentheses, etc.)
  return phone.replace(/\D/g, '');
}

function buildWhatsAppMessage({ parentName, language }) {
  const name = getFirstName(parentName) || escapeForTemplate(parentName) || '';
  const lang = (language || '').toString().trim().toLowerCase();

  if (lang === 'pt') {
    return `Olá ${name}! Aqui é a Viviana do Rise Up Kids 😊\nVi que você se registrou para saber mais sobre o programa e queria saber se você tem alguma pergunta. Ficarei feliz em ajudar!`;
  }
  if (lang === 'es') {
    return `Hola ${name}! Soy Viviana de Rise Up Kids 😊\nVi que te registraste para saber más sobre el programa y quería saber si tienes alguna pregunta. ¡Con gusto puedo ayudarte!`;
  }
  // default en
  return `Hi ${name}! This is Viviana from Rise Up Kids 😊\nI saw that you registered to learn more about the program and wanted to see if you have any questions. I'd be happy to help!`;
}

function buildWhatsAppLink({ whatsapp, parentName, language }) {
  const phone = normalizeWhatsAppPhone(whatsapp);
  if (!phone) return null;
  const message = buildWhatsAppMessage({ parentName, language });
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

module.exports = {
  normalizeWhatsAppPhone,
  buildWhatsAppMessage,
  buildWhatsAppLink,
};

