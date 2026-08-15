/**
 * Modalidades de trabajo para la acción transformadora y el codiseño
 * (KMTM / Fase 2 Preescolar). Cada una tiene su estructura didáctica.
 */
export const MODALIDADES = [
  {
    id: 'proyectos',
    nombre: 'Proyectos',
    color: '#8E44AD',
    resumen:
      'Atiende una necesidad social (problema, interés o situación cotidiana) para transformar aula, escuela y comunidad.',
    momentos: [
      {
        titulo: '1. Planeación',
        intencion:
          'Organiza la propuesta: propósito, relevancia social, producción sugerida, campos, contenidos, PDA y ejes articuladores.',
      },
      {
        titulo: '2. Punto de partida',
        intencion:
          'Aproxima al grupo a la necesidad social. Actividades detonadoras para exponer saberes previos, preguntas y dudas que orienten el proyecto.',
      },
      {
        titulo: '3. ¡A trabajar!',
        intencion:
          'Desarrolla las acciones de aprendizaje: indagar, elaborar la producción, problematizar, apoyar dificultades y dar retroalimentación formativa.',
      },
      {
        titulo: '4. Comunicamos nuestros logros',
        intencion:
          'Comparten saberes y hallazgos con distintos lenguajes. Dan a conocer lo realizado en el aula, la escuela o la comunidad.',
      },
      {
        titulo: '5. Reflexión sobre el aprendizaje',
        intencion:
          'Valoran cómo trabajaron, qué dificultades hubo y qué saben hacer ahora. Sirve a la evaluación formativa y a nuevas decisiones.',
      },
    ],
  },
  {
    id: 'taller',
    nombre: 'Taller crítico',
    color: '#E67E22',
    resumen: 'Aprender haciendo: experiencias creativas mediante la elaboración de objetos con sentido pedagógico.',
    momentos: [
      {
        titulo: '1. Situación inicial',
        intencion:
          'Indagar qué saben, desconocen y quieren saber. Definir la finalidad didáctica del taller y el sentido de la producción.',
      },
      {
        titulo: '2. Organización de las acciones',
        intencion:
          'Acordar tiempo, materiales, espacio y actividades. Familiarizarse con el procedimiento e identificar las tareas.',
      },
      {
        titulo: '3. Puesta en marcha',
        intencion:
          'Búsqueda de información y elaboración de la producción. El producto es recurso de aprendizaje, no el único propósito.',
      },
      {
        titulo: '4. Valoramos lo aprendido',
        intencion:
          'Reflexionar sobre el proceso, los aprendizajes y la producción. Recuperar la evaluación formativa y la participación del grupo.',
      },
    ],
  },
  {
    id: 'juego',
    nombre: 'Aprendizaje basado en el juego',
    color: '#16A085',
    resumen: 'Parte del deseo de jugar para desarrollar y aprender, con carácter lúdico, didáctico y sistemático.',
    momentos: [
      {
        titulo: '1. Planteamiento del juego',
        intencion:
          'Presentar el juego, su sentido y las reglas o acuerdos. Recuperar saberes e intereses para entrar a la comunidad de juego.',
      },
      {
        titulo: '2. Comunidad de juego',
        intencion:
          'Conformar el grupo que juega: roles, turnos, colaboración y cuidado de materiales y espacios.',
      },
      {
        titulo: '3. Desarrollo de actividades',
        intencion:
          'Jugar con intención formativa. Variar espacios (aula, escuela, comunidad) y materiales estructurados o no estructurados.',
      },
      {
        titulo: '4. Compartimos la experiencia',
        intencion:
          'Expresar lo vivido: lo aprendido, el procedimiento, recomendaciones y aplicaciones en la vida comunitaria.',
      },
    ],
  },
  {
    id: 'rincones',
    nombre: 'Rincones de aprendizaje',
    color: '#2980B9',
    resumen:
      'Intercambios flexibles y lúdicos en áreas delimitadas para explorar, crear, imaginar e indagar.',
    momentos: [
      {
        titulo: '1. Saberes previos',
        intencion:
          'Recuperar lo que el grupo ya sabe. Presentar rincones, materiales y actividades; las niñas y los niños pueden proponer un rincón.',
      },
      {
        titulo: '2. Asamblea inicial y planeación',
        intencion:
          'Acordar días, número de participantes y la organización de la jornada. Fichas con pictogramas por rincón para el seguimiento.',
      },
      {
        titulo: '3. Exploración de los rincones',
        intencion:
          'Trabajo en cada rincón: explorar, relacionarse y ampliar el conocimiento con libertad. Lo importante son los logros en contenidos y PDA.',
      },
      {
        titulo: '4. Compartimos lo aprendido',
        intencion:
          'Asamblea de cierre de la jornada: poner en común hallazgos, dificultades y lo que se quiere seguir explorando.',
      },
      {
        titulo: '5. Reflexión sobre el aprendizaje',
        intencion:
          'Cuando todo el grupo haya participado, cierre general: valorar avances y tomar decisiones para siguientes experiencias.',
      },
    ],
  },
  {
    id: 'centros',
    nombre: 'Centros de interés',
    color: '#C0392B',
    resumen: 'La actividad infantil se organiza en torno a aquello que les resulta interesante y significativo.',
    momentos: [
      {
        titulo: '1. Identificación e integración',
        intencion:
          'Detectar el interés del grupo e integrarlo a una propuesta formativa con contenidos y PDA pertinentes.',
      },
      {
        titulo: '2. En contacto con la realidad',
        intencion:
          'Explorar el tema en el entorno cercano: observar, preguntar, comparar y vincular con la vida cotidiana.',
      },
      {
        titulo: '3. Expresión',
        intencion:
          'Expresar lo comprendido con distintos lenguajes y producciones. Compartir y valorar la experiencia.',
      },
    ],
  },
  {
    id: 'unidad',
    nombre: 'Unidad didáctica',
    color: '#1ABC9C',
    resumen:
      'Organiza contenidos alrededor de un recorte de la realidad para indagarlo a profundidad e incidir de forma positiva.',
    momentos: [
      {
        titulo: '1. Lectura de la realidad',
        intencion:
          'Observar el recorte de la realidad elegido. Registrar información (dibujos, notas, rotafolios) para comprender el contexto.',
      },
      {
        titulo: '2. Identificación de la trama y complejidad',
        intencion:
          'Reconocer partes, relaciones y complejidad del tema. Identificar en qué se puede incidir para mejorar.',
      },
      {
        titulo: '3. Planificación y organización del trabajo',
        intencion:
          'Acordar acciones, tiempos, espacios (aula, escuela, comunidad) y materiales coherentes con la propuesta completa.',
      },
      {
        titulo: '4. Exploración y descubrimiento',
        intencion:
          'Indagar, experimentar y descubrir. Organizar información en tablas, maquetas, murales u otros medios.',
      },
      {
        titulo: '5. Participación activa y horizontal',
        intencion:
          'Diálogo, colaboración y toma de decisiones con las niñas y los niños, las familias y otros actores.',
      },
      {
        titulo: '6. Valoración de la experiencia',
        intencion:
          'Evaluar cómo trabajaron, qué conflictos hubo y qué aprendieron. Autoevaluación y coevaluación.',
      },
      {
        titulo: '7. Presentar el producto',
        intencion:
          'Momento para utilizar, jugar o presentar lo realizado. Compartir hallazgos y explicar cómo se puede mejorar la realidad.',
      },
    ],
  },
]
