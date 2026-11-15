# Norman Digital Solutions

Portafolio y sitio de asesorías académicas y tecnológicas, con formulario de contacto y panel de administración.

## Ejecutar localmente

Requiere Node.js 18 o posterior.

```powershell
npm install
$env:ADMIN_USERNAME = "tu_usuario"
$env:ADMIN_PASSWORD = "una_contrasena_de_12_caracteres_o_mas"
$env:SESSION_SECRET = "un_secreto_aleatorio_de_32_caracteres_o_mas"
npm start
```

Puedes generar un secreto para `SESSION_SECRET` con:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Luego abre:

- Sitio: http://localhost:3000
- Panel de administración: http://localhost:3000/admin

No hay credenciales administrativas predeterminadas. Configura las variables de entorno antes de iniciar el servidor; en producción, el servidor no arranca si faltan o no cumplen los requisitos.

## Despliegue en Render

1. Sube el repositorio a GitHub.
2. En Render, crea un Web Service y selecciona el repositorio.
3. Usa `npm install` como Build Command y `npm start` como Start Command.
4. Configura `NODE_ENV=production`.
5. Añade en Render, como variables secretas:
   - `SESSION_SECRET`: secreto aleatorio de al menos 32 caracteres.
   - `ADMIN_USERNAME`: nombre de usuario administrativo.
   - `ADMIN_PASSWORD`: contraseña única de al menos 12 caracteres.

No publiques archivos `.env` ni `data.json`; ambos están excluidos por `.gitignore`.
