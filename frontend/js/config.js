// ============================================================
//  CONFIGURACIÓN GENERAL DEL FRONTEND
// ============================================================
//  API: dirección base de la API del backend.
//  - En este servidor y en la mayoría de despliegues, la API vive
//    en el mismo dominio bajo "/api", por eso lo dejamos así.
//  - Si suben el backend a OTRO servidor (ej: Render), cambien esta
//    línea por la URL completa, por ejemplo:
//        const API = "https://mi-backend.onrender.com/api";
// ============================================================
const API = "/api";

// Guardamos el token y el usuario en el navegador (localStorage)
const ALMACEN_TOKEN = "elfogon_token";
const ALMACEN_USUARIO = "elfogon_usuario";
