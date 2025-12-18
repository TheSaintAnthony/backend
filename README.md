# St. Anthony - Backend API

Este é o backend da aplicação St. Anthony, construído com NestJS, TypeScript e PostgreSQL.

## Requisitos do Sistema

Antes de iniciar a instalação, certifique-se de que o servidor possui os seguintes requisitos:

- **Node.js**: versão 18.x ou superior
- **npm** ou **yarn**: gestor de pacotes (recomendado yarn)
- **PostgreSQL**: versão 14 ou superior
- **Redis**: versão 6 ou superior
- **Git**: para clonar o repositório

### Verificação dos Requisitos

Execute os seguintes comandos para verificar se os requisitos estão instalados:

```bash
node --version
npm --version  # ou yarn --version
psql --version
redis-cli --version
git --version
```

## Instalação

### 1. Clonar o Repositório

Se ainda não tiver o código no servidor, clone o repositório:

```bash
git clone <url-do-repositório>
cd st-anthony
```

### 2. Instalar Dependências

Instale todas as dependências do projeto:

```bash
yarn install
```

ou, se preferir usar npm:

```bash
npm install
```

### 3. Configuração da Base de Dados PostgreSQL

Certifique-se de que o PostgreSQL está instalado e em execução. Crie uma base de dados para a aplicação:

```bash
# Aceder ao PostgreSQL
sudo -u postgres psql

# Criar a base de dados
CREATE DATABASE stanthony;

# Criar um utilizador (opcional, se não usar o utilizador padrão)
CREATE USER stanthony WITH PASSWORD 'sua_password_segura';
GRANT ALL PRIVILEGES ON DATABASE stanthony TO stanthony;

# Sair do PostgreSQL
\q
```

### 4. Configuração do Redis

Certifique-se de que o Redis está instalado e em execução. Se necessário, configure uma palavra-passe para o Redis:

```bash
# Editar o ficheiro de configuração do Redis (geralmente em /etc/redis/redis.conf)
# Adicionar ou descomentar:
# requirepass sua_password_redis
```

Reinicie o serviço Redis:

```bash
sudo systemctl restart redis
# ou
sudo service redis restart
```

### 5. Configuração das Variáveis de Ambiente

**Em Produção (Recomendado)**: Use variáveis de ambiente do sistema. Configure-as antes de executar a aplicação:

```bash
# Base de Dados
export DATABASE_URL=postgresql://utilizador:password@localhost:5432/stanthony

# Redis
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=sua_password_redis

# JWT
export JWT_SECRET=seu_jwt_secret_muito_seguro_e_aleatorio

# Stripe
export STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_stripe
export STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_stripe

# Aplicação
export PORT=3000
export FRONTEND_URL=https://seu-dominio-frontend.com
export IMAGES_PATH=/caminho/para/pasta/de/imagens

# Email (opcional, se usar servidor SMTP externo)
export MAIL_HOST=smtp.exemplo.com
export MAIL_PORT=587
```

Para tornar estas variáveis permanentes, adicione-as ao ficheiro de perfil do shell (por exemplo, `~/.bashrc` ou `~/.zshrc`):

```bash
echo 'export DATABASE_URL=postgresql://utilizador:password@localhost:5432/stanthony' >> ~/.bashrc
echo 'export REDIS_HOST=localhost' >> ~/.bashrc
echo 'export REDIS_PORT=6379' >> ~/.bashrc
echo 'export REDIS_PASSWORD=sua_password_redis' >> ~/.bashrc
echo 'export JWT_SECRET=seu_jwt_secret_muito_seguro_e_aleatorio' >> ~/.bashrc
echo 'export STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_stripe' >> ~/.bashrc
echo 'export STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_stripe' >> ~/.bashrc
echo 'export PORT=3000' >> ~/.bashrc
echo 'export FRONTEND_URL=https://seu-dominio-frontend.com' >> ~/.bashrc
echo 'export IMAGES_PATH=/caminho/para/pasta/de/imagens' >> ~/.bashrc
source ~/.bashrc
```

**Em Desenvolvimento (Opcional)**: Pode usar um ficheiro `.env` na raiz do projeto:

```env
# Base de Dados
DATABASE_URL=postgresql://utilizador:password@localhost:5432/stanthony

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua_password_redis

# JWT
JWT_SECRET=seu_jwt_secret_muito_seguro_e_aleatorio

# Stripe
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta_stripe
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_stripe

# Aplicação
PORT=3000
FRONTEND_URL=http://localhost:4200
IMAGES_PATH=./uploads

# Email (opcional)
MAIL_HOST=localhost
MAIL_PORT=1025
```

**Importante**: 
- Substitua todos os valores pelos valores reais do seu ambiente
- O `JWT_SECRET` deve ser uma string aleatória e segura (pode gerar com: `openssl rand -base64 32`)
- O `IMAGES_PATH` deve apontar para uma pasta onde as imagens serão armazenadas (certifique-se de que a pasta existe e tem permissões de escrita)
- O `FRONTEND_URL` deve ser o URL completo do frontend em produção
- **Em produção, use sempre variáveis de ambiente do sistema** em vez de ficheiros `.env` por questões de segurança e boas práticas

### 6. Executar Migrações da Base de Dados

Após configurar a base de dados e as variáveis de ambiente, execute as migrações:

```bash
yarn db:migrate
```

ou, se usar npm:

```bash
npm run db:migrate
```

Este comando irá criar todas as tabelas necessárias na base de dados.

### 7. (Opcional) Popular a Base de Dados com Dados Iniciais

Se houver dados de seed disponíveis, pode executá-los:

```bash
yarn db:seed
```

ou:

```bash
npm run db:seed
```

### 8. Compilar o Projeto

Compile o projeto TypeScript para JavaScript:

```bash
yarn build
```

ou:

```bash
npm run build
```

Este comando irá gerar a pasta `dist/` com o código compilado.

### 9. Executar em Produção

Para executar a aplicação em modo de produção:

```bash
yarn start:prod
```

ou:

```bash
npm run start:prod
```

A aplicação estará disponível na porta especificada na variável `PORT` (por padrão, porta 3000).

## Execução em Desenvolvimento

Para executar em modo de desenvolvimento (com hot-reload):

```bash
yarn start:dev
```

ou:

```bash
npm run start:dev
```

## Gestão da Base de Dados

### Gerar Novas Migrações

Se fizer alterações no schema da base de dados:

```bash
yarn db:generate
```

### Aplicar Migrações

```bash
yarn db:migrate
```

### Push Direto (Apenas para Desenvolvimento)

**Atenção**: Não use em produção. Use apenas para desenvolvimento rápido:

```bash
yarn db:push
```

### Abrir Drizzle Studio (Interface Visual)

Para visualizar e editar a base de dados através de uma interface web:

```bash
yarn db:studio
```

Aceda a `http://localhost:4983` no seu navegador.

## Configuração com Process Manager (PM2)

Para executar a aplicação em produção de forma mais robusta, recomenda-se usar um process manager como o PM2:

### Instalar PM2

```bash
npm install -g pm2
```

### Criar Ficheiro de Configuração PM2

Crie um ficheiro `ecosystem.config.js` na raiz do projeto:

```javascript
module.exports = {
  apps: [
    {
      name: 'st-anthony-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        JWT_SECRET: process.env.JWT_SECRET,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        PORT: process.env.PORT || 3000,
        FRONTEND_URL: process.env.FRONTEND_URL,
        IMAGES_PATH: process.env.IMAGES_PATH,
        MAIL_HOST: process.env.MAIL_HOST,
        MAIL_PORT: process.env.MAIL_PORT,
      },
    },
  ],
};
```

**Nota**: O PM2 irá ler as variáveis de ambiente do sistema. Certifique-se de que as exportou antes de iniciar o PM2 (ver secção 5).

### Executar com PM2

```bash
# Certifique-se de que compilou o projeto primeiro
yarn build

# Iniciar com PM2
pm2 start ecosystem.config.js
```

### Comandos Úteis do PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs st-anthony-api

# Reiniciar
pm2 restart st-anthony-api

# Parar
pm2 stop st-anthony-api

# Configurar para iniciar automaticamente no arranque do servidor
pm2 startup
pm2 save
```

## Documentação da API

Após iniciar a aplicação, a documentação Swagger estará disponível em:

```
http://localhost:3000/api
```

## Processo de Instalação Completo (Resumo)

```bash
# 1. Instalar dependências
yarn install

# 2. Configurar variáveis de ambiente do sistema
export DATABASE_URL=postgresql://utilizador:password@localhost:5432/stanthony
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=sua_password_redis
export JWT_SECRET=seu_jwt_secret_muito_seguro_e_aleatorio
export STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_stripe
export STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_stripe
export PORT=3000
export FRONTEND_URL=https://seu-dominio-frontend.com
export IMAGES_PATH=/caminho/para/pasta/de/imagens

# 3. Executar migrações
yarn db:migrate

# 4. (Opcional) Popular dados iniciais
yarn db:seed

# 5. Compilar
yarn build

# 6. Executar em produção
yarn start:prod
```

## Resolução de Problemas

### Erro de Conexão à Base de Dados

- Verifique se o PostgreSQL está em execução: `sudo systemctl status postgresql`
- Confirme que a variável `DATABASE_URL` está correta (use `echo $DATABASE_URL` para verificar)
- Verifique se a base de dados foi criada

### Erro de Conexão ao Redis

- Verifique se o Redis está em execução: `redis-cli ping`
- Confirme que as variáveis `REDIS_HOST`, `REDIS_PORT` e `REDIS_PASSWORD` estão corretas (use `env | grep REDIS` para verificar)
- Verifique se a palavra-passe corresponde à configuração do Redis

### Erro de Permissões na Pasta de Imagens

- Certifique-se de que a pasta especificada em `IMAGES_PATH` existe
- Verifique as permissões: `chmod -R 755 /caminho/para/pasta/de/imagens`

