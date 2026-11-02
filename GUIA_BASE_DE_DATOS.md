# Guía de la base de datos

## Propósito y versión

WUF Predict usa PostgreSQL 16 para conservar usuarios, perfiles, capturas del catálogo, datasets, modelos, predicciones, alertas y reportes. El esquema vigente de instalación es backend/schema_wuf_predict_db_final.sql. Está pensado para ejecutarse una vez sobre una base vacía; no crea ni elimina la base de datos.

El script define 20 tablas. Las dos columnas de enlace del reporte de priorización se agregan mediante una instrucción ALTER TABLE dentro del mismo script, después de crear las tablas relacionadas. Es parte del esquema final, no una migración que deba ejecutarse aparte.

PK significa clave primaria; FK, referencia a otra tabla. NOT NULL significa obligatorio; NULL indica que el campo puede faltar. Los tipos y restricciones exactos están en el SQL final. Los artefactos de modelos se guardan como archivos locales; la base conserva su ruta y su hash SHA-256.

## Mapa de relaciones

- **Cuentas y perfiles:** usuario se relaciona con ejecucion_recoleccion, reporte_priorizacion, alerta_atencion y las versiones entrenadas. mascota mantiene los datos actuales; sus observaciones históricas están en snapshot_catalogo.
- **Capturas:** una ejecucion_recoleccion contiene muchos snapshots. snapshot_etiqueta_condicion guarda las etiquetas observadas en cada fotografía.
- **HU02:** dataset_historico se enlaza con capturas mediante dataset_ejecucion y con snapshots mediante dataset_snapshot. dataset_detalle guarda la etiqueta derivada por mascota.
- **OE1:** modelo_predictivo pertenece a un dataset y tiene muchas filas de prediccion.
- **OE2/HU04-HU07:** modelo_consistencia produce evaluacion_consistencia; una evaluación puede originar o actualizar alertas_desactualizacion, y cada alerta tiene acciones en alerta_atencion.
- **OE3:** modelo_segmentacion produce asignacion_segmento para snapshots; reporte_segmento_detalle conserva qué asignaciones se incluyeron en cada reporte.
- **Exportaciones:** reporte_priorizacion guarda usuario, formato, captura y modelo K-Means asociado. Las predicciones y asignaciones detalladas permiten identificar los datos exportados.

Un dataset puede usar varias capturas y una captura puede aportar evidencia a más de un dataset. Un reporte puede incluir resultados de OE1 y OE3, que se guardan como resultados diferenciados.

## Diccionario de datos

### 1. usuario

Cuenta usada para iniciar sesión y asociar acciones a una persona.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_usuario | SERIAL, PK | Identificador de la cuenta. |
| nombre | VARCHAR(100), obligatorio | Nombre mostrado en la aplicación. |
| rol | VARCHAR(20), obligatorio | Rol: analista, marketing o ayuda. |
| email | VARCHAR(100), obligatorio, único | Correo de acceso. |
| password_hash | VARCHAR(255), obligatorio | Hash de contraseña; no se conserva la contraseña legible. |

### 2. mascota

Datos actuales del perfil. Los datos históricos están en snapshot_catalogo.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_mascota | SERIAL, PK | Identificador interno. |
| sku | VARCHAR(10), obligatorio, único | Código estable del perfil entre capturas. |
| nombre | VARCHAR(80), obligatorio | Nombre de la mascota. |
| especie | VARCHAR(10), obligatorio | Especie del perfil. |
| raza | VARCHAR(30), obligatorio | Raza o categoría racial. |
| sexo | CHAR(1), obligatorio | Código de sexo recibido desde el catálogo. |
| edad_meses | INTEGER, NULL | Edad en meses, si se conoce o estima. |
| edad_estimada | BOOLEAN, obligatorio | Indica si la edad es estimada. |
| tipo_pelaje | VARCHAR(15), obligatorio | Categoría de pelaje. |
| tamano | VARCHAR(10), obligatorio | Categoría de tamaño. |
| tamano_estimado | BOOLEAN, obligatorio | Indica si el tamaño es estimado. |
| nivel_energia | VARCHAR(10), obligatorio | Categoría de energía. |
| condicion_especial | BOOLEAN, obligatorio | Indica si presenta condición especial. |
| condicion_detalle | VARCHAR(200), NULL | Descripción breve de esa condición. |
| descripcion | VARCHAR(512), NULL | Texto de presentación. |
| orden_publicacion | INTEGER, obligatorio | Orden actual en el catálogo. |
| estado_publicado | VARCHAR(20), obligatorio | Estado actual publicado. |
| fecha_publicacion | DATE, obligatorio | Fecha en que se publicó el perfil. |
| url_perfil | VARCHAR(255), obligatorio | Dirección del perfil de referencia. |

### 3. etiqueta_condicion

Etiquetas estructuradas asociadas al perfil actual.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_etiqueta | SERIAL, PK | Identificador de la etiqueta. |
| id_mascota | INTEGER, FK mascota, obligatorio | Mascota a la que corresponde. |
| etiqueta | VARCHAR(30), obligatorio | Nombre de la etiqueta. |

La combinación de mascota y etiqueta es única.

### 4. dataset_historico

Versión del conjunto etiquetado generado desde capturas seleccionadas.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_dataset | SERIAL, PK | Identificador interno del dataset. |
| fecha_generacion | TIMESTAMP, obligatorio | Momento de generación; predeterminado al insertar. |
| nro_registros | INTEGER, obligatorio | Cantidad de filas; predeterminado 0. |
| version | VARCHAR(20), obligatorio | Versión visible del dataset. |
| origen_etiquetas | VARCHAR(24), obligatorio | Procedencia de las etiquetas: catálogo, sintética, verificada, mixta o desconocida. |
| fecha_desde | DATE, obligatorio | Inicio del periodo observado. |
| fecha_hasta | DATE, obligatorio | Fin del periodo observado. |
| version_regla_etiquetado | VARCHAR(30), obligatorio | Regla usada para derivar las etiquetas. |
| hash_sha256 | CHAR(64), NULL | Huella para comprobar integridad del CSV exportado. |

### 5. ejecucion_recoleccion

Registro de una importación CSV y de sus conteos.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_ejecucion | SERIAL, PK | Identificador de la importación. |
| id_usuario | INTEGER, FK usuario, NULL | Usuario que importó el archivo, si se registró. |
| tipo_ejecucion | VARCHAR(15), obligatorio | Modalidad; el flujo vigente es manual. |
| fuente_datos | VARCHAR(24), obligatorio | Fuente de datos; el flujo de entrega usa CSV simulado. |
| referencia_fuente | VARCHAR(255), NULL | Nombre o referencia del archivo. |
| fecha_captura | DATE, obligatorio | Fecha del catálogo representado por el CSV. |
| semana | SMALLINT, obligatorio | Semana ISO derivada de la fecha de captura. |
| fecha_inicio | TIMESTAMP, obligatorio | Inicio real de la importación. |
| fecha_fin | TIMESTAMP, NULL | Fin de la importación, si terminó. |
| perfiles_total | INTEGER, obligatorio | Filas leídas; predeterminado 0. |
| perfiles_disponibles | INTEGER, obligatorio | Conteo disponible; predeterminado 0. |
| perfiles_no_disponibles | INTEGER, obligatorio | Conteo no disponible; predeterminado 0. |
| perfiles_sin_publicar | INTEGER, obligatorio | Conteo sin publicar; predeterminado 0. |
| estado | VARCHAR(15), obligatorio | Resultado: en proceso, completada, parcial o fallida. |
| mensaje_error | VARCHAR(1000), NULL | Detalle de error, cuando existe. |

### 6. snapshot_catalogo

Fotografía de los datos y el estado de cada perfil observado en una importación. No guarda etiquetas de adopción: HU02 las deriva y almacena en dataset_detalle.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_snapshot | SERIAL, PK | Identificador de la fotografía. |
| id_mascota | INTEGER, FK mascota, obligatorio | Perfil observado. |
| id_ejecucion | INTEGER, FK ejecucion_recoleccion, obligatorio | Importación de origen. |
| semana | SMALLINT, obligatorio | Semana ISO de la captura. |
| fecha_captura | TIMESTAMP, obligatorio | Fecha y hora asociadas a la fotografía. |
| sku | VARCHAR(10), obligatorio | SKU observado. |
| nombre | VARCHAR(80), obligatorio | Nombre observado. |
| especie | VARCHAR(10), obligatorio | Especie observada. |
| raza | VARCHAR(30), obligatorio | Raza observada. |
| sexo | CHAR(1), obligatorio | Sexo observado. |
| edad_meses | INTEGER, NULL | Edad observada, en meses. |
| edad_estimada | BOOLEAN, obligatorio | Si la edad observada era estimada. |
| tipo_pelaje | VARCHAR(15), obligatorio | Pelaje observado. |
| tamano | VARCHAR(10), obligatorio | Tamaño observado. |
| tamano_estimado | BOOLEAN, obligatorio | Si el tamaño era estimado. |
| nivel_energia | VARCHAR(10), obligatorio | Energía observada. |
| condicion_especial | BOOLEAN, obligatorio | Si se observó condición especial. |
| condicion_detalle | VARCHAR(200), NULL | Detalle observado de la condición. |
| descripcion | VARCHAR(512), NULL | Descripción observada. |
| orden_publicacion | INTEGER, obligatorio | Orden del perfil en esa captura. |
| estado_detectado | VARCHAR(20), obligatorio | Estado observado: disponible, no disponible o sin publicar. |
| fecha_publicacion | DATE, obligatorio | Fecha de publicación del perfil. |
| url_perfil | VARCHAR(255), obligatorio | URL observada. |

### 7. snapshot_etiqueta_condicion

Etiquetas estructuradas de una mascota tal como aparecían en una fotografía histórica.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_snapshot | INTEGER, FK snapshot_catalogo, PK | Fotografía asociada. |
| etiqueta | VARCHAR(30), PK | Etiqueta observada. |

La clave primaria combina ambos campos.

### 8. dataset_snapshot

Enlace entre un dataset y las fotografías históricas que lo sustentan.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_dataset | INTEGER, FK dataset_historico, PK | Dataset que usa la fotografía. |
| id_snapshot | INTEGER, FK snapshot_catalogo, PK | Fotografía incluida como evidencia. |

Clave primaria compuesta; al borrar el dataset se borran sus enlaces.

### 9. dataset_ejecucion

Enlace entre un dataset y las capturas de recolección incluidas.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_dataset | INTEGER, FK dataset_historico, PK | Dataset relacionado. |
| id_ejecucion | INTEGER, FK ejecucion_recoleccion, PK | Captura considerada. |

Clave primaria compuesta; al borrar el dataset se borran sus enlaces.

### 10. dataset_detalle

Una fila por mascota de la cohorte, su etiqueta final y las capturas de respaldo.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_dataset_detalle | SERIAL, PK | Identificador de la fila. |
| id_dataset | INTEGER, FK dataset_historico, obligatorio | Dataset al que pertenece. |
| id_mascota | INTEGER, FK mascota, obligatorio | Mascota de la cohorte. |
| id_snapshot_referencia | INTEGER, FK snapshot_catalogo, obligatorio | Captura inicial usada para atributos. |
| id_ejecucion_resultado | INTEGER, FK ejecucion_recoleccion, NULL | Captura que aporta el resultado, si existe. |
| id_snapshot_resultado | INTEGER, FK snapshot_catalogo, NULL | Fotografía final asociada, si existe. |
| etiqueta_catalogo | VARCHAR(24), obligatorio | permanece, salio_catalogo o indeterminada. |
| interpretacion_rf03 | VARCHAR(20), obligatorio | Procedencia interpretativa; predeterminado proxy. |
| motivo_indeterminado | VARCHAR(255), NULL | Razón de la etiqueta indeterminada. |

Cada mascota aparece una vez por dataset. salio_catalogo representa una salida del catálogo, no una adopción confirmada.

### 11. modelo_predictivo

Versión de Random Forest para OE1, sus métricas y estado de publicación.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_modelo | SERIAL, PK | Identificador de versión. |
| id_dataset | INTEGER, FK dataset_historico, obligatorio | Dataset de entrenamiento. |
| algoritmo | VARCHAR(30), obligatorio | Algoritmo utilizado. |
| version | VARCHAR(10), obligatorio | Versión visible del modelo. |
| accuracy_score | DECIMAL(5,4), obligatorio | Proporción total de aciertos en prueba. |
| precision_score | DECIMAL(5,4), obligatorio | Precisión para la clase positiva salio_catalogo. |
| recall_score | DECIMAL(5,4), obligatorio | Proporción de salidas reales detectadas. |
| f1_score | DECIMAL(5,4), obligatorio | Equilibrio entre precision y recall. |
| fecha_entrenamiento | TIMESTAMP, obligatorio | Momento del entrenamiento. |
| estado | VARCHAR(20), obligatorio | Estado de publicación; predeterminado no_publicable. |
| metadatos_entrenamiento | JSONB, obligatorio | Parámetros y versiones de librerías; predeterminado objeto vacío. |
| clase_positiva | VARCHAR(30), obligatorio | Clase positiva; predeterminado salio_catalogo. |
| nro_registros_entrenamiento | INTEGER, obligatorio | Filas usadas para ajustar el modelo; predeterminado 0. |
| nro_registros_prueba | INTEGER, obligatorio | Filas reservadas para evaluar; predeterminado 0. |
| nro_registros_excluidos | INTEGER, obligatorio | Filas indeterminadas excluidas; predeterminado 0. |
| umbral_accuracy | DECIMAL(5,4), obligatorio | Accuracy mínimo de publicación; predeterminado 0.75. |
| matriz_confusion | JSONB, obligatorio | Aciertos y errores por clase; predeterminado arreglo vacío. |
| importancia_variables | JSONB, obligatorio | Contribución global calculada por el bosque; predeterminado arreglo vacío. |
| artefacto_ruta | VARCHAR(255), NULL | Ruta local del modelo serializado. |
| artefacto_sha256 | VARCHAR(64), NULL | Huella del artefacto. |
| es_vigente | BOOLEAN, obligatorio | Indica la versión activa; predeterminado false. |

### 12. reporte_priorizacion

Metadatos de cada exportación PDF/Excel y referencias a captura y segmentación.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_reporte | SERIAL, PK | Identificador del reporte. |
| id_usuario | INTEGER, FK usuario, obligatorio | Usuario que exportó el reporte. |
| nombre_usuario_generador | VARCHAR(100), obligatorio | Nombre conservado como referencia al exportar. |
| semana | INTEGER, obligatorio | Semana de la captura reportada. |
| fecha_generacion | TIMESTAMP, obligatorio | Momento de generación. |
| formato | VARCHAR(10), obligatorio | PDF o XLSX. |
| id_ejecucion | INTEGER, FK ejecucion_recoleccion, NULL | Captura usada para el reporte. |
| id_modelo_segmentacion | INTEGER, FK modelo_segmentacion, NULL | K-Means asociado al resultado OE3. |

### 13. prediccion

Resultado individual de Random Forest para una mascota.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_prediccion | SERIAL, PK | Identificador de la predicción. |
| id_modelo | INTEGER, FK modelo_predictivo, obligatorio | Modelo que la produjo. |
| id_mascota | INTEGER, FK mascota, obligatorio | Perfil evaluado. |
| id_ejecucion | INTEGER, FK ejecucion_recoleccion, NULL | Captura donde se observó. |
| id_reporte | INTEGER, FK reporte_priorizacion, NULL | Reporte relacionado, si corresponde. |
| probabilidad_adopcion | DECIMAL(5,4), obligatorio | Valor entre 0 y 1 que la interfaz muestra como probabilidad estimada de adopción, derivado de la clase proxy salio_catalogo. |
| nivel_prioridad | VARCHAR(10), obligatorio | Nivel de difusión asignado por los umbrales. |
| fecha | TIMESTAMP, obligatorio | Momento en que se guardó. |

### 14. modelo_consistencia

Versión del Árbol de Decisión que aproxima las prioridades de revisión de HU04.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_modelo_consistencia | SERIAL, PK | Identificador del árbol. |
| version | VARCHAR(10), obligatorio, único | Versión visible. |
| algoritmo | VARCHAR(40), obligatorio | Clasificador; predeterminado DecisionTreeClassifier. |
| fuente_etiquetas | VARCHAR(40), obligatorio | Regla que genera las prioridades de referencia. |
| id_ejecucion_referencia | INTEGER, FK ejecucion_recoleccion, obligatorio | Captura usada. |
| id_usuario | INTEGER, FK usuario, NULL | Usuario que entrenó el árbol, si se registró. |
| fecha_entrenamiento | TIMESTAMP, obligatorio | Fecha del entrenamiento; predeterminado actual. |
| accuracy_score | DECIMAL(5,4), obligatorio | Coincidencia con las etiquetas de referencia en prueba. |
| f1_macro_score | DECIMAL(5,4), obligatorio | F1 promedio entre prioridades, sin ponderar por frecuencia. |
| nro_registros_entrenamiento | INTEGER, obligatorio | Observaciones usadas para entrenar. |
| nro_registros_prueba | INTEGER, obligatorio | Observaciones reservadas para probar. |
| matriz_confusion | JSONB, obligatorio | Comparación entre prioridad de referencia y predicha. |
| importancia_variables | JSONB, obligatorio | Contribución de las variables a las divisiones. |
| reglas_arbol | TEXT, obligatorio | Reglas legibles aprendidas por el árbol. |
| metadatos_entrenamiento | JSONB, obligatorio | Profundidad, proporción de prueba, semilla y otros parámetros. |
| artefacto_ruta | VARCHAR(255), obligatorio | Ruta del árbol serializado. |
| artefacto_sha256 | CHAR(64), obligatorio | Huella del archivo. |
| es_vigente | BOOLEAN, obligatorio | Indica el árbol activo; predeterminado false. |

### 15. evaluacion_consistencia

Resultado de evaluar un perfil en una captura con el árbol y la regla de referencia.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_evaluacion | SERIAL, PK | Identificador de evaluación. |
| id_modelo_consistencia | INTEGER, FK modelo_consistencia, obligatorio | Árbol evaluado. |
| id_mascota | INTEGER, FK mascota, obligatorio | Perfil evaluado. |
| id_snapshot | INTEGER, FK snapshot_catalogo, obligatorio | Fotografía evaluada. |
| id_ejecucion | INTEGER, FK ejecucion_recoleccion, obligatorio | Captura relacionada. |
| fecha_evaluacion | DATE, obligatorio | Fecha de evaluación. |
| nivel_riesgo | VARCHAR(10), obligatorio | Prioridad: bajo, medio o alto. |
| fuente_etiqueta | VARCHAR(40), obligatorio | Regla de referencia aplicada. |
| justificacion | VARCHAR(500), obligatorio | Explicación breve del nivel. |
| indicadores | JSONB, obligatorio | Variables y resultados auxiliares. |

### 16. alerta_desactualizacion

Episodio de alerta para un perfil que necesita revisión por riesgo alto.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_alerta | SERIAL, PK | Identificador del episodio. |
| id_mascota | INTEGER, FK mascota, obligatorio | Perfil relacionado. |
| id_evaluacion_origen | INTEGER, FK evaluacion_consistencia, obligatorio | Evaluación que abrió la alerta. |
| id_evaluacion_ultima | INTEGER, FK evaluacion_consistencia, obligatorio | Evaluación más reciente asociada. |
| fecha | TIMESTAMP, obligatorio | Momento de creación. |
| fecha_ultima_deteccion | TIMESTAMP, obligatorio | Última detección registrada del episodio. |
| nivel_riesgo | VARCHAR(10), obligatorio | Riesgo guardado en la alerta. |
| mensaje | VARCHAR(255), obligatorio | Resumen presentado al usuario. |
| estado | VARCHAR(15), obligatorio | pendiente, en_revision o resuelta; predeterminado pendiente. |

### 17. alerta_atencion

Historial de acciones humanas sobre una alerta.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_atencion | SERIAL, PK | Identificador de la acción. |
| id_alerta | INTEGER, FK alerta_desactualizacion, obligatorio | Alerta atendida. |
| id_usuario | INTEGER, FK usuario, obligatorio | Cuenta que realizó la acción. |
| nombre_usuario_actor | VARCHAR(100), obligatorio | Nombre conservado en el historial. |
| estado_anterior | VARCHAR(15), obligatorio | Estado antes de la acción. |
| estado_nuevo | VARCHAR(15), obligatorio | Estado después de la acción. |
| fecha | TIMESTAMP, obligatorio | Momento de la acción. |
| nota | VARCHAR(500), obligatorio | Comentario de seguimiento. |

### 18. modelo_segmentacion

Versión de K-Means aplicada a una captura para OE3.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_modelo_segmentacion | SERIAL, PK | Identificador de la segmentación. |
| version | VARCHAR(10), obligatorio, único | Versión visible. |
| algoritmo | VARCHAR(20), obligatorio | Algoritmo; predeterminado KMeans. |
| id_ejecucion_referencia | INTEGER, FK ejecucion_recoleccion, obligatorio | Captura cuyos perfiles disponibles se agruparon. |
| id_usuario | INTEGER, FK usuario, obligatorio | Persona que entrenó. |
| cantidad_clusters | SMALLINT, obligatorio | Número K de grupos solicitado. |
| cantidad_perfiles | INTEGER, obligatorio | Cantidad de perfiles agrupados. |
| silhouette_score | DECIMAL(6,5), obligatorio | Cohesión y separación de grupos; no es Accuracy. |
| inertia | DECIMAL(18,5), obligatorio | Suma de distancias cuadradas a los centroides. |
| variables | JSONB, obligatorio | Variables y transformaciones usadas. |
| resumen_clusters | JSONB, obligatorio | Tamaños y características resumidas de cada grupo. |
| parametros | JSONB, obligatorio | Parámetros, semilla y opciones del algoritmo. |
| artefacto_ruta | VARCHAR(500), obligatorio | Ruta del modelo serializado. |
| artefacto_sha256 | CHAR(64), obligatorio | Huella para verificar el archivo. |
| estado | VARCHAR(15), obligatorio | Estado de la versión; predeterminado candidato. |
| es_vigente | BOOLEAN, obligatorio | Indica la segmentación activa; predeterminado false. |
| fecha_entrenamiento | TIMESTAMP, obligatorio | Momento del entrenamiento. |

### 19. asignacion_segmento

Asocia una fotografía de mascota con el grupo asignado por una versión de K-Means.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_asignacion_segmento | BIGSERIAL, PK | Identificador de la asignación. |
| id_modelo_segmentacion | INTEGER, FK modelo_segmentacion, obligatorio | Versión que asignó el grupo. |
| id_snapshot | INTEGER, FK snapshot_catalogo, obligatorio | Perfil observado que se agrupó. |
| numero_segmento | SMALLINT, obligatorio | Número del segmento asignado. |
| criterios_desfavorecidos | JSONB, obligatorio | Criterios que cumple el perfil, evaluados aparte del agrupamiento. |
| fecha_asignacion | TIMESTAMP, obligatorio | Momento en que se guardó. |

### 20. reporte_segmento_detalle

Enlace que conserva qué asignaciones se incluyeron en un reporte.

| Campo | Tipo / clave | Significado |
| --- | --- | --- |
| id_reporte | INTEGER, FK reporte_priorizacion, PK | Reporte exportado. |
| id_asignacion_segmento | BIGINT, FK asignacion_segmento, PK | Asignación de perfil incluida. |

La clave primaria combina ambos campos; al eliminar el reporte se eliminan sus filas de detalle.

## Relaciones principales

- usuario 1:N ejecucion_recoleccion, modelo_consistencia, modelo_segmentacion, alerta_atencion y reporte_priorizacion.
- mascota 1:N snapshot_catalogo, etiqueta_condicion, dataset_detalle, prediccion y evaluacion_consistencia.
- ejecucion_recoleccion 1:N snapshot_catalogo; también se referencia desde datasets, evaluaciones, modelos de consistencia, segmentaciones y reportes.
- snapshot_catalogo 1:N snapshot_etiqueta_condicion y puede participar en varios datasets y asignaciones de segmento.
- dataset_historico N:M ejecucion_recoleccion mediante dataset_ejecucion; dataset_historico N:M snapshot_catalogo mediante dataset_snapshot; dataset_historico 1:N dataset_detalle y modelo_predictivo.
- modelo_predictivo 1:N prediccion; modelo_consistencia 1:N evaluacion_consistencia; evaluacion_consistencia puede originar o actualizar alertas_desactualizacion; alerta_desactualizacion 1:N alerta_atencion.
- modelo_segmentacion 1:N asignacion_segmento; reporte_priorizacion N:M asignacion_segmento mediante reporte_segmento_detalle.

## Restricciones y notas

- SKU identifica a una mascota entre capturas; una ejecución no puede guardar dos snapshots del mismo perfil.
- La fecha de captura determina la semana ISO y es distinta del momento real de importación.
- Las versiones vigentes de Random Forest, Árbol de Decisión y K-Means se mantienen separadas.
- La salida del catálogo se usa como proxy para OE1; las métricas no confirman adopciones reales.
- Silhouette mide qué tan bien separados y cohesionados están los grupos de K-Means; no es una métrica de clasificación.
- Los criterios de perfil desfavorecido se guardan junto a la asignación, pero K-Means agrupa mediante sus variables configuradas.
- backend/schema_wuf_predict_db_final.sql es la referencia de instalación. Los CSV de demostración se encuentran en data/capturas. Para los pasos locales, consultar GUIA_INICIO_LOCAL.md.
