# Capturas de demostración HU02, HU03 y HU06

Este escenario contiene tres CSV sintéticos para probar la importación de capturas, la construcción del dataset histórico, el entrenamiento y la segmentación. No son datos obtenidos directamente de WUF ni registros confirmados de adopciones.

| Captura | Fecha / semana ISO | Filas | Disponibles | No disponibles |
|---|---|---:|---:|---:|
| Inicial | 28/09/2026 · 40 | 180 | 108 | 72 |
| Seguimiento 1 | 05/10/2026 · 41 | 165 | 87 | 78 |
| Seguimiento 2 | 12/10/2026 · 42 | 190 | 86 | 104 |

## Transiciones de la cohorte inicial

De las 108 mascotas disponibles en la semana 40:

- 10 siguen `Disponible → No disponible → Sin registro`.
- 11 siguen `Disponible → No disponible → No disponible`.
- 21 siguen `Disponible → Disponible → No disponible`.
- 66 permanecen disponibles en la captura final.

Las mascotas que no estaban disponibles en la captura inicial y los 35 perfiles nuevos de la última captura no forman parte de esa cohorte HU02.

## Etiquetas y edades

Las etiquetas estandarizadas del CSV se derivan de los atributos del perfil: `Cachorro` para edades numéricas de hasta 11 meses, `Senior` desde 96 meses y `Condicion especial` cuando corresponde. Estos umbrales se usan para el escenario de demostración; no son una valoración veterinaria.

Si la edad no está indicada, el CSV deja `edad_meses` vacío y no marca la edad como estimada. Cuando existe una edad aproximada, conserva el indicador `edad_estimada`.

## Uso

Importa los tres archivos desde Recolección en orden cronológico. Utiliza una base de demostración adecuada y evita mezclar estas capturas con otros escenarios que compartan las mismas fechas.
