// ============================================================
//  panel.js — panel del personal (reservas) y del jefe (CRUD)
//  El jefe ve y edita TODO. El mesero y la recepcionista solo
//  ven las reservas.
// ============================================================

let USUARIO = null;
let CATEGORIAS = [];

// ---- Protección: si no hay sesión, regresamos al login ----
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem(ALMACEN_TOKEN);
    if (!token) { window.location.href = "/login.html"; return; }

    try {
        USUARIO = await Api.get("/auth/me");   // valida el token con el backend
    } catch (e) {
        localStorage.clear();
        window.location.href = "/login.html";
        return;
    }

    document.getElementById("panel-bienvenida").textContent =
        `Hola, ${USUARIO.nombre} (${USUARIO.rol})`;

    // Si NO es jefe, escondemos las pestañas de administración
    if (USUARIO.rol !== "jefe") {
        document.querySelectorAll(".solo-jefe").forEach((el) => el.remove());
    }

    configurarTabs();
    document.getElementById("btn-salir").onclick = () => {
        localStorage.clear();
        window.location.href = "/login.html";
    };

    cargarReservas();
    if (USUARIO.rol === "jefe") {
        cargarCategoriasEnFormulario();
        cargarPlatos();
        cargarPromos();
        cargarUsuarios();
        configurarFormPlato();
        configurarFormPromo();
    }
});

function lps(v) { return "L " + Number(v).toLocaleString("es-HN"); }

// ---------- Pestañas ----------
function configurarTabs() {
    const tabs = document.getElementById("panel-tabs");
    tabs.addEventListener("click", (ev) => {
        if (!ev.target.classList.contains("tab")) return;
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("tab-activo"));
        ev.target.classList.add("tab-activo");
        const destino = ev.target.dataset.tab;
        document.querySelectorAll(".panel-seccion").forEach((s) => s.classList.add("oculto"));
        document.getElementById("sec-" + destino).classList.remove("oculto");
    });
}

// ---------- RESERVAS ----------
async function cargarReservas() {
    const cont = document.getElementById("tabla-reservas");
    try {
        const reservas = await Api.get("/reservas");
        if (reservas.length === 0) { cont.innerHTML = "<p>No hay reservas todavía.</p>"; return; }
        const puedeBorrar = USUARIO.rol === "jefe" || USUARIO.rol === "recepcionista";
        cont.innerHTML = tabla(
            ["Nombre", "Teléfono", "Personas", "Fecha", "Hora", "Notas", ""],
            reservas.map((r) => `
                <tr data-testid="reserva-fila-${r.id}">
                    <td>${r.nombre}</td><td>${r.telefono}</td><td>${r.personas}</td>
                    <td>${r.fecha}</td><td>${r.hora}</td><td>${r.notas || "—"}</td>
                    <td>${puedeBorrar ? `<button class="btn-mini-borrar" onclick="borrarReserva(${r.id})" data-testid="borrar-reserva-${r.id}">Borrar</button>` : ""}</td>
                </tr>`).join("")
        );
    } catch (e) {
        cont.innerHTML = `<p class="aviso-error">${e.message}</p>`;
    }
}

async function borrarReserva(id) {
    if (!confirm("¿Borrar esta reserva?")) return;
    try { await Api.del("/reservas/" + id); mostrarToast("Reserva eliminada", "ok"); cargarReservas(); }
    catch (e) { mostrarToast(e.message, "error"); }
}

// ---------- PLATOS (CRUD, solo jefe) ----------
async function cargarCategoriasEnFormulario() {
    CATEGORIAS = await Api.get("/categorias");
    const select = document.querySelector("#form-plato select[name=categoria_id]");
    select.innerHTML = CATEGORIAS.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
}

async function cargarPlatos() {
    const cont = document.getElementById("tabla-platos");
    const platos = await Api.get("/platos");
    cont.innerHTML = tabla(
        ["Nombre", "Categoría", "Precio", "Destacado", ""],
        platos.map((p) => `
            <tr data-testid="plato-fila-${p.id}">
                <td>${p.nombre}</td><td>${p.categoria_nombre}</td><td>${lps(p.precio)}</td>
                <td>${p.destacado ? "⭐" : "—"}</td>
                <td>
                    <button class="btn-mini" onclick='editarPlato(${JSON.stringify(p)})' data-testid="editar-plato-${p.id}">Editar</button>
                    <button class="btn-mini-borrar" onclick="borrarPlato(${p.id})" data-testid="borrar-plato-${p.id}">Borrar</button>
                </td>
            </tr>`).join("")
    );
}

function configurarFormPlato() {
    const form = document.getElementById("form-plato");
    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const cuerpo = {
            nombre: form.nombre.value.trim(),
            precio: parseFloat(form.precio.value),
            categoria_id: parseInt(form.categoria_id.value, 10),
            imagen: form.imagen.value.trim(),
            descripcion: form.descripcion.value.trim(),
            destacado: form.destacado.checked ? 1 : 0,
        };
        try {
            if (form.id.value) { await Api.put("/platos/" + form.id.value, cuerpo); mostrarToast("Plato actualizado", "ok"); }
            else { await Api.post("/platos", cuerpo); mostrarToast("Plato creado", "ok"); }
            form.reset(); form.id.value = "";
            cargarPlatos();
        } catch (e) { mostrarToast(e.message, "error"); }
    });
    document.getElementById("btn-cancelar-plato").onclick = () => { form.reset(); form.id.value = ""; };
}

function editarPlato(p) {
    const form = document.getElementById("form-plato");
    form.id.value = p.id;
    form.nombre.value = p.nombre;
    form.precio.value = p.precio;
    form.categoria_id.value = p.categoria_id;
    form.imagen.value = p.imagen || "";
    form.descripcion.value = p.descripcion || "";
    form.destacado.checked = !!p.destacado;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function borrarPlato(id) {
    if (!confirm("¿Borrar este plato?")) return;
    try { await Api.del("/platos/" + id); mostrarToast("Plato eliminado", "ok"); cargarPlatos(); }
    catch (e) { mostrarToast(e.message, "error"); }
}

// ---------- PROMOCIONES (CRUD, solo jefe) ----------
async function cargarPromos() {
    const cont = document.getElementById("tabla-promos");
    const promos = await Api.get("/promociones");
    cont.innerHTML = tabla(
        ["Nombre", "Precio", "Antes", "Activa", ""],
        promos.map((pr) => `
            <tr data-testid="promo-fila-${pr.id}">
                <td>${pr.nombre}</td><td>${lps(pr.precio)}</td>
                <td>${pr.precio_antes ? lps(pr.precio_antes) : "—"}</td>
                <td>${pr.activa ? "Sí" : "No"}</td>
                <td>
                    <button class="btn-mini" onclick='editarPromo(${JSON.stringify(pr)})' data-testid="editar-promo-${pr.id}">Editar</button>
                    <button class="btn-mini-borrar" onclick="borrarPromo(${pr.id})" data-testid="borrar-promo-${pr.id}">Borrar</button>
                </td>
            </tr>`).join("")
    );
}

function configurarFormPromo() {
    const form = document.getElementById("form-promo");
    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const cuerpo = {
            nombre: form.nombre.value.trim(),
            precio: parseFloat(form.precio.value),
            precio_antes: form.precio_antes.value ? parseFloat(form.precio_antes.value) : null,
            descripcion: form.descripcion.value.trim(),
            activa: form.activa.checked ? 1 : 0,
        };
        try {
            if (form.id.value) { await Api.put("/promociones/" + form.id.value, cuerpo); mostrarToast("Promo actualizada", "ok"); }
            else { await Api.post("/promociones", cuerpo); mostrarToast("Promo creada", "ok"); }
            form.reset(); form.id.value = "";
            cargarPromos();
        } catch (e) { mostrarToast(e.message, "error"); }
    });
    document.getElementById("btn-cancelar-promo").onclick = () => { form.reset(); form.id.value = ""; };
}

function editarPromo(pr) {
    const form = document.getElementById("form-promo");
    form.id.value = pr.id;
    form.nombre.value = pr.nombre;
    form.precio.value = pr.precio;
    form.precio_antes.value = pr.precio_antes || "";
    form.descripcion.value = pr.descripcion || "";
    form.activa.checked = !!pr.activa;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function borrarPromo(id) {
    if (!confirm("¿Borrar esta promoción?")) return;
    try { await Api.del("/promociones/" + id); mostrarToast("Promo eliminada", "ok"); cargarPromos(); }
    catch (e) { mostrarToast(e.message, "error"); }
}

// ---------- USUARIOS (solo jefe) ----------
async function cargarUsuarios() {
    const cont = document.getElementById("tabla-usuarios");
    const usuarios = await Api.get("/usuarios");
    cont.innerHTML = tabla(
        ["ID", "Nombre", "Usuario", "Rol"],
        usuarios.map((u) => `<tr><td>${u.id}</td><td>${u.nombre}</td><td>${u.usuario}</td><td>${u.rol}</td></tr>`).join("")
    );
}

// ---------- Ayudante para construir tablas HTML ----------
function tabla(cabeceras, filasHtml) {
    return `<div class="tabla-scroll"><table class="tabla">
        <thead><tr>${cabeceras.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
        <tbody>${filasHtml}</tbody></table></div>`;
}
