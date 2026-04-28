# DPSmart — Sistema de Departamento Pessoal

ERP interno para escritórios contábeis. Controle de folha de pagamento, INSS, FGTS, IR, CCT sindical e fluxo mensal operacional.

## Stack

- **Frontend**: React + Vite + Tailwind CSS + PWA (instalável no PC)
- **Backend**: Node.js + Express + Prisma ORM
- **Banco**: PostgreSQL (Render)
- **Deploy**: Render.com (grátis)

## Como subir no Render (1 clique)

1. Faça fork deste repositório no GitHub
2. Acesse [render.com](https://render.com) e clique em **New → Blueprint**
3. Conecte seu repositório GitHub
4. O Render lê o `render.yaml` e cria os 3 serviços automaticamente
5. Aguarde ~5 minutos — tudo estará no ar

## Desenvolvimento local

### Pré-requisitos
- Node.js 18+
- PostgreSQL local (ou use a URL do Render)

### Backend
```bash
cd backend
cp .env.example .env
# edite o .env com sua DATABASE_URL
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Usuário padrão (primeiro acesso)

Após o deploy, acesse `/setup` para criar o administrador inicial.

Ou rode no backend:
```bash
npm run seed
```
Isso cria: `admin@dpsmart.com` / senha: `Admin@123` — **troque imediatamente.**

## Estrutura do projeto

```
dpsmart/
├── render.yaml          # deploy automático no Render
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Empresas, Mensal, Sindical...
│   │   ├── components/  # Sidebar, Topbar, ChecklistCard...
│   │   ├── contexts/    # AuthContext
│   │   ├── hooks/       # useAuth, useEmpresas, useMensal
│   │   └── lib/         # api.js (axios)
│   └── vite.config.js
└── backend/
    ├── src/
    │   ├── routes/      # auth, empresas, mensal, sindical
    │   ├── controllers/ # lógica de negócio
    │   ├── middleware/  # auth JWT, permissões
    │   └── prisma/      # schema.prisma, migrations
    └── server.js
```

## Licença

Uso interno. Para licenciar como SaaS, entre em contato.
