// ============================================================
//  login.js — maneja el inicio de sesión del personal
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    // Si ya hay sesión activa, pasamos directo al panel
    if (localStorage.getItem(ALMACEN_TOKEN)) {
        window.location.href = "/panel.html";
        return;
    }

    const form = document.getElementById("form-login");
    const error = document.getElementById("login-error");

    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        error.classList.add("oculto");

        const usuario = form.usuario.value.trim();
        const password = form.password.value.trim();

        if (!usuario || !password) {
            error.textContent = "Escribe tu usuario y contraseña";
            error.classList.remove("oculto");
            return;
        }

        try {
            const datos = await Api.post("/auth/login", { usuario, password });
            // Guardamos el token y los datos del usuario
            localStorage.setItem(ALMACEN_TOKEN, datos.token);
            localStorage.setItem(ALMACEN_USUARIO, JSON.stringify(datos.usuario));
            window.location.href = "/panel.html";
        } catch (e) {
            error.textContent = e.message;
            error.classList.remove("oculto");
        }
    });
});
