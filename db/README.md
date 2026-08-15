# Base `missgarabatos` (mismo Postgres que Cuthis)

El front de Plantillas **sigue usando localStorage** hasta que exista una API.
Estos scripts dejan lista la segunda base. **En Render** la API de Cuthis la crea sola al arrancar (ver `MissGarabatosDatabaseBootstrap` en CuthisV1).

Al hacer deploy de `cuthis-api`, en el log debe aparecer `[startup] Miss Garabatos database ensured.`
Si el usuario de Postgres no tiene permiso `CREATEDB`, Cuthis igual arranca y verás un `[WARN]`; entonces créala una vez a mano y el siguiente deploy solo aplicará las tablas.

Connection string: igual que Cuthis, cambiando solo el nombre de la base:

`Host=...;Port=5432;Database=missgarabatos;Username=...;Password=...`

En URL de Render: el path final `.../cuthis` pasa a `.../missgarabatos`.

---

## 1. Postgres local

1. Abre `psql` como el usuario que ya usa Cuthis (suele ser `postgres`).
2. Crea la base (una sola vez):

```bash
psql -h localhost -U postgres -d postgres -f db/00_create_database.sql
```

Si sale `already exists`, está bien: la base ya estaba.

3. Tablas dentro de `missgarabatos`:

```bash
psql -h localhost -U postgres -d missgarabatos -f db/01_schema.sql
```

4. Comprueba:

```bash
psql -h localhost -U postgres -d missgarabatos -c "\dt"
```

Debes ver `teachers` y `teacher_configs`. `\l` debe listar `cuthis` y `missgarabatos`.

---

## 2. Render (mismo servicio Postgres)

1. Dashboard → tu Postgres de Cuthis → **Connect** / **PSQL Command**.
2. Pega el comando en la terminal (conecta a la instancia; a veces entra a `cuthis`).
3. Crea la segunda base:

```sql
CREATE DATABASE missgarabatos;
```

4. Conéctate a ella. En `psql`:

```sql
\c missgarabatos
```

O cierra y vuelve a abrir PSQL cambiando el último segmento de la URL a `/missgarabatos`.

5. Pega el contenido de `01_schema.sql` y ejecútalo.

6. En Render **no** hace falta otro Postgres ni otro plan. Cuando exista la API de Plantillas, usa Internal Database URL con `.../missgarabatos`.

---

## 3. Qué cubre hoy vs qué falta

| Hoy en el navegador | Columna `config_key` |
|---------------------|----------------------|
| Catálogo ajustado | `catalogoFase2` |
| Niveles L/E/P/RA | `nivelesDesempeno` |
| Borrador de evidencias | `evidencias_borrador` |

Planeación no persiste nada aún (solo genera archivos).

**Falta (siguiente etapa):** API (puede vivir en el mismo Web Service de Cuthis) que lea/escriba estas tablas, login, y que el front deje de depender solo de localStorage.

No subas contraseñas al git. Local: User Secrets o `appsettings.Development.json` (ignorado). Render: Environment variable `ConnectionStrings__MissGarabatos`.
