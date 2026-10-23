# ============================================================
#  EL FOGÓN - API del restaurante de comida catracha
#  Backend hecho con FastAPI + base de datos SQLite
#  Proyecto escolar - Tegucigalpa, Honduras
# ============================================================
#  Aquí vive toda la "cocina" del sistema: la conexión con la
#  base de datos, el login seguro con contraseñas encriptadas,
#  y todas las rutas (endpoints) para el menú, promociones y
#  reservas. Está comentado en español para que cualquiera del
#  grupo pueda explicarlo en la defensa del proyecto.
# ============================================================

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
import sqlite3
import os
import bcrypt
import jwt

# ---- Cargamos las variables de entorno (.env) ----
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Ubicación del archivo de base de datos SQLite
DB_PATH = ROOT_DIR / "el_fogon.db"

# Clave secreta para firmar los tokens del login
JWT_SECRET = os.environ.get("JWT_SECRET", "clave_super_secreta_el_fogon_2026")
JWT_ALGORITHM = "HS256"

# Zona horaria de Honduras para saber si está "Abierto" o "Cerrado"
ZONA_HONDURAS = ZoneInfo("America/Tegucigalpa")
HORA_APERTURA = 10   # abrimos a las 10:00 am
HORA_CIERRE = 22     # cerramos a las 10:00 pm

app = FastAPI(title="API El Fogón")
api = APIRouter(prefix="/api")
seguridad = HTTPBearer(auto_error=False)


# ============================================================
#  CONEXIÓN A LA BASE DE DATOS
# ============================================================
def get_conn():
    """Devuelve una conexión a la base de datos SQLite."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row   # para leer columnas por nombre
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ============================================================
#  SEGURIDAD DEL LOGIN (contraseñas encriptadas y tokens)
# ============================================================
def encriptar_password(password: str) -> str:
    """Convierte la contraseña en un hash seguro con bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_password(password: str, hash_guardado: str) -> bool:
    """Compara la contraseña escrita con el hash guardado."""
    return bcrypt.checkpw(password.encode("utf-8"), hash_guardado.encode("utf-8"))


def crear_token(usuario_id: int, usuario: str, rol: str) -> str:
    """Genera un token JWT que dura 8 horas (un turno de trabajo)."""
    payload = {
        "sub": str(usuario_id),
        "usuario": usuario,
        "rol": rol,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def usuario_actual(cred: HTTPAuthorizationCredentials = Depends(seguridad)) -> dict:
    """Lee el token del encabezado y devuelve el usuario que inició sesión."""
    if cred is None:
        raise HTTPException(status_code=401, detail="Debes iniciar sesión")
    try:
        datos = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Tu sesión expiró, vuelve a entrar")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    conn = get_conn()
    fila = conn.execute(
        "SELECT id, nombre, usuario, rol FROM usuarios WHERE id = ?",
        (datos["sub"],),
    ).fetchone()
    conn.close()
    if fila is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return dict(fila)


def solo_jefe(usuario: dict = Depends(usuario_actual)) -> dict:
    """Permite el paso únicamente al rol 'jefe' (el que puede ver y editar todo)."""
    if usuario["rol"] != "jefe":
        raise HTTPException(status_code=403, detail="Solo el jefe puede realizar esta acción")
    return usuario


# ============================================================
#  MODELOS DE DATOS (validación en el servidor)
#  Pydantic evita que se guarden campos vacíos o incorrectos.
# ============================================================
class LoginData(BaseModel):
    usuario: str
    password: str

    @field_validator("usuario", "password")
    @classmethod
    def no_vacio(cls, v):
        if not v or not v.strip():
            raise ValueError("Este campo no puede ir vacío")
        return v.strip()


class PlatoData(BaseModel):
    nombre: str
    descripcion: str = ""
    precio: float
    categoria_id: int
    imagen: str = ""
    destacado: int = 0

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v):
        if not v or not v.strip():
            raise ValueError("El nombre del plato es obligatorio")
        return v.strip()

    @field_validator("precio")
    @classmethod
    def precio_valido(cls, v):
        if v is None or v <= 0:
            raise ValueError("El precio debe ser mayor a 0")
        return v


class PromocionData(BaseModel):
    nombre: str
    descripcion: str = ""
    precio: float
    precio_antes: Optional[float] = None
    activa: int = 1

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v):
        if not v or not v.strip():
            raise ValueError("El nombre de la promoción es obligatorio")
        return v.strip()


class ReservaData(BaseModel):
    nombre: str
    telefono: str
    personas: int
    fecha: str
    hora: str
    notas: str = ""

    @field_validator("nombre", "telefono", "fecha", "hora")
    @classmethod
    def campos_obligatorios(cls, v):
        if not v or not str(v).strip():
            raise ValueError("Todos los campos de la reserva son obligatorios")
        return str(v).strip()

    @field_validator("personas")
    @classmethod
    def personas_validas(cls, v):
        if v is None or v < 1:
            raise ValueError("Debe ser al menos 1 persona")
        return v


# ============================================================
#  RUTAS DE LA API
# ============================================================
@api.get("/")
def inicio():
    return {"mensaje": "Bienvenido a la API de El Fogón 🔥"}


# ---------- Estado del restaurante (Abierto / Cerrado) ----------
@api.get("/estado")
def estado_restaurante():
    """Calcula si el restaurante está abierto según la hora de Honduras."""
    ahora = datetime.now(ZONA_HONDURAS)
    abierto = HORA_APERTURA <= ahora.hour < HORA_CIERRE
    return {
        "abierto": abierto,
        "hora_actual": ahora.strftime("%I:%M %p"),
        "horario": f"{HORA_APERTURA}:00 am - {HORA_CIERRE - 12}:00 pm",
        "mensaje": "Abierto ahora" if abierto else "Cerrado ahora",
    }


# ---------- LOGIN ----------
@api.post("/auth/login")
def login(datos: LoginData):
    conn = get_conn()
    fila = conn.execute(
        "SELECT * FROM usuarios WHERE usuario = ?", (datos.usuario,)
    ).fetchone()
    conn.close()

    if fila is None or not verificar_password(datos.password, fila["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = crear_token(fila["id"], fila["usuario"], fila["rol"])
    return {
        "token": token,
        "usuario": {
            "id": fila["id"],
            "nombre": fila["nombre"],
            "usuario": fila["usuario"],
            "rol": fila["rol"],
        },
    }


@api.get("/auth/me")
def quien_soy(usuario: dict = Depends(usuario_actual)):
    return usuario


# ---------- CATEGORÍAS ----------
@api.get("/categorias")
def listar_categorias():
    conn = get_conn()
    filas = conn.execute("SELECT * FROM categorias ORDER BY id").fetchall()
    conn.close()
    return [dict(f) for f in filas]


# ---------- PLATOS (menú) ----------
@api.get("/platos")
def listar_platos(categoria: Optional[str] = None, destacado: Optional[int] = None):
    """Lista los platos. Se puede filtrar por categoría o por destacados."""
    conn = get_conn()
    sql = """SELECT p.*, c.slug AS categoria_slug, c.nombre AS categoria_nombre
             FROM platos p JOIN categorias c ON p.categoria_id = c.id WHERE 1=1"""
    params = []
    if categoria:
        sql += " AND c.slug = ?"
        params.append(categoria)
    if destacado is not None:
        sql += " AND p.destacado = ?"
        params.append(destacado)
    sql += " ORDER BY p.id"
    filas = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(f) for f in filas]


@api.get("/platos/{plato_id}")
def ver_plato(plato_id: int):
    """Devuelve un plato con todas sus variedades (ej: baleada con carne, con huevo...)."""
    conn = get_conn()
    plato = conn.execute(
        """SELECT p.*, c.slug AS categoria_slug, c.nombre AS categoria_nombre
           FROM platos p JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?""",
        (plato_id,),
    ).fetchone()
    if plato is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Plato no encontrado")
    variedades = conn.execute(
        "SELECT * FROM variedades WHERE plato_id = ? ORDER BY id", (plato_id,)
    ).fetchall()
    conn.close()
    resultado = dict(plato)
    resultado["variedades"] = [dict(v) for v in variedades]
    return resultado


@api.post("/platos")
def crear_plato(datos: PlatoData, jefe: dict = Depends(solo_jefe)):
    conn = get_conn()
    cur = conn.execute(
        """INSERT INTO platos (nombre, descripcion, precio, categoria_id, imagen, destacado)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (datos.nombre, datos.descripcion, datos.precio, datos.categoria_id,
         datos.imagen, datos.destacado),
    )
    conn.commit()
    nuevo_id = cur.lastrowid
    conn.close()
    return {"id": nuevo_id, "mensaje": "Plato creado correctamente"}


@api.put("/platos/{plato_id}")
def editar_plato(plato_id: int, datos: PlatoData, jefe: dict = Depends(solo_jefe)):
    conn = get_conn()
    existe = conn.execute("SELECT id FROM platos WHERE id = ?", (plato_id,)).fetchone()
    if existe is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Plato no encontrado")
    conn.execute(
        """UPDATE platos SET nombre=?, descripcion=?, precio=?, categoria_id=?,
           imagen=?, destacado=? WHERE id=?""",
        (datos.nombre, datos.descripcion, datos.precio, datos.categoria_id,
         datos.imagen, datos.destacado, plato_id),
    )
    conn.commit()
    conn.close()
    return {"mensaje": "Plato actualizado correctamente"}


@api.delete("/platos/{plato_id}")
def borrar_plato(plato_id: int, jefe: dict = Depends(solo_jefe)):
    conn = get_conn()
    conn.execute("DELETE FROM variedades WHERE plato_id = ?", (plato_id,))
    conn.execute("DELETE FROM platos WHERE id = ?", (plato_id,))
    conn.commit()
    conn.close()
    return {"mensaje": "Plato eliminado correctamente"}


# ---------- PROMOCIONES ----------
@api.get("/promociones")
def listar_promociones(solo_activas: int = 0):
    conn = get_conn()
    sql = "SELECT * FROM promociones"
    if solo_activas:
        sql += " WHERE activa = 1"
    sql += " ORDER BY id"
    filas = conn.execute(sql).fetchall()
    conn.close()
    return [dict(f) for f in filas]


@api.post("/promociones")
def crear_promocion(datos: PromocionData, jefe: dict = Depends(solo_jefe)):
    conn = get_conn()
    cur = conn.execute(
        """INSERT INTO promociones (nombre, descripcion, precio, precio_antes, activa)
           VALUES (?, ?, ?, ?, ?)""",
        (datos.nombre, datos.descripcion, datos.precio, datos.precio_antes, datos.activa),
    )
    conn.commit()
    nuevo_id = cur.lastrowid
    conn.close()
    return {"id": nuevo_id, "mensaje": "Promoción creada correctamente"}


@api.put("/promociones/{promo_id}")
def editar_promocion(promo_id: int, datos: PromocionData, jefe: dict = Depends(solo_jefe)):
    conn = get_conn()
    existe = conn.execute("SELECT id FROM promociones WHERE id = ?", (promo_id,)).fetchone()
    if existe is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    conn.execute(
        """UPDATE promociones SET nombre=?, descripcion=?, precio=?, precio_antes=?,
           activa=? WHERE id=?""",
        (datos.nombre, datos.descripcion, datos.precio, datos.precio_antes,
         datos.activa, promo_id),
    )
    conn.commit()
    conn.close()
    return {"mensaje": "Promoción actualizada correctamente"}


@api.delete("/promociones/{promo_id}")
def borrar_promocion(promo_id: int, jefe: dict = Depends(solo_jefe)):
    conn = get_conn()
    conn.execute("DELETE FROM promociones WHERE id = ?", (promo_id,))
    conn.commit()
    conn.close()
    return {"mensaje": "Promoción eliminada correctamente"}


# ---------- RESERVAS ----------
@api.post("/reservas")
def crear_reserva(datos: ReservaData):
    """Cualquier cliente puede crear una reserva desde el formulario de la página."""
    conn = get_conn()
    cur = conn.execute(
        """INSERT INTO reservas (nombre, telefono, personas, fecha, hora, notas, creado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (datos.nombre, datos.telefono, datos.personas, datos.fecha, datos.hora,
         datos.notas, datetime.now(ZONA_HONDURAS).isoformat()),
    )
    conn.commit()
    nuevo_id = cur.lastrowid
    conn.close()
    return {"id": nuevo_id, "mensaje": "¡Reserva registrada! Te esperamos en El Fogón."}


@api.get("/reservas")
def listar_reservas(usuario: dict = Depends(usuario_actual)):
    """El personal (jefe, mesero, recepcionista) puede ver las reservas."""
    conn = get_conn()
    filas = conn.execute("SELECT * FROM reservas ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(f) for f in filas]


@api.delete("/reservas/{reserva_id}")
def borrar_reserva(reserva_id: int, usuario: dict = Depends(usuario_actual)):
    if usuario["rol"] not in ("jefe", "recepcionista"):
        raise HTTPException(status_code=403, detail="No tienes permiso para borrar reservas")
    conn = get_conn()
    conn.execute("DELETE FROM reservas WHERE id = ?", (reserva_id,))
    conn.commit()
    conn.close()
    return {"mensaje": "Reserva eliminada"}


# ---------- USUARIOS (solo el jefe los ve) ----------
@api.get("/usuarios")
def listar_usuarios(jefe: dict = Depends(solo_jefe)):
    conn = get_conn()
    filas = conn.execute("SELECT id, nombre, usuario, rol FROM usuarios ORDER BY id").fetchall()
    conn.close()
    return [dict(f) for f in filas]


# ============================================================
#  CREACIÓN Y LLENADO DE LA BASE DE DATOS (semilla inicial)
# ============================================================
def crear_tablas():
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre        TEXT NOT NULL,
            usuario       TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            rol           TEXT NOT NULL CHECK (rol IN ('jefe','mesero','recepcionista'))
        );
        CREATE TABLE IF NOT EXISTS categorias (
            id     INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            slug   TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS platos (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre       TEXT NOT NULL,
            descripcion  TEXT,
            precio       REAL NOT NULL,
            categoria_id INTEGER NOT NULL REFERENCES categorias(id),
            imagen       TEXT,
            destacado    INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS variedades (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            plato_id    INTEGER NOT NULL REFERENCES platos(id),
            nombre      TEXT NOT NULL,
            descripcion TEXT,
            precio      REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS promociones (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre       TEXT NOT NULL,
            descripcion  TEXT,
            precio       REAL NOT NULL,
            precio_antes REAL,
            activa       INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS reservas (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre    TEXT NOT NULL,
            telefono  TEXT NOT NULL,
            personas  INTEGER NOT NULL,
            fecha     TEXT NOT NULL,
            hora      TEXT NOT NULL,
            notas     TEXT,
            creado_en TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def sembrar_datos():
    """Llena la base de datos con los usuarios, categorías, platos y promos iniciales."""
    conn = get_conn()

    # --- Usuarios (3 roles) ---
    if conn.execute("SELECT COUNT(*) AS n FROM usuarios").fetchone()["n"] == 0:
        usuarios = [
            ("Jefe / Gerente (andy28madrid08@gmail.com)", "jefe", encriptar_password("jefe123"), "jefe"),
            ("Mesero", "mesero", encriptar_password("mesero123"), "mesero"),
            ("Recepcionista", "recepcion", encriptar_password("recepcion123"), "recepcionista"),
        ]
        conn.executemany(
            "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
            usuarios,
        )

    # --- Categorías ---
    if conn.execute("SELECT COUNT(*) AS n FROM categorias").fetchone()["n"] == 0:
        categorias = [
            ("Baleadas", "baleadas"),
            ("Pupusas", "pupusas"),
            ("Catrachas", "catrachas"),
            ("Sopas", "sopas"),
            ("Bebidas", "bebidas"),
        ]
        conn.executemany("INSERT INTO categorias (nombre, slug) VALUES (?, ?)", categorias)

    # --- Platos (16 en total) con precios en lempiras (L) ---
    if conn.execute("SELECT COUNT(*) AS n FROM platos").fetchone()["n"] == 0:
        # (nombre, descripcion, precio, categoria_id, imagen, destacado)
        platos = [
            # Baleadas (categoria 1)
            ("Baleada Sencilla", "Tortilla de harina con frijoles, mantequilla y queso.", 35, 1, "/img/baleadas.jpg", 1),
            ("Baleada con Huevo", "La sencilla más huevo revuelto bien calientito.", 45, 1, "/img/baleadas.jpg", 0),
            ("Baleada con Carne", "Con carne asada jugosa, frijoles y queso.", 70, 1, "/img/baleadas.jpg", 1),
            ("Baleada Especial de la Casa", "Carne, aguacate, huevo, chismol y doble queso.", 90, 1, "/img/baleadas.jpg", 0),
            # Pupusas (categoria 2)
            ("Pupusa de Queso", "Masa rellena de quesillo derretido, con curtido.", 20, 2, "/img/pupusas.jpg", 1),
            ("Pupusa de Frijol con Queso", "Clásica combinación de frijol molido y queso.", 22, 2, "/img/pupusas.jpg", 0),
            ("Pupusa Revuelta", "Chicharrón, frijol y queso, la más pedida.", 25, 2, "/img/pupusas.jpg", 0),
            ("Pupusa de Loroco", "Flor de loroco con quesillo, un sabor único.", 25, 2, "/img/pupusas.jpg", 0),
            # Catrachas (categoria 3)
            ("Catracha Clásica", "Tortilla frita con frijoles fritos y queso rallado.", 18, 3, "/img/catrachas.jpg", 1),
            ("Catracha con Carnita", "La clásica coronada con carnita deshilachada.", 35, 3, "/img/catrachas.jpg", 0),
            # Sopas (categoria 4)
            ("Sopa de Frijoles", "Caldo de frijoles rojos con costilla y verduras.", 95, 4, "/img/sopa-de-frijoles.jpg", 1),
            ("Sopa de Res", "Res con yuca, guineo, elote y repollo.", 120, 4, "/img/sopa-de-frijoles.jpg", 0),
            # Bebidas (categoria 5)
            ("Horchata", "Refrescante horchata de morro bien fría.", 30, 5, "/img/bebidas.jpg", 0),
            ("Fresco de Tamarindo", "Agua fresca natural de tamarindo.", 28, 5, "/img/bebidas.jpg", 0),
            ("Licuado de Banano", "Banano con leche, espeso y nutritivo.", 40, 5, "/img/bebidas.jpg", 0),
            ("Café Catracho", "Café de altura hondureño, recién colado.", 25, 5, "/img/bebidas.jpg", 0),
        ]
        conn.executemany(
            """INSERT INTO platos (nombre, descripcion, precio, categoria_id, imagen, destacado)
               VALUES (?, ?, ?, ?, ?, ?)""",
            platos,
        )

    # --- Variedades (al tocar un plato se muestran) ---
    if conn.execute("SELECT COUNT(*) AS n FROM variedades").fetchone()["n"] == 0:
        variedades = [
            # Variedades de Baleada Sencilla (plato 1)
            (1, "Con mantequilla y queso", "La original catracha.", 35),
            (1, "Con frijol licuado", "Frijoles bien molidos y suaves.", 38),
            (1, "Con aguacate", "Se le agrega aguacate fresco.", 45),
            # Variedades de Baleada con Carne (plato 3)
            (3, "Carne asada", "Carne de res a la plancha.", 70),
            (3, "Pollo a la plancha", "Pechuga de pollo sazonada.", 68),
            (3, "Chuleta de cerdo", "Chuleta jugosa en trozos.", 75),
            # Variedades de Pupusa de Queso (plato 5)
            (5, "Queso solo", "Quesillo puro derretido.", 20),
            (5, "Queso con loroco", "Quesillo con flor de loroco.", 25),
            (5, "Queso con jalapeño", "Para los que les gusta picante.", 23),
            # Variedades de Catracha Clásica (plato 9)
            (9, "Con queso seco", "Queso rallado tradicional.", 18),
            (9, "Con quesillo", "Quesillo derretido encima.", 22),
            (9, "Con chismol", "Pico de gallo hondureño fresco.", 20),
            # Variedades de Sopa de Frijoles (plato 11)
            (11, "Con costilla", "Costilla de res en el caldo.", 95),
            (11, "Con chorizo", "Chorizo criollo y verduras.", 100),
        ]
        conn.executemany(
            "INSERT INTO variedades (plato_id, nombre, descripcion, precio) VALUES (?, ?, ?, ?)",
            variedades,
        )

    # --- Promociones con nombres apetitosos ---
    if conn.execute("SELECT COUNT(*) AS n FROM promociones").fetchone()["n"] == 0:
        promociones = [
            ("Combo Catracho Feliz", "3 baleadas con carne + 2 frescos naturales.", 180, 230, 1),
            ("Martes de Pupusas Locas", "4 pupusas revueltas + curtido y café.", 95, 120, 1),
            ("Dúo Enamorado", "2 baleadas especiales + 2 horchatas para compartir.", 150, 190, 1),
            ("Almuerzo del Fogón", "Sopa de res + fresco + postre del día.", 140, 165, 1),
            ("Fin de Semana Catracho", "Parrillada familiar para 4 con bebidas.", 450, 540, 1),
        ]
        conn.executemany(
            """INSERT INTO promociones (nombre, descripcion, precio, precio_antes, activa)
               VALUES (?, ?, ?, ?, ?)""",
            promociones,
        )

    conn.commit()
    conn.close()


@app.on_event("startup")
def al_iniciar():
    crear_tablas()
    sembrar_datos()


# ---- Registramos las rutas y el CORS ----
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
