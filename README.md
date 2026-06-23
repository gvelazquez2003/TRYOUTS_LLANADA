# Formación de Tribus · La Llanada

Aplicación para registrar las aptitudes de campistas, distribuirlos equitativamente entre 16 tribus y personalizar la distribución final.

La carga masiva acepta archivos CSV con las columnas `Nombre`, `Edad`, `Fuerza`, `Velocidad`, `Inteligencia`, `Creatividad` y `Liderazgo`. Las calificaciones deben ser enteros del 1 al 5. Las hojas impresas pueden transcribirse después de la evaluación; los escaneos manuscritos no se procesan automáticamente para evitar errores de lectura.

## Desarrollo

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
```

La aplicación es un proyecto Vite estático compatible con Vercel. Los datos se guardan en `localStorage` del navegador; esta primera versión no requiere base de datos.
