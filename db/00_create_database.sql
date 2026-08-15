-- Corre conectado a la base `postgres` (o a `cuthis`), como superusuario.
-- No borra ni toca las tablas de Cuthis.

SELECT 'Creando base missgarabatos (ignora el error si ya existe)' AS aviso;

CREATE DATABASE missgarabatos
  WITH OWNER = CURRENT_USER
       ENCODING = 'UTF8'
       TEMPLATE = template0;
