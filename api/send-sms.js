// api/send-sms.js
const crypto = require('crypto');

export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { number, message, caller_id, api_key, api_secret } = req.body;

    // Validar parámetros requeridos
    if (!number || !message || !api_key || !api_secret) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos: number, message, api_key, api_secret' 
      });
    }

    const method = 'POST';
    const apiUrl = '/v1/sms/send/';

    // Construir parámetros ordenados alfabéticamente
    const paramsObj = {
      'number': number,
      'message': message
    };

    // Agregar caller_id solo si está presente
    if (caller_id) {
      paramsObj['caller_id'] = caller_id;
    }

    // Ordenar alfabéticamente y construir string de parámetros
    const sortedKeys = Object.keys(paramsObj).sort();
    const params = sortedKeys
      .map(key => `${key}=${encodeURIComponent(paramsObj[key])}`)
      .join('&');

    // MD5 del body (vacío para este caso)
    const md5Body = crypto.createHash('md5').update('').digest('hex');

    // Crear string para firmar
    const stringToSign = `${method}${apiUrl}${params}${md5Body}`;

    // Generar firma HMAC-SHA1
    const signature = crypto
      .createHmac('sha1', api_secret)
      .update(stringToSign)
      .digest('base64');

    // Construir URL completa
    const fullUrl = `https://api.zadarma.com${apiUrl}?${params}`;

    // Hacer la petición a Zadarma
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `${api_key}:${signature}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();

    // Devolver la respuesta de Zadarma
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
