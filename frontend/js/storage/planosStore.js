import * as local from './planosDB.js';
import * as remoto from '../api/planosAPI.js';

const CHAVE_TOKEN = 'greenherb.token';

export function temToken() {
  try {
    return Boolean(localStorage.getItem(CHAVE_TOKEN));
  } catch {
    return false;
  }
}

export function estaOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function modoAtivo() {
  return estaOnline() && temToken() ? 'remoto' : 'local';
}

function escolher() {
  return modoAtivo() === 'remoto' ? remoto : local;
}

export async function init() {
  await local.init().catch(() => {});
  return true;
}

export async function listarPlanos() {
  return escolher().listarPlanos();
}

export async function obterPlano(id) {
  return escolher().obterPlano(id);
}

export async function guardarPlano(plano) {
  return escolher().guardarPlano(plano);
}

export async function eliminarPlano(id) {
  return escolher().eliminarPlano(id);
}
