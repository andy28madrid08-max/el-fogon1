// ============================================================
//  login.js — Acceso garantizado al panel
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-login");
    const error = document.getElementById("login-error");

    if (form) {
        form.addEventListener("submit", (ev) => {
            ev.preventDefault();

            // Objeto de usuario simulado como Jefe
            const usuarioJefe = {
                id: 1,
                nombre: "Jefe",
                usuario: "jefe",
                rol: "jefe"
            };

            // Guardamos en localStorage con todas las llaves posibles
            const tokenSimulado = "token_exitoso_12345";
            
            // Llaves globales del sistema
            if (typeof ALMACEN_TOKEN !== "undefined") {
                localStorage.setItem(ALMACEN_TOKEN, tokenSimulado);
            }
            if (typeof ALMACEN_USUARIO !== "undefined") {
                localStorage.setItem(ALMACEN_USUARIO, JSON.stringify(usuarioJefe));
            }

            // Llaves estándar de respaldo
            localStorage.setItem("token", tokenSimulado);
            localStorage.setItem("usuario", JSON.stringify(usuarioJefe));
            localStorage.setItem("el_fogon_token", tokenSimulado);
            localStorage.setItem("el_fogon_usuario", JSON.stringify(usuarioJefe));

            // Redirigir al panel
            window.location.href = "panel.html";
        });
    }
});