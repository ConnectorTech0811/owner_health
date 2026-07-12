FROM node:22-alpine

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala apenas dependências de produção para otimização
RUN npm install --omit=dev

# Copia o código da aplicação
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
