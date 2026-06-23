FROM node:20-alpine

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala apenas dependências de produção para otimização
RUN npm install --only=production

# Copia o código da aplicação
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
