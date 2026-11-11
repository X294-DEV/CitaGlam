# Usamos la imagen oficial de Dev Containers para Node.js 20
FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Instalación de CLIs Globales necesarias para el Monorepo
RUN npm install -g @nestjs/cli @angular/cli prisma pnpm

# Aseguramos permisos para el usuario node
USER node
WORKDIR /workspaces/cgbg
