// Utilidad para determinar el estado de un curso según fechas
// Retorna: { text, icon, tooltip }
export function getCourseStatus(publicationDate, expirationDate, creationDate) {
  const now = new Date();
  const pub = publicationDate ? new Date(publicationDate) : null;
  const exp = expirationDate ? new Date(expirationDate) : null;
  const cre = creationDate ? new Date(creationDate) : null;

  // 1. Cursos programados (con fecha de publicación futura)
  if (pub && pub > now) {
    return {
      text: 'Programado',
      icon: '🕒',
      tooltip: `Programado para publicarse el ${pub.toLocaleString()}`
    };
  }
  // 2. Cursos expirados
  if (exp && exp < now) {
    return {
      text: 'Expirado',
      icon: '❌',
      tooltip: `Este curso se publicó en ${pub ? pub.toLocaleString() : cre ? cre.toLocaleString() : 'desconocida'} y se expiró en ${exp.toLocaleString()}`
    };
  }
  // 3. Cursos por expirar (expiran en menos de 3 días)
  if (exp && (exp - now) / (1000 * 60 * 60 * 24) <= 3 && pub && pub <= now) {
    return {
      text: 'Expira pronto',
      icon: '⚠️⚠️',
      tooltip: `Publicado en ${pub.toLocaleString()}, expirará el ${exp.toLocaleString()}`
    };
  }
  // 4. Cursos publicados y con expiración futura
  if (pub && pub <= now && exp && exp > now) {
    return {
      text: 'Publicado',
      icon: '⚠️',
      tooltip: `Se publicó el ${pub.toLocaleString()}, expirará el ${exp.toLocaleString()}`
    };
  }
  // 5. Cursos publicados (con fecha de publicación pasada y sin expiración)
  if (pub && pub <= now && !exp) {
    return {
      text: 'Publicado',
      icon: '✔️✔️',
      tooltip: `Publicado en ${pub.toLocaleString()}`
    };
  }
  // 6. Cursos fijos (sin fecha de publicación ni expiración)
  if (!pub && !exp) {
    return {
      text: 'Publicado',
      icon: '✔️',
      tooltip: `Publicado en ${cre ? cre.toLocaleString() : 'desconocida'}`
    };
  }
  // Fallback
  return {
    text: 'Publicado',
    icon: '✔️✔️',
    tooltip: 'Publicado (sin fecha específica)'
  };
}
