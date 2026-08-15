import { CAMPOS } from '../src/data/catalogoFase2.js'
import {
  buildOpcionesParaPda,
  MIN_CHARS,
  MAX_CHARS,
} from '../src/data/descripcionesNivel.js'

const outOfRange = []
const awkward = []
let count = 0

for (const c of CAMPOS) {
  for (const cont of c.contenidos) {
    for (const pda of cont.pdas) {
      count += 1
      const o = buildOpcionesParaPda(pda.texto)
      for (const niv of ['L', 'E', 'P', 'RA']) {
        o[niv].forEach((t, i) => {
          if (t.length < MIN_CHARS || t.length > MAX_CHARS) {
            outOfRange.push({ code: pda.codigo, niv, i, len: t.length, t })
          }
          if (/\b(si|al|de|con|sin|y|o|que|para|una|un|el|la|los|las|se|su)\.$/i.test(t)) {
            awkward.push({ code: pda.codigo, niv, i, t })
          }
        })
      }
    }
  }
}

console.log('pdas', count, 'outOfRange', outOfRange.length, 'awkward', awkward.length)
outOfRange.slice(0, 10).forEach((b) => {
  console.log('RANGE', b.code, b.niv + b.i, b.len, b.t)
})
awkward.slice(0, 8).forEach((b) => {
  console.log('AWK', b.code, b.niv + b.i, b.t.slice(-90))
})

const demo = buildOpcionesParaPda(CAMPOS[0].contenidos[0].pdas[0].texto)
for (const niv of ['L', 'E', 'P', 'RA']) {
  demo[niv].forEach((t, i) => console.log(niv + i, t.length, t))
}
