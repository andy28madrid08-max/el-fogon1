-- ============================================================
--  EL FOGÓN - Script de base de datos
--  Restaurante de comida catracha - Tegucigalpa, Honduras
-- ============================================================
--  Este script crea TODAS las tablas y las llena con datos de
--  ejemplo. Está escrito para SQLite (la base que usa el proyecto),
--  pero es casi idéntico en MySQL (ver notas al final).
--
--  Cómo ejecutarlo en SQLite:
--      sqlite3 el_fogon.db < schema.sql
--  (El backend también lo crea solo al arrancar.)
-- ============================================================

-- ---------- Limpieza (por si se vuelve a ejecutar) ----------
DROP TABLE IF EXISTS variedades;
DROP TABLE IF EXISTS platos;
DROP TABLE IF EXISTS promociones;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

-- ============================================================
--  TABLA: usuarios  (login con 3 roles)
-- ============================================================
CREATE TABLE usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    usuario       TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,                 -- contraseña encriptada con bcrypt
    rol           TEXT NOT NULL CHECK (rol IN ('jefe','mesero','recepcionista'))
);

-- ============================================================
--  TABLA: categorias  (baleadas, pupusas, catrachas, sopas, bebidas)
-- ============================================================
CREATE TABLE categorias (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    slug   TEXT NOT NULL UNIQUE
);

-- ============================================================
--  TABLA: platos  (el menú, 16 platillos)
-- ============================================================
CREATE TABLE platos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       TEXT NOT NULL,
    descripcion  TEXT,
    precio       REAL NOT NULL,
    categoria_id INTEGER NOT NULL,
    imagen       TEXT,
    destacado    INTEGER DEFAULT 0,              -- 1 = aparece en "Platos de la casa"
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- ============================================================
--  TABLA: variedades  (ej: baleada con carne, con huevo, etc.)
-- ============================================================
CREATE TABLE variedades (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    plato_id    INTEGER NOT NULL,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    precio      REAL NOT NULL,
    FOREIGN KEY (plato_id) REFERENCES platos(id)
);

-- ============================================================
--  TABLA: promociones
-- ============================================================
CREATE TABLE promociones (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       TEXT NOT NULL,
    descripcion  TEXT,
    precio       REAL NOT NULL,
    precio_antes REAL,
    activa       INTEGER DEFAULT 1
);

-- ============================================================
--  TABLA: reservas
-- ============================================================
CREATE TABLE reservas (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    telefono  TEXT NOT NULL,
    personas  INTEGER NOT NULL,
    fecha     TEXT NOT NULL,
    hora      TEXT NOT NULL,
    notas     TEXT,
    creado_en TEXT
);

-- ============================================================
--  DATOS DE EJEMPLO
-- ============================================================

-- Usuarios (las contraseñas reales son: jefe123, mesero123, recepcion123)
-- Nota: el backend las vuelve a crear encriptadas con bcrypt al arrancar.
INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES
('Jefe / Gerente', 'jefe', '$2b$12$ejemploHashBcryptJefeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'jefe'),
('Mesero', 'mesero', '$2b$12$ejemploHashBcryptMeseroXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'mesero'),
('Recepcionista', 'recepcion', '$2b$12$ejemploHashBcryptRecepXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'recepcionista');

-- Categorías
INSERT INTO categorias (nombre, slug) VALUES
('Baleadas', 'baleadas'),
('Pupusas', 'pupusas'),
('Catrachas', 'catrachas'),
('Sopas', 'sopas'),
('Bebidas', 'bebidas');

-- Platos (16) con precios en lempiras
INSERT INTO platos (nombre, descripcion, precio, categoria_id, imagen, destacado) VALUES
('Baleada Sencilla', 'Tortilla de harina con frijoles, mantequilla y queso.', 35, 1, '/img/baleadas.jpg', 1),
('Baleada con Huevo', 'La sencilla más huevo revuelto bien calientito.', 45, 1, '/img/baleadas.jpg', 0),
('Baleada con Carne', 'Con carne asada jugosa, frijoles y queso.', 70, 1, '/img/baleadas.jpg', 1),
('Baleada Especial de la Casa', 'Carne, aguacate, huevo, chismol y doble queso.', 90, 1, '/img/baleadas.jpg', 0),
('Pupusa de Queso', 'Masa rellena de quesillo derretido, con curtido.', 20, 2, '/img/pupusas.jpg', 1),
('Pupusa de Frijol con Queso', 'Clásica combinación de frijol molido y queso.', 22, 2, '/img/pupusas.jpg', 0),
('Pupusa Revuelta', 'Chicharrón, frijol y queso, la más pedida.', 25, 2, '/img/pupusas.jpg', 0),
('Pupusa de Loroco', 'Flor de loroco con quesillo, un sabor único.', 25, 2, '/img/pupusas.jpg', 0),
('Catracha Clásica', 'Tortilla frita con frijoles fritos y queso rallado.', 18, 3, '/img/catrachas.jpg', 1),
('Catracha con Carnita', 'La clásica coronada con carnita deshilachada.', 35, 3, '/img/catrachas.jpg', 0),
('Sopa de Frijoles', 'Caldo de frijoles rojos con costilla y verduras.', 95, 4, '/img/sopa-de-frijoles.jpg', 1),
('Sopa de Res', 'Res con yuca, guineo, elote y repollo.', 120, 4, '/img/sopa-de-frijoles.jpg', 0),
('Horchata', 'Refrescante horchata de morro bien fría.', 30, 5, '/img/bebidas.jpg', 0),
('Fresco de Tamarindo', 'Agua fresca natural de tamarindo.', 28, 5, '/img/bebidas.jpg', 0),
('Licuado de Banano', 'Banano con leche, espeso y nutritivo.', 40, 5, '/img/bebidas.jpg', 0),
('Café Catracho', 'Café de altura hondureño, recién colado.', 25, 5, '/img/bebidas.jpg', 0);

-- Variedades
INSERT INTO variedades (plato_id, nombre, descripcion, precio) VALUES
(1, 'Con mantequilla y queso', 'La original catracha.', 35),
(1, 'Con frijol licuado', 'Frijoles bien molidos y suaves.', 38),
(1, 'Con aguacate', 'Se le agrega aguacate fresco.', 45),
(3, 'Carne asada', 'Carne de res a la plancha.', 70),
(3, 'Pollo a la plancha', 'Pechuga de pollo sazonada.', 68),
(3, 'Chuleta de cerdo', 'Chuleta jugosa en trozos.', 75),
(5, 'Queso solo', 'Quesillo puro derretido.', 20),
(5, 'Queso con loroco', 'Quesillo con flor de loroco.', 25),
(5, 'Queso con jalapeño', 'Para los que les gusta picante.', 23),
(9, 'Con queso seco', 'Queso rallado tradicional.', 18),
(9, 'Con quesillo', 'Quesillo derretido encima.', 22),
(9, 'Con chismol', 'Pico de gallo hondureño fresco.', 20),
(11, 'Con costilla', 'Costilla de res en el caldo.', 95),
(11, 'Con chorizo', 'Chorizo criollo y verduras.', 100);

-- Promociones
INSERT INTO promociones (nombre, descripcion, precio, precio_antes, activa) VALUES
('Combo Catracho Feliz', '3 baleadas con carne + 2 frescos naturales.', 180, 230, 1),
('Martes de Pupusas Locas', '4 pupusas revueltas + curtido y café.', 95, 120, 1),
('Dúo Enamorado', '2 baleadas especiales + 2 horchatas para compartir.', 150, 190, 1),
('Almuerzo del Fogón', 'Sopa de res + fresco + postre del día.', 140, 165, 1),
('Fin de Semana Catracho', 'Parrillada familiar para 4 con bebidas.', 450, 540, 1);

-- ============================================================
--  NOTAS PARA MySQL (si en vez de SQLite usan MySQL / Supabase):
--  - Cambiar "INTEGER PRIMARY KEY AUTOINCREMENT" por
--    "INT AUTO_INCREMENT PRIMARY KEY".
--  - Cambiar el tipo TEXT por VARCHAR(255) donde aplique.
--  - REAL puede ser DECIMAL(10,2).
--  - El resto de la sintaxis (INSERT, FOREIGN KEY) es igual.
-- ============================================================
