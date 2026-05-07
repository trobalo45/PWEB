const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');

function extrairToken(req) {
  const cabecalho = req.headers.authorization || '';
  if (!cabecalho.startsWith('Bearer ')) return null;
  return cabecalho.slice(7).trim();
}

async function verifyToken(req, res, next) {
  const token = extrairToken(req);
  if (!token) {
    return res
      .status(401)
      .json({ erro: 'Token de autenticação em falta.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const utilizador = await Utilizador.findById(payload.sub);
    if (!utilizador || !utilizador.ativo) {
      return res
        .status(401)
        .json({ erro: 'Utilizador inválido ou inativo.' });
    }
    req.user = utilizador;
    req.tokenPayload = payload;
    return next();
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado.' });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

function checkRole(...perfis) {
  return function middleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ erro: 'Autenticação requerida.' });
    }
    if (!perfis.includes(req.user.perfil)) {
      return res
        .status(403)
        .json({ erro: 'Não tem permissões para esta operação.' });
    }
    return next();
  };
}

module.exports = { verifyToken, checkRole };
