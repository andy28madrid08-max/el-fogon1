// ============================================================
//  api.js — funciones para hablar con el backend (fetch)
//  Aquí centralizamos TODAS las llamadas a la API para no
//  repetir código en las demás pantallas.
// ============================================================

// Devuelve el token guardado (si el usuario inició sesión)
function obtenerToken() {
    return localStorage.getItem(ALMACEN_TOKEN);
}

// Petición genérica a la API. Agrega el token si existe.
async function peticion(ruta, opciones = {}) {
    const cabeceras = { "Content-Type": "application/json" };
    const token = obtenerToken();
    if (token) {
        cabeceras["Authorization"] = "Bearer " + token;
    }
    const respuesta = await fetch(API + ruta, {
        ...opciones,
        headers: { ...cabeceras, ...(opciones.headers || {}) },
    });

    let datos = null;
    try { datos = await respuesta.json(); } catch (e) { datos = null; }

    if (!respuesta.ok) {
        const mensaje = (datos && datos.detail) ? datos.detail : "Ocurrió un error";
        throw new Error(mensaje);
    }
    return datos;
}

// Atajos para cada tipo de petición
const Api = {
    get: (ruta) => peticion(ruta),
    post: (ruta, cuerpo) => peticion(ruta, { method: "POST", body: JSON.stringify(cuerpo) }),
    put: (ruta, cuerpo) => peticion(ruta, { method: "PUT", body: JSON.stringify(cuerpo) }),
    del: (ruta) => peticion(ruta, { method: "DELETE" }),
};

// ---- Pequeño aviso flotante (toast) reutilizable ----
function mostrarToast(mensaje, tipo = "ok") {
    const toast = document.getElementById("toast");
    if (!toast) { alert(mensaje); return; }
    toast.textContent = mensaje;
    toast.className = "toast toast-" + tipo;
    setTimeout(() => { toast.className = "toast oculto"; }, 3200);
}
