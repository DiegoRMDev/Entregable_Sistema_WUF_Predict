# Contexto del sistema WUF Predict

## ¿Qué es WUF Predict?

WUF Predict es un sistema académico de apoyo a decisiones para el proceso de adopción de mascotas de WUF. WUF es una asociación peruana sin fines de lucro que apoya albergues y casos sociales, y administra un catálogo digital de perros y gatos disponibles para adopción.

El sistema combina registros históricos del catálogo con modelos de Machine Learning para ayudar a los equipos a priorizar difusión, revisar perfiles posiblemente desactualizados y entender grupos de mascotas con características similares. Es una simulación: utiliza archivos CSV preparados como capturas del catálogo y no consulta automáticamente la plataforma de WUF.

## Problemas que aborda

- La difusión puede no priorizar a las mascotas que, según el historial disponible, requieren más visibilidad.
- El catálogo puede conservar perfiles que necesitan que una persona verifique su estado.
- Las mascotas con atributos asociados a mayores dificultades de adopción pueden quedar menos visibles entre el conjunto total.

WUF Predict ofrece información para orientar esas revisiones y decisiones. No publica campañas, modifica el catálogo real ni confirma por sí solo una adopción o un error de estado.

## Relación con los objetivos estratégicos

| Objetivo | Cómo lo apoya el sistema | Alcance y lectura |
| --- | --- | --- |
| OE1 · Priorizar difusión hacia mascotas con baja probabilidad estimada de adopción; meta de negocio: +25 %. | Random Forest aprende de los datasets históricos y genera una estimación para los perfiles disponibles. El catálogo y el reporte muestran la prioridad resultante. | La etiqueta de entrenamiento es «salió del catálogo», usada como indicador indirecto. No equivale a una adopción verificada ni demuestra que la difusión aumentó un 25 %. |
| OE2 · Mejorar la exactitud del estado publicado; referencia de negocio: 98 %. | Un Árbol de Decisión estudia antigüedad y permanencia observada en capturas. El flujo asigna una prioridad de revisión y puede generar alertas para que una persona compruebe el perfil. | Las etiquetas de referencia se derivan de una regla operativa. Sin una verificación externa del estado real, las métricas no prueban una exactitud real del 98 %. |
| OE3 · Reconocer grupos de perfiles desfavorecidos para orientar la difusión. | K-Means agrupa todas las mascotas disponibles usando edad, tamaño, energía y condición especial. Luego el sistema identifica dentro de cada grupo las mascotas que cumplen los criterios de perfil desfavorecido. | Es una segmentación exploratoria, no una predicción de adopción. El dashboard muestra cobertura de asignación a segmentos; no mide un aumento real de adopciones. |

Las metas estratégicas son referencias del caso de negocio. El sistema no mide el efecto real de campañas ni cuenta con resultados de adopción confirmados suficientes para afirmar que esas metas ya se alcanzaron.

## Flujo general

1. Una persona analista importa un CSV en Recolección. Cada archivo representa una captura del catálogo en una fecha determinada.
2. El sistema registra la ejecución de importación y guarda una fotografía de los perfiles y estados observados.
3. En Dataset histórico, el analista elige un periodo de capturas completas para construir etiquetas de seguimiento. Se requiere un mínimo de tres capturas y dos semanas de seguimiento.
4. Para HU03, Random Forest excluye las filas indeterminadas, divide los datos por SKU entre entrenamiento y prueba, guarda métricas y artefacto, y permite activar una versión publicable para estimar los perfiles disponibles.
5. Para HU04, el Árbol de Decisión aprende a aproximar las prioridades de referencia de una regla de revisión. Las alertas sirven para que una persona compruebe los perfiles de riesgo alto.
6. Para OE3, K-Means agrupa todos los perfiles disponibles. El reporte identifica qué perfiles de cada grupo cumplen los criterios desfavorecidos.
7. Marketing consulta el catálogo y el reporte de priorización. Los reportes pueden descargarse en PDF o Excel.
8. El dashboard resume las capturas y la actividad. El personal de ayuda puede trabajar las alertas asignadas y registrar su atención.

### Etiquetas históricas de HU02

La cohorte se forma con mascotas disponibles en la primera captura del periodo. Si una mascota sigue disponible en todas las capturas seleccionadas, la etiqueta es «permanece». Si pasa a no disponible o deja de aparecer en una captura completa, se etiqueta como «salió del catálogo». «Sin publicar» puede dejar evidencia ambigua y dar lugar a una fila indeterminada. La salida del catálogo es un proxy para el entrenamiento, no una confirmación de adopción.

## Módulos principales

- **Recolección (HU01):** importa y valida CSV; conserva el archivo de referencia, fecha de captura, semana, conteos y resultado de la importación.
- **Dataset histórico (HU02):** compara capturas seleccionadas y exporta las etiquetas y evidencias del periodo.
- **Entrenamiento (HU03/HU04/OE3):** administra versiones de Random Forest, Árbol de Decisión y K-Means.
- **Catálogo:** muestra el estado y atributos de los perfiles, la estimación de Random Forest para perfiles disponibles y filtros de consulta.
- **Alertas (HU07):** organiza alertas de riesgo alto y su historial de atención.
- **Reporte de priorización (HU05/HU06):** presenta por separado el resultado de Random Forest y la segmentación K-Means; exporta PDF/Excel e historial de reportes.
- **Dashboard (HU08):** muestra indicadores, la captura reciente, actividad y evolución.
- **Configuración:** permite revisar el perfil y actualizar nombre o contraseña; el correo se muestra como dato no editable.

## Roles y vistas

| Vista | Analista | Marketing | Ayuda |
| --- | :---: | :---: | :---: |
| Dashboard | Sí | Sí | Sí |
| Catálogo | Sí | Sí | Sí |
| Recolección | Sí | — | — |
| Dataset histórico | Sí | — | — |
| Entrenamiento | Sí | — | — |
| Alertas | Sí | — | Sí |
| Reporte de priorización | Sí | Sí | — |
| Configuración | Sí | Sí | Sí |

El inicio de sesión identifica el rol. La interfaz presenta las vistas correspondientes y la API también aplica controles de acceso para las operaciones protegidas.

## Estructura técnica

- **Frontend:** HTML y CSS, con JavaScript organizado en módulos ES en frontend/src. Se sirve localmente como sitio estático.
- **Backend:** API REST en Python con FastAPI. Los módulos de API, servicios, dominio e infraestructura separan rutas, reglas de negocio y acceso a datos.
- **Base de datos:** PostgreSQL 16. El esquema final de instalación está en backend/schema_wuf_predict_db_final.sql.
- **Machine Learning:** scikit-learn, pandas y joblib; se usan Random Forest, DecisionTreeClassifier y K-Means.
- **Exportación:** ReportLab produce PDF y openpyxl produce Excel.
- **Archivos:** data/capturas contiene los CSV de demostración. Los artefactos entrenados se guardan localmente bajo artifacts/models y se verifican con su hash.

Para la instalación local, variables de entorno y ejecución, consultar GUIA_INICIO_LOCAL.md.

## Estructura del proyecto

La carpeta entregable separa la aplicación, los datos de demostración, los artefactos generados y las guías:

    Entregable_Sistema_WUF_Predict/
    ├── .gitignore
    ├── CONTEXTO_SISTEMA.md
    ├── GUIA_BASE_DE_DATOS.md
    ├── GUIA_INICIO_LOCAL.md
    ├── artifacts/
    │   └── models/                 Modelos serializados generados al entrenar
    ├── backend/
    │   ├── .env.example            Plantilla de configuración local
    │   ├── pyproject.toml          Dependencias y configuración Python
    │   ├── schema_wuf_predict_db_final.sql
    │   ├── scripts/
    │   │   └── create_user.py      Creación inicial de cuentas
    │   ├── tests/                  Pruebas automatizadas del backend
    │   └── app/
    │       ├── main.py             Inicio de FastAPI y registro de rutas
    │       ├── api/
    │       │   ├── dependencies.py y schemas.py
    │       │   └── v1/             Rutas HTTP: auth, collection, datasets,
    │       │                         models, consistency, segmentation,
    │       │                         reports, alerts y dashboard
    │       ├── core/                Configuración y seguridad
    │       ├── domain/              Reglas de negocio y lógica de ML
    │       ├── infrastructure/      PostgreSQL, repositorios, CSV y artefactos
    │       └── services/            Casos de uso que conectan rutas y dominio
    ├── data/
    │   └── capturas/                README y CSV de capturas de demostración
    └── frontend/
        ├── README.md
        ├── index.html               Página principal y estructura de vistas
        ├── public/
        │   └── config.js.example    Plantilla de URL del backend
        └── src/
            ├── main.js              Punto de entrada de la interfaz
            ├── api/                 Cliente HTTP
            ├── auth/                Sesión y autenticación
            ├── components/          Componentes reutilizables, como toasts
            ├── core/                Estado, navegación y utilidades de UI
            ├── pages/               Módulos de cada vista del sistema
            └── styles/               Estilos generales

Dentro de backend/app, las carpetas siguen responsabilidades: api declara los endpoints; services coordina cada operación; domain contiene las reglas y algoritmos; infrastructure implementa persistencia y acceso a archivos. En frontend/src, pages contiene dashboard, catálogo, recolección, dataset, entrenamiento, alertas y reportes; core, auth, api y components comparten funciones entre vistas.

### Archivos principales por carpeta

| Ubicación | Contenido principal | Función |
| --- | --- | --- |
| backend/app/api | dependencies.py y schemas.py; v1 contiene auth.py, collection.py, datasets.py, models.py, consistency.py, segmentation.py, reports.py, alerts.py y dashboard.py | Dependencias, esquemas de intercambio y endpoints HTTP. |
| backend/app/core | config.py y security.py | Variables de configuración, conexión y seguridad de sesión. |
| backend/app/domain | catalog.py, collection.py, dataset.py, model_training.py, consistency_training.py, disadvantaged_profiles.py y profile_clustering.py | Reglas del catálogo, preparación de datos y algoritmos de Machine Learning. |
| backend/app/infrastructure | database.py, alert_repository.py, catalog_source_factory.py, collection_repository.py, consistency_repository.py, csv_catalog_source.py, dashboard_repository.py, dataset_repository.py, identity_repository.py, model_artifact_storage.py, model_repository.py, report_exporter.py, report_repository.py y segmentation_repository.py | Persistencia PostgreSQL, repositorios, lectura CSV, artefactos y exportación. |
| backend/app/services | alert_service.py, collection_query_service.py, collection_service.py, consistency_service.py, dashboard_service.py, dataset_service.py, model_service.py, report_service.py y segmentation_service.py | Coordina casos de uso entre API, reglas de negocio y repositorios. |
| backend/scripts | create_user.py | Alta inicial de usuarios. |
| backend/tests | test_auth_profile.py, test_consistency_training.py, test_csv_catalog_source.py, test_dataset.py, test_final_schema.py, test_model_training.py, test_profile_clustering.py y test_report_exporter.py | Pruebas de autenticación/perfil, árbol, CSV, dataset, esquema, Random Forest, K-Means y exportación PDF/Excel. |
| frontend/src/pages | dashboard.js, catalog.js, collection.js, dataset.js, models.js, consistency.js, segmentation.js, alerts.js y reports.js | Lógica de cada vista funcional. |
| frontend/src/api, auth, components, core y styles | client.js, session.js, model-table.js, toasts.js, navigation.js, state.js, ui.js y main.css | Comunicación con API y elementos compartidos de la interfaz. |

artifacts/models recibe los archivos de Random Forest, Árbol de Decisión y K-Means cuando se entrenan. Son resultados locales de ejecución y están excluidos del control de versiones. También son locales y se ignoran backend/.env, los entornos virtuales y frontend/public/config.js. Para crearlos a partir de sus plantillas, seguir GUIA_INICIO_LOCAL.md. Los tres CSV de ejemplo están en data/capturas.

## Límites del prototipo

La recolección es manual mediante CSV: no hay scraping ni sincronización automática con WUF. Los resultados dependen de las capturas y etiquetas de demostración disponibles. Una prioridad o alerta orienta una revisión humana; no confirma adopciones ni errores reales. La aplicación tampoco ejecuta campañas ni mide su efecto en una población real.
