export const INDICADORES_POR_CAMPO = {
  lenguajes: [
    'Escucha con atención a sus pares y a la educadora.',
    'Expresa ideas, emociones o necesidades con claridad.',
    'Participa en narraciones, cantos o juegos de lenguaje.',
    'Usa gestos, imágenes o movimiento para comunicarse.',
  ],
  saberes: [
    'Observa, pregunta y explora con curiosidad.',
    'Explica con sus palabras lo que descubrió.',
    'Usa materiales o herramientas de forma segura.',
    'Relaciona lo observado con su vida cotidiana.',
  ],
  etica: [
    'Convive con respeto y cuida a sus pares.',
    'Participa en acuerdos y rutinas del grupo.',
    'Reconoce emociones propias y de otras personas.',
    'Colabora en actividades de la comunidad del aula.',
  ],
  humano: [
    'Cuida su cuerpo en el juego y las rutinas.',
    'Muestra autonomía en hábitos cotidianos.',
    'Explora movimiento, espacio y materiales con seguridad.',
    'Identifica cambios en su cuerpo o en el entorno.',
  ],
}

export function proponerIndicadores(campoId) {
  return [...(INDICADORES_POR_CAMPO[campoId] || INDICADORES_POR_CAMPO.lenguajes)]
}
