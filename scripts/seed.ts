import { pool, transaction } from '../src/lib/db';
import bcrypt from 'bcryptjs';
const examples = [
  [
    'Biología',
    'La célula',
    '¿Qué orgánulo produce la mayor parte del ATP durante la respiración celular aeróbica?',
    'Mitocondria',
    'Ribosoma',
    'La mitocondria produce ATP mediante la fosforilación oxidativa. Los ribosomas participan en la síntesis de proteínas.',
    'biomedicas',
  ],
  [
    'Química',
    'Estructura atómica',
    '¿Qué partícula del átomo tiene carga eléctrica negativa?',
    'Electrón',
    'Protón',
    'El electrón tiene carga negativa; el protón, positiva, y el neutrón no tiene carga eléctrica neta.',
    'biomedicas',
  ],
  [
    'Biología',
    'Genética',
    '¿Cuántas cromátidas tiene un cromosoma después de la replicación del ADN y antes de separarse?',
    'Dos cromátidas hermanas',
    'Una cromátida',
    'Tras la replicación, cada cromosoma está compuesto por dos cromátidas hermanas unidas en el centrómero.',
    'biomedicas',
  ],
  [
    'Física',
    'Cinemática',
    'Si un móvil recorre 60 metros en 3 segundos a velocidad constante, ¿cuál es su rapidez?',
    '20 metros por segundo',
    '180 metros por segundo',
    'La rapidez es distancia dividida entre tiempo: 60 dividido entre 3 da 20 metros por segundo.',
    'ingenierias',
  ],
  [
    'Álgebra',
    'Ecuaciones',
    'Si dos equis más seis es igual a catorce, ¿cuánto vale equis?',
    'Cuatro',
    'Diez',
    'Restamos seis en ambos miembros: dos equis es ocho. Al dividir entre dos, equis es cuatro.',
    'ingenierias',
  ],
  [
    'Aritmética',
    'Porcentajes',
    '¿Cuánto representa el veinte por ciento de ciento cincuenta?',
    'Treinta',
    'Veinte',
    'Veinte por ciento equivale a 0,20. Multiplicamos 150 por 0,20 y obtenemos 30.',
    'ingenierias',
  ],
  [
    'Historia',
    'Historia del Perú',
    '¿En qué año se proclamó la independencia del Perú en Lima?',
    '1821',
    '1824',
    'José de San Martín proclamó la independencia del Perú en Lima el 28 de julio de 1821.',
    'sociales',
  ],
  [
    'Lenguaje',
    'Acentuación',
    '¿Cuál de estas palabras es esdrújula?',
    'Música',
    'Papel',
    'Música lleva la fuerza de voz en la antepenúltima sílaba. Las palabras esdrújulas llevan tilde.',
    'sociales',
  ],
  [
    'Geografía',
    'Coordenadas',
    '¿Qué coordenada expresa la distancia angular respecto del ecuador terrestre?',
    'Latitud',
    'Longitud',
    'La latitud se mide hacia el norte o sur desde el ecuador; la longitud se mide desde el meridiano de referencia.',
    'sociales',
  ],
];
try {
  await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtext('ingresape-seed'))");
    const email = process.env.ADMIN_EMAIL?.toLowerCase(),
      password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 12)
      throw new Error('Ejecuta npm run setup. ADMIN_PASSWORD debe tener al menos 12 caracteres.');
    await c.query(
      'INSERT INTO users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',
      [email, await bcrypt.hash(password, 12)],
    );
    for (const a of [
      ['biomedicas', 'Biomédicas', '#6DD5AC'],
      ['ingenierias', 'Ingenierías', '#8CB9FF'],
      ['sociales', 'Sociales', '#F4C16D'],
    ])
      await c.query(
        'INSERT INTO areas(slug,name,color) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        a,
      );
    for (const name of [
      'Biología',
      'Química',
      'Física',
      'Álgebra',
      'Aritmética',
      'Geometría',
      'Trigonometría',
      'Historia',
      'Geografía',
      'Lenguaje',
      'Literatura',
      'Razonamiento Matemático',
      'Razonamiento Verbal',
      'Razonamiento Lógico',
      'Comprensión Lectora',
      'Psicología',
      'Filosofía',
      'Educación Cívica',
      'Lectura',
      'Gramática',
    ])
      await c.query('INSERT INTO courses(name) VALUES($1) ON CONFLICT DO NOTHING', [name]);
    const source = (
      await c.query(
        "INSERT INTO sources(name) VALUES('Muestra original · práctica revisable, no examen oficial') ON CONFLICT(name) DO UPDATE SET name=excluded.name RETURNING id",
      )
    ).rows[0];
    if (!(await c.query('SELECT 1 FROM questions LIMIT 1')).rowCount)
      for (const [course, topic, statement, correct, wrong, explanation, area] of examples) {
        const courseId = (await c.query('SELECT id FROM courses WHERE name=$1', [course])).rows[0]
          .id;
        const topicId = (
          await c.query(
            'INSERT INTO topics(course_id,name) VALUES($1,$2) ON CONFLICT(course_id,name) DO UPDATE SET name=excluded.name RETURNING id',
            [courseId, topic],
          )
        ).rows[0].id;
        const q = (
          await c.query(
            "INSERT INTO questions(topic_id,source_id,difficulty) VALUES($1,$2,'basica') RETURNING id",
            [topicId, source.id],
          )
        ).rows[0];
        const v = (
          await c.query(
            'INSERT INTO question_versions(question_id,statement,explanation,approved) VALUES($1,$2,$3,true) RETURNING id',
            [q.id, statement, explanation],
          )
        ).rows[0];
        await c.query(
          'INSERT INTO question_areas(question_id,area_id) SELECT $1,id FROM areas WHERE slug=$2',
          [q.id, area],
        );
        await c.query(
          "INSERT INTO question_choices(question_version_id,label,content,is_correct) VALUES($1,'A',$2,true),($1,'B',$3,false)",
          [v.id, correct, wrong],
        );
      }
    if (!(await c.query('SELECT 1 FROM templates LIMIT 1')).rowCount)
      for (const [name, description, kind] of [
        ['Dino responde', 'Pregunta fija, dinosaurio animado y explicación al cierre.', 'video'],
        ['Reto de admisión', 'Cuenta regresiva y alternativa correcta destacada.', 'video'],
        [
          'Pregunta del día',
          'Una pregunta lista para compartir con la identidad de Ingresa PE.',
          'image',
        ],
        ['Repaso en tres pasos', 'Pregunta, pista y explicación en tres imágenes.', 'carousel'],
      ]) {
        const t = (
          await c.query(
            'INSERT INTO templates(name,description,kind) VALUES($1,$2,$3) RETURNING id',
            [name, description, kind],
          )
        ).rows[0];
        await c.query('INSERT INTO template_versions(template_id) VALUES($1)', [t.id]);
      }
  });
  console.log('Propietario, catálogo y contenido de muestra preparados.');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
