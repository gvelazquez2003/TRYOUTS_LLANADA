# Formación de Tribus · La Llanada

Aplicación para registrar las aptitudes de campistas, distribuirlos equitativamente entre 16 tribus, personalizar la distribución final y descargar hojas imprimibles para el staff.

La carga masiva acepta archivos CSV con las columnas `Nombre`, `Edad`, `Cabaña`, `Fuerza`, `Velocidad`, `Inteligencia`, `Creatividad` y `Liderazgo`. `Cabaña` es solo un identificador y no afecta la división de tribus. Las calificaciones deben ser enteros del 1 al 5. Las hojas impresas pueden transcribirse después de la evaluación; los escaneos manuscritos no se procesan automáticamente para evitar errores de lectura.

Desde la tabla se pueden eliminar todos los campistas de una sola vez. Después de formar las tribus, cada tarjeta de tribu incluye una descarga HTML imprimible con nombre, edad y cabaña para entregarla al staff.

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
