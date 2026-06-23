# Estágio 1: Construção
FROM node:20-alpine AS build

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o código fonte
COPY . .

# Executa o build de produção (gera a pasta dist)
RUN npm run build

# Estágio 2: Servidor Web (Nginx)
FROM nginx:1.25-alpine

# Copia a build do estágio 1 para a pasta pública do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia a configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
