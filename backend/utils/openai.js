const axios = require('axios');

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'a395422547639472f6b8ec50939cb5788211288d4d0e0a4dd1bd2063497c1376';
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const TOGETHER_MODEL = 'mistralai/Mixtral-8x7B-Instruct-v0.1';

async function isOpenAnswerCorrect(userAnswer, correctAnswer) {
  const prompt = `
Pregunta ideal: ${correctAnswer}
Respuesta del usuario: ${userAnswer}

¿La respuesta del usuario expresa el mismo significado, intención o contexto que la respuesta ideal? Considera sinónimos, parafraseos, equivalencias semánticas y frases similares, incluso si las palabras no son idénticas. Solo rechaza si el significado es claramente diferente o incorrecto. Sé flexible y permisivo con sinónimos y expresiones equivalentes.
Empieza tu respuesta SOLO con SI o NO, seguido de un punto. Luego, en una explicación breve, justifica tu decisión de forma clara y concisa.
Ejemplo: SI. Ambas respuestas expresan la importancia de escuchar.`;
  try {
    const res = await axios.post(
      TOGETHER_API_URL,
      {
        model: TOGETHER_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const iaText = res.data.choices[0].message.content.trim();
    // Buscar SI/NO al inicio, si no, buscar en la explicación
    let isCorrect = false;
    let iaReason = iaText;
    const match = iaText.match(/^(SI|NO)\.?\s*(.*)$/i);
    if (match) {
      isCorrect = match[1].toUpperCase() === 'SI';
      iaReason = match[2].trim();
    } else {
      // fallback: buscar palabras clave en la explicación
      if (/equivalente|mismo significado|similar|sinónim|escuchar|considera/i.test(iaText)) {
        isCorrect = true;
      }
    }
    return { isCorrect, iaReason };
  } catch (err) {
    console.error('Error consultando Together AI:', err?.response?.data || err.message);
    return { isCorrect: false, iaReason: 'Error consultando IA' };
  }
}

module.exports = { isOpenAnswerCorrect };