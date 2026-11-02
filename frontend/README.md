# Frontend

La interfaz usa JavaScript y CSS sin compilador ni dependencias npm. El código está organizado en src/ por responsabilidades; public/ conserva la configuración local de la API y los archivos estáticos.

## Inicio local

1. Copia public/config.js.example como public/config.js y configura la URL de la API.
2. Desde esta carpeta, inicia un servidor estático en el puerto 5500 con: python -m http.server 5500
3. Abre http://localhost:5500.

El servidor debe iniciarse desde frontend/ para que el navegador pueda cargar tanto src/ como public/. El backend permite este origen en su configuración CORS de desarrollo.

Los archivos JavaScript de src/ son módulos ES con import/export. El punto de entrada es src/main.js; conserva un puente temporal para los manejadores del HTML y las referencias compartidas.
