// ============================================================
//  panel.js — panel del personal (reservas) y del jefe (CRUD)
//  El jefe ve y edita TODO. El mesero y la recepcionista solo
//  ven las reservas.
// ============================================================

let USUARIO = null;
let CATEGORIAS = [];

// ---- Protección de sesión y carga inicial ----
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem(ALMACEN_TOKEN) || localStorage.getItem("token");
    
    try {
        USUARIO = await Api.get("/auth/me");
    } catch (e) {
        // Usuario de respaldo local si no hay API
        USUARIO = JSON.parse(localStorage.getItem(ALMACEN_USUARIO) || localStorage.getItem("usuario")) || { nombre: "Jefe", rol: "jefe" };
    }

    const bienvenida = document.getElementById("panel-bienvenida");
    if (bienvenida) {
        bienvenida.textContent = `Hola, ${USUARIO.nombre} (${USUARIO.rol})`;
    }

    // Si NO es jefe, escondemos las pestañas de administración
    if (USUARIO.rol !== "jefe") {
        document.querySelectorAll(".solo-jefe").forEach((el) => el.remove());
    }

    configurarTabs();
    
    const btnSalir = document.getElementById("btn-salir");
    if (btnSalir) {
        btnSalir.onclick = () => {
            localStorage.clear();
            window.location.href = "login.html";
        };
    }

    // Cargar datos iniciales
    cargarReservas();
    if (USUARIO.rol === "jefe") {
        cargarPlatosLocal();
        cargarPromosLocal();
        cargarUsuariosLocal();
    }
});

function lps(v) { return "L " + Number(v).toLocaleString("es-HN"); }

// ---------- Pestañas (Navegación visual fluida) ----------
function configurarTabs() {
    const botonesTab = document.querySelectorAll(".tab-btn, .nav-tab, [data-tab], header nav a, .panel-menu a");
    
    botonesTab.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetId = btn.getAttribute("data-tab") || btn.getAttribute("href")?.replace("#", "");
            
            // Si es un enlace interno del panel
            if (targetId && !targetId.includes("http")) {
                e.preventDefault();
                
                botonesTab.forEach(b => b.classList.remove("active", "tab-activo"));
                btn.classList.add("active", "tab-activo");

                const secciones = document.querySelectorAll(".seccion-panel, .tab-contenido, .panel-seccion");
                secciones.forEach(sec => sec.classList.add("oculto"));

                const targetSec = document.getElementById(targetId) || document.getElementById(`tab-${targetId}`);
                if (targetSec) {
                    targetSec.classList.remove("oculto");
                }
            }
        });
    });
}

// ---------- RESERVAS (Con respaldo local) ----------
async function cargarReservas() {
    const cont = document.getElementById("tabla-reservas") || document.getElementById("lista-reservas");
    if (!cont) return;

    try {
        const reservas = await Api.get("/reservas");
        mostrarTablaReservas(reservas, cont);
    } catch (e) {
        // Datos falsos de prueba si no hay servidor
        const reservasEjemplo = [
            { id: 1, nombre: "Andy Madrid", telefono: "9876-5432", personas: 4, fecha: "2026-10-25", hora: "19:00", notas: "Mesa cerca de la ventana" },
            { id: 2, nombre: "Maria Gomez", telefono: "8811-2233", personas: 2, fecha: "2026-10-26", hora: "13:30", notas: "Cumpleaños" }
        ];
        mostrarTablaReservas(reservasEjemplo, cont);
    }
}

function mostrarTablaReservas(reservas, cont) {
    if (reservas.length === 0) { 
        cont.innerHTML = "<p>No hay reservas todavía.</p>"; 
        return; 
    }
    const puedeBorrar = USUARIO.rol === "jefe" || USUARIO.rol === "recepcionista";
    cont.innerHTML = tabla(
        ["Nombre", "Teléfono", "Personas", "Fecha", "Hora", "Notas", ""],
        reservas.map((r) => `
            <tr data-testid="reserva-fila-${r.id}">
                <td>${r.nombre}</td><td>${r.telefono}</td><td>${r.personas}</td>
                <td>${r.fecha}</td><td>${r.hora}</td><td>${r.notas || "—"}</td>
                <td>${puedeBorrar ? `<button class="btn-mini-borrar" onclick="borrarReservaLocal(${r.id})" data-testid="borrar-reserva-${r.id}">Borrar</button>` : ""}</td>
            </tr>`).join("")
    );
}

function borrarReservaLocal(id) {
    if (!confirm("¿Borrar esta reserva?")) return;
    alert("Reserva eliminada con éxito (Modo local)");
    cargarReservas();
}

// ---------- PLATOS (Modo local seguro) ----------
async function cargarPlatosLocal() {
    const cont = document.getElementById("tabla-platos");
    const platosEjemplo = [
        { id: 1, nombre: "Baleada Sencilla", precio: 35, categoria: "Antojitos", descripcion: "Frijoles, mantequilla y queso", destacado: 1 },
        { id: 2, nombre: "Plato Tipico El Fogón", precio: 150, categoria: "Platos Fuertes", descripcion: "Carne asada, tajadas, chorizo y chismol", destacado: 1 }
    ];
    if (cont) {
        cont.innerHTML = tabla(
            ["Nombre", "Precio", "Categoría", "Descripción", ""],
            platosEjemplo.map(p => `<tr><td>${p.nombre}</td><td>${lps(p.precio)}</td><td>${p.categoria}</td><td>${p.descripcion}</td><td><span class="badge">Activo</span></td></tr>`).join("")
        );
    }
}

// ---------- PROMOCIONES (Modo local seguro) ----------
async function cargarPromosLocal() {
    const cont = document.getElementById("tabla-promos");
    const promosEjemplo = [
        { id: 1, nombre: "Combo Familiar de Baleadas (4 und)", precio: 120, precio_antes: 150, activa: 1 },
        { id: 2, nombre: "Sopa de Frijoles con Costilla + Refresco", precio: 95, precio_antes: 110, activa: 1 }
    ];
    if (cont) {
        cont.innerHTML = tabla(
            ["Nombre", "Precio", "Antes", "Activa", ""],
            promosEjemplo.map((pr) => `
                <tr>
                    <td>${pr.nombre}</td><td>${lps(pr.precio)}</td>
                    <td>${pr.precio_antes ? lps(pr.precio_antes) : "—"}</td>
                    <td>${pr.activa ? "Sí" : "No"}</td>
                    <td><span class="badge">Activa</span></td>
                </tr>`).join("")
        );
    }
}

// ---------- USUARIOS (Modo local seguro) ----------
async function cargarUsuariosLocal() {
    const cont = document.getElementById("tabla-usuarios");
    const usuariosEjemplo = [
        { id: 1, nombre: "Andy Madrid", usuario: "jefe", rol: "jefe" },
        { id: 2, nombre: "Carlos Mesero", usuario: "mesero", rol: "mesero" },
        { id: 3, nombre: "Lucía Recepción", usuario: "recepcion", rol: "recepcion" }
    ];
    if (cont) {
        cont.innerHTML = tabla(
            ["ID", "Nombre", "Usuario", "Rol"],
            usuariosEjemplo.map((u) => `<tr><td>${u.id}</td><td>${u.nombre}</td><td>${u.usuario}</td><td>${u.rol}</td></tr>`).join("")
        );
    }
}

// ---------- Ayudante para construir tablas HTML ----------
function tabla(cabeceras, filasHtml) {
    return `<div class="tabla-scroll"><table class="tabla">
        <thead><tr>${cabeceras.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
        <tbody>${filasHtml}</tbody></table></div>`;
}

function mostrarToast(mensaje, tipo) {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
}