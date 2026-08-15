# Rúbrica de Evaluación · Fase 2 Preescolar

Plataforma web (sin login ni base de datos) para armar rúbricas de evaluación a partir del **Programa Sintético Fase 2** (SEP / NEM):

1. Elige **1 a 4 Campos** formativos  
2. Selecciona **Contenidos** de cada campo  
3. Marca uno o más **PDA** por contenido  
4. Configura textos por nivel (**L / E / P / RA**) con **3 opciones** o escribe la tuya  
5. **Genera el Excel** las veces que quieras  

## Hojas del Excel

| Orden | Hoja | Uso |
|------|------|-----|
| 1 | `Alumnos` | Solo N° y Alumno (hasta 30) |
| 2 | `Evaluacion` | Matriz con listas L/E/P/RA y colores (sin nivel global) |
| 3 | `Reporte_Individual` | Reporte diagnóstico automático |
| 4 | `Catalogo_Descripciones` | Textos por nivel (editables) |

Códigos de indicador según campo y grado: `LPDA1`, `SPDA2`, `EPDA3`, `HPDA1-2`, etc.

## Cómo correrlo

```bash
cd c:\repos\missgarabatos\rubrica-evaluacion
npm install
npm run dev
```

Abre la URL que muestre Vite (normalmente `http://localhost:5173`).

## Build de producción

```bash
npm run build
npm run preview
```

## Notas

- Los catálogos viven en `src/data/catalogoFase2.js` (sin backend).
- La generación del Excel es 100% en el navegador (`exceljs` + `file-saver`).
- Colores pensados para preescolar tanto en la web como en el archivo.
