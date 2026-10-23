# Diagrama Entidad-Relación (DER) — El Fogón

Base de datos del restaurante de comida catracha **El Fogón**.

## Entidades y atributos

### usuarios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id (PK) | INTEGER | Identificador único |
| nombre | TEXT | Nombre del empleado |
| usuario | TEXT (único) | Nombre de acceso |
| password_hash | TEXT | Contraseña encriptada (bcrypt) |
| rol | TEXT | `jefe`, `mesero` o `recepcionista` |

### categorias
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id (PK) | INTEGER | Identificador único |
| nombre | TEXT | Ej: "Baleadas" |
| slug | TEXT (único) | Ej: "baleadas" |

### platos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id (PK) | INTEGER | Identificador único |
| nombre | TEXT | Nombre del platillo |
| descripcion | TEXT | Descripción corta |
| precio | REAL | Precio en lempiras |
| categoria_id (FK) | INTEGER | → categorias.id |
| imagen | TEXT | Ruta de la foto |
| destacado | INTEGER | 1 = plato de la casa |

### variedades
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id (PK) | INTEGER | Identificador único |
| plato_id (FK) | INTEGER | → platos.id |
| nombre | TEXT | Ej: "Con carne" |
| descripcion | TEXT | Detalle |
| precio | REAL | Precio de la variedad |

### promociones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id (PK) | INTEGER | Identificador único |
| nombre | TEXT | Nombre apetitoso |
| descripcion | TEXT | Qué incluye |
| precio | REAL | Precio con oferta |
| precio_antes | REAL | Precio anterior |
| activa | INTEGER | 1 = se muestra |

### reservas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id (PK) | INTEGER | Identificador único |
| nombre | TEXT | Cliente |
| telefono | TEXT | Contacto |
| personas | INTEGER | Cantidad |
| fecha | TEXT | Día |
| hora | TEXT | Hora |
| notas | TEXT | Comentarios |
| creado_en | TEXT | Fecha de registro |

## Relaciones

- **categorias (1) ──< (N) platos**: una categoría tiene muchos platos; cada plato pertenece a una categoría.
- **platos (1) ──< (N) variedades**: un plato tiene muchas variedades; cada variedad pertenece a un plato.
- **usuarios**, **promociones** y **reservas** son entidades independientes.

## Diagrama (texto)

```
┌──────────────┐        ┌──────────────┐        ┌───────────────┐
│  categorias  │ 1    N │    platos    │ 1    N │   variedades  │
│──────────────│───────<│──────────────│───────<│───────────────│
│ id (PK)      │        │ id (PK)      │        │ id (PK)       │
│ nombre       │        │ nombre       │        │ plato_id (FK) │
│ slug         │        │ precio       │        │ nombre        │
└──────────────┘        │ categoria_id │        │ precio        │
                        │ (FK)         │        └───────────────┘
                        └──────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   usuarios   │   │ promociones  │   │   reservas   │
│──────────────│   │──────────────│   │──────────────│
│ id (PK)      │   │ id (PK)      │   │ id (PK)      │
│ usuario      │   │ nombre       │   │ nombre       │
│ password_hash│   │ precio       │   │ fecha/hora   │
│ rol          │   │ activa       │   │ personas     │
└──────────────┘   └──────────────┘   └──────────────┘
```
