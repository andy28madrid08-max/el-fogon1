// ============================================================
//  main.js — lógica de la página principal (index.html)
//  Consume datos REALES desde la API: estado, platos, menú,
//  promociones y envío de reservas.
// ============================================================

// Formatea un número como lempiras (L 35)
function lps(valor) {
    return "L " + Number(valor).toLocaleString("es-HN");
}

// ---------- Estado Abierto / Cerrado ----------
async function cargarEstado() {
    try {
        const estado = await Api.get("/estado");
        const badge = document.getElementById("estado-restaurante");
        badge.textContent = (estado.abierto ? "🟢 " : "🔴 ") + estado.mensaje;
        badge.classList.add(estado.abierto ? "abierto" : "cerrado");

        document.getElementById("portada-hora").textContent =
            "Hora en Honduras: " + estado.hora_actual + " · Horario: 10:00 am – 10:00 pm";

        const chip = document.getElementById("estado-ubicacion");
        if (chip) {
            chip.textContent = (estado.abierto ? "🟢 " : "🔴 ") + estado.mensaje;
            chip.classList.add(estado.abierto ? "abierto" : "cerrado");
        }
    } catch (e) {
        document.getElementById("estado-restaurante").textContent = "Horario no disponible";
    }
}

// ---------- Platos de la casa (4 destacados) ----------
async function cargarDestacados() {
    const contenedor = document.getElementById("grid-destacados");
    try {
        const platos = await Api.get("/platos?destacado=1");
        contenedor.innerHTML = platos.slice(0, 4).map((p) => `
            <article class="tarjeta-casa" data-testid="tarjeta-casa-${p.id}" onclick="abrirPlato(${p.id})">
                <div class="tarjeta-casa-img" style="background-image:url('${p.imagen}')"></div>
                <div class="tarjeta-casa-cuerpo">
                    <span class="etiqueta">${p.categoria_nombre}</span>
                    <h3>${p.nombre}</h3>
                    <p>${p.descripcion || ""}</p>
                    <span class="precio">${lps(p.precio)}</span>
                </div>
            </article>`).join("");
    } catch (e) {
        contenedor.innerHTML = `<p class="aviso-error">No se pudo cargar los platos.</p>`;
    }
}

// ---------- Filtros y menú completo ----------
let TODOS_LOS_PLATOS = [];

async function cargarMenu() {
    try {
        const [categorias, platos] = await Promise.all([
            Api.get("/categorias"),
            Api.get("/platos"),
        ]);
        TODOS_LOS_PLATOS = platos;

        // Construir los chips de filtro
        const filtros = document.getElementById("filtros-menu");
        categorias.forEach((c) => {
            const btn = document.createElement("button");
            btn.className = "chip";
            btn.dataset.slug = c.slug;
            btn.dataset.testid = "filtro-" + c.slug;
            btn.textContent = c.nombre;
            filtros.appendChild(btn);
        });

        filtros.addEventListener("click", (ev) => {
            if (!ev.target.classList.contains("chip")) return;
            document.querySelectorAll("#filtros-menu .chip").forEach((b) => b.classList.remove("chip-activo"));
            ev.target.classList.add("chip-activo");
            pintarMenu(ev.target.dataset.slug);
        });

        pintarMenu("");
    } catch (e) {
        document.getElementById("grid-menu").innerHTML = `<p class="aviso-error">No se pudo cargar el menú.</p>`;
    }
}

function pintarMenu(slug) {
    const lista = slug ? TODOS_LOS_PLATOS.filter((p) => p.categoria_slug === slug) : TODOS_LOS_PLATOS;
    document.getElementById("grid-menu").innerHTML = lista.map((p) => `
        <article class="tarjeta-menu" data-testid="plato-${p.id}" onclick="abrirPlato(${p.id})">
            <div class="tarjeta-menu-img" style="background-image:url('${p.imagen}')"></div>
            <div class="tarjeta-menu-cuerpo">
                <div class="tarjeta-menu-top">
                    <h3>${p.nombre}</h3>
                    <span class="precio">${lps(p.precio)}</span>
                </div>
                <p>${p.descripcion || ""}</p>
                <span class="toca-mas">Toca para ver variedades →</span>
            </div>
        </article>`).join("");
}

// ---------- Modal con las variedades de un plato ----------
async function abrirPlato(id) {
    try {
        const plato = await Api.get("/platos/" + id);
        document.getElementById("modal-img").src = plato.imagen;
        document.getElementById("modal-nombre").textContent = plato.nombre;
        document.getElementById("modal-desc").textContent = plato.descripcion || "";

        const ul = document.getElementById("modal-variedades");
        if (plato.variedades && plato.variedades.length > 0) {
            ul.innerHTML = plato.variedades.map((v) => `
                <li>
                    <div>
                        <strong>${v.nombre}</strong>
                        <small>${v.descripcion || ""}</small>
                    </div>
                    <span class="precio">${lps(v.precio)}</span>
                </li>`).join("");
        } else {
            ul.innerHTML = `<li><div><strong>Platillo único</strong><small>Precio fijo: ${lps(plato.precio)}</small></div></li>`;
        }
        document.getElementById("modal-plato").classList.remove("oculto");
    } catch (e) {
        mostrarToast("No se pudo abrir el plato", "error");
    }
}

function cerrarModal() {
    document.getElementById("modal-plato").classList.add("oculto");
}

// ---------- Promociones ----------
async function cargarPromos() {
    const contenedor = document.getElementById("grid-promos");
    try {
        const promos = await Api.get("/promociones?solo_activas=1");
        contenedor.innerHTML = promos.map((pr) => `
            <article class="tarjeta-promo" data-testid="promo-${pr.id}">
                <div class="promo-cinta">¡Oferta!</div>
                <h3>${pr.nombre}</h3>
                <p>${pr.descripcion || ""}</p>
                <div class="promo-precios">
                    ${pr.precio_antes ? `<span class="precio-antes">${lps(pr.precio_antes)}</span>` : ""}
                    <span class="precio-ahora">${lps(pr.precio)}</span>
                </div>
            </article>`).join("");
    } catch (e) {
        contenedor.innerHTML = `<p class="aviso-error">No se pudo cargar las promociones.</p>`;
    }
}

// ---------- Formulario de reservas (arma el resumen) ----------
function configurarReservas() {
    const form = document.getElementById("form-reserva");

    // Mientras el usuario escribe, actualizamos el resumen en vivo
    form.addEventListener("input", actualizarResumen);

    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const datos = leerFormReserva();
        if (!datos.nombre || !datos.telefono || !datos.fecha || !datos.hora) {
            mostrarToast("Por favor completa todos los campos", "error");
            return;
        }
        try {
            const r = await Api.post("/reservas", datos);
            mostrarToast(r.mensaje || "¡Reserva registrada!", "ok");
            form.reset();
            actualizarResumen();
        } catch (e) {
            mostrarToast(e.message, "error");
        }
    });
}

function leerFormReserva() {
    const form = document.getElementById("form-reserva");
    return {
        nombre: form.nombre.value.trim(),
        telefono: form.telefono.value.trim(),
        personas: parseInt(form.personas.value || "1", 10),
        fecha: form.fecha.value,
        hora: form.hora.value,
        notas: form.notas.value.trim(),
    };
}

function actualizarResumen() {
    const d = leerFormReserva();
    const lista = document.getElementById("resumen-lista");
    const vacio = document.getElementById("resumen-vacio");

    if (!d.nombre && !d.fecha && !d.hora) {
        lista.classList.add("oculto");
        vacio.classList.remove("oculto");
        return;
    }
    vacio.classList.add("oculto");
    lista.classList.remove("oculto");
    lista.innerHTML = `
        <li><span>Nombre</span><strong>${d.nombre || "—"}</strong></li>
        <li><span>Teléfono</span><strong>${d.telefono || "—"}</strong></li>
        <li><span>Personas</span><strong>${d.personas || "—"}</strong></li>
        <li><span>Fecha</span><strong>${d.fecha || "—"}</strong></li>
        <li><span>Hora</span><strong>${d.hora || "—"}</strong></li>
        ${d.notas ? `<li><span>Notas</span><strong>${d.notas}</strong></li>` : ""}`;
}

// ---------- Copiar teléfono y correo ----------
function configurarCopiar() {
    const copiar = (texto, msg) => {
        navigator.clipboard.writeText(texto)
            .then(() => mostrarToast(msg, "ok"))
            .catch(() => mostrarToast("No se pudo copiar", "error"));
    };
    document.getElementById("btn-copiar-tel").onclick = () => copiar("+504 2234-5678", "Teléfono copiado ✓");
    document.getElementById("btn-copiar-correo").onclick = () => copiar("hola@elfogon.hn", "Correo copiado ✓");
}

// ---------- Menú móvil (hamburguesa) ----------
function configurarMenuMovil() {
    const btn = document.getElementById("btn-hamburguesa");
    const nav = document.getElementById("menu-nav");
    btn.addEventListener("click", () => nav.classList.toggle("abierto"));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("abierto")));
}

// ---------- Arranque ----------
document.addEventListener("DOMContentLoaded", () => {
    cargarEstado();
    cargarDestacados();
    cargarMenu();
    cargarPromos();
    configurarReservas();
    configurarCopiar();
    configurarMenuMovil();

    document.getElementById("modal-cerrar").onclick = cerrarModal;
    document.getElementById("modal-plato").addEventListener("click", (ev) => {
        if (ev.target.id === "modal-plato") cerrarModal();
    });
});
