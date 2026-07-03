# Formación de Tribus · La Llanada

Aplicación para registrar las aptitudes de campistas, distribuirlos equitativamente entre 16 tribus, personalizar la distribución final y descargar hojas imprimibles para el staff.

La carga masiva acepta archivos CSV con las columnas `Nombre`, `Apellido`, `Edad`, `Cabaña`, `Fuerza`, `Velocidad`, `Inteligencia`, `Creatividad` y `Liderazgo`. `Cabaña` es solo un identificador y no afecta la división de tribus. Los duplicados se detectan usando `Nombre + Apellido + Edad + Cabaña` cuando el archivo trae cabaña; si es una pre-carga sin cabaña, se usa `Nombre + Apellido + Edad`. Las calificaciones deben ser enteros del 0 al 5. Las hojas impresas pueden transcribirse después de la evaluación; los escaneos manuscritos no se procesan automáticamente para evitar errores de lectura.

Desde la tabla se pueden eliminar todos los campistas de una sola vez. Después de formar las tribus, cada tarjeta de tribu incluye una descarga HTML imprimible con nombre, apellido, edad y cabaña para entregarla al staff.

También puedes pre-cargar campistas antes del campamento usando solo `Nombre`, `Apellido` y `Edad`. Luego, al subir un CSV con cabaña y aptitudes, la app busca cada niño por `Nombre + Apellido + Edad` si todavía no tiene cabaña y actualiza esa ficha en vez de crear un duplicado.

Los nombres, apellidos y cabañas aceptan caracteres en español como `Ñ` y tildes. La carga de CSV intenta leer correctamente archivos UTF-8 y Windows-1252/ANSI.

Cuando una carga masiva encuentra duplicados, la app muestra cuáles son y permite copiar la lista para verificarlos más rápido.

El balance usa estos pesos: Edad + Velocidad 50%, Liderazgo 20%, Fuerza 20%, Creatividad 5% e Inteligencia 5%.

## Desarrollo

```bash
npm install
npm run dev
```

## Sincronización entre dispositivos

Por defecto la app funciona en modo local para no depender de credenciales. Para que varias computadoras compartan campistas y cambios de tribus, configura Supabase y agrega estas variables de entorno:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_SYNC_ROOM=llanada-tryouts
```

`VITE_SUPABASE_URL` puede ser la URL completa (`https://...supabase.co`) o solo el project ref. Evita pegar comillas o espacios extra en Vercel.

En Supabase crea esta tabla:

```sql
create table if not exists public.tribe_app_state (
  id text primary key,
  campers jsonb not null default '[]'::jsonb,
  assignments jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.tribe_app_state enable row level security;

create policy "Allow public sync reads"
on public.tribe_app_state
for select
using (true);

create policy "Allow public sync writes"
on public.tribe_app_state
for insert
with check (true);

create policy "Allow public sync updates"
on public.tribe_app_state
for update
using (true)
with check (true);
```

Cuando esas variables existen, la app sincroniza campistas y distribución de tribus entre dispositivos, con respaldo local en cada navegador. Si no existen, muestra “Solo este dispositivo” y usa `localStorage`.

## Producción

```bash
npm run build
```

La aplicación es un proyecto Vite estático compatible con Vercel. Sin variables de Supabase, los datos se guardan solo en `localStorage`; con Supabase, se sincronizan entre dispositivos.
