// ============================================================
//  main.js — Página principal de El Fogón (Modo Local)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. FORZAR ESTADO DE HORARIO A "ABIERTO"
    mostrarHorarioAbierto();

    // 2. CARGAR COMIDAS DE PRUEBA EN EL MENÚ
    cargarComidasLocal();

    // 3. CARGAR PROMOCIONES
    cargarPromocionesLocal();

    // 4. CONFIGURAR MENÚ MÓVIL (HAMBURGUESA) Y FORMULARIOS
    configurarMenuMovil();
    configurarReservaLocal();
});

// ---------- Horario Abierto ----------
function mostrarHorarioAbierto() {
    const estadoBadge = document.getElementById("estado-restaurante");
    const estadoUbicacion = document.getElementById("estado-ubicacion");
    const portadaHora = document.getElementById("portada-hora");

    if (estadoBadge) {
        estadoBadge.textContent = "🟢 ABIERTO AHORA";
        estadoBadge.classList.add("chip-abierto");
    }
    if (estadoUbicacion) {
        estadoUbicacion.textContent = "🟢 Abierto hoy de 10:00 am a 10:00 pm";
    }
    if (portadaHora) {
        portadaHora.textContent = "Horario de hoy: 10:00 am – 10:00 pm";
    }
}

// ---------- Platos y Menú de Comidas ----------
function cargarComidasLocal() {
    const gridDestacados = document.getElementById("grid-destacados");
    const gridMenu = document.getElementById("grid-menu");

    const listaComidas = [
        {
            id: 1,
            nombre: "Baleada Sencilla",
            precio: 35,
            categoria: "Antojitos",
            imagen: "img/baleadas.jpg",
            descripcion: "Tortilla de harina recién hecha, frijoles fritos, mantequilla crema y queso rallado.",
            destacado: true
        },
        {
            id: 2,
            nombre: "Sopa de Frijoles con Costilla",
            precio: 120,
            categoria: "Sopas",
            imagen: "img/sopa-de-frijoles.jpg",
            descripcion: "Acompañada de arroz blanco, aguacate, queso y tortillas de maíz calientitas.",
            destacado: true
        },
        {
            id: 3,
            nombre: "Pupusas Catrachas (3 und)",
            precio: 90,
            categoria: "Antojitos",
            imagen: "img/pupusas.jpg",
            descripcion: "Rellenas de chicharrón, quesillo y loroco. Incluye encurtido y salsa roja.",
            destacado: true
        },
        {
            id: 4,
            nombre: "Catrachas Especiales",
            precio: 65,
            categoria: "Antojitos",
            imagen: "img/catrachas.jpg",
            descripcion: "Tortillas tostadas con frijoles molidos, queso rallado y chismol fresco.",
            destacado: true
        }
    ];

    if (gridDestacados) {
        gridDestacados.innerHTML = listaComidas
            .filter(c => c.destacado)
            .map(c => crearTarjetaComida(c))
            .join("");
    }

    if (gridMenu) {
        gridMenu.innerHTML = listaComidas
            .map(c => crearTarjetaComida(c))
            .join("");
    }
}

function crearTarjetaComida(c) {
    return `
        <article class="tarjeta-plato">
            <img src="${c.imagen}" alt="${c.nombre}" class="plato-img" onerror="this.src='img/logo-el-fogon.png'" />
            <div class="plato-info">
                <span class="plato-categoria">${c.categoria}</span>
                <h3 class="plato-titulo">${c.nombre}</h3>
                <p class="plato-desc">${c.descripcion}</p>
                <div class="plato-pie">
                    <span class="plato-precio">L ${c.precio}.00</span>
                </div>
            </div>
        </article>
    `;
}

// ---------- Promociones ----------
function cargarPromocionesLocal() {
    const gridPromos = document.getElementById("grid-promos");
    if (!gridPromos) return;

    const listaPromos = [
        {
            id: 1,
            nombre: "Combo Familiar de Baleadas",
            precio: 120,
            precio_antes: 150,
            imagen: "img/baleadas.jpg",
            descripcion: "Incluye 4 baleadas sencillas y una jarra de refresco o jugo natural."
        },
        {
            id: 2,
            nombre: "Especial de Bebidas y Antojitos",
            precio: 95,
            precio_antes: 120,
            imagen: "img/bebidas.jpg",
            descripcion: "Disfruta de tus antojos catrachos acompañados de una bebida helada."
        }
    ];

    gridPromos.innerHTML = listaPromos.map(pr => `
        <article class="tarjeta-promo">
            <img src="${pr.imagen}" alt="${pr.nombre}" class="promo-img" onerror="this.src='img/logo-el-fogon.png'" />
            <div class="promo-info">
                <h3>${pr.nombre}</h3>
                <p>${pr.descripcion}</p>
                <div class="promo-precios">
                    <span class="precio-nuevo">L ${pr.precio}.00</span>
                    ${pr.precio_antes ? `<span class="precio-antes">L ${pr.precio_antes}.00</span>` : ""}
                </div>
            </div>
        </article>
    `).join("");
}

// ---------- Funciones adicionales de soporte ----------
function configurarMenuMovil() {
    const btnHamburguesa = document.getElementById("btn-hamburguesa");
    const menuNav = document.getElementById("menu-nav");

    if (btnHamburguesa && menuNav) {
        btnHamburguesa.addEventListener("click", () => {
            menuNav.classList.toggle("menu-abierto");
        });
    }
}

function configurarReservaLocal() {
    const formReserva = document.getElementById("form-reserva");
    if (formReserva) {
        formReserva.addEventListener("submit", (e) => {
            e.preventDefault();
            alert("¡Reserva confirmada con éxito! Te esperamos en El Fogón.");
            formReserva.reset();
        });
    }
}