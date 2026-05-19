# Lista de Convidados PH

Site simples para captar dados de convidados de um evento e salvar no Supabase.

## Campos captados

- Nome e sobrenome
- Instagram
- Telefone
- E-mail
- CPF

## Validacoes

- O nome nao aceita numeros.
- O e-mail precisa seguir o formato `nome@dominio.com`.
- O Supabase bloqueia nomes repetidos dentro do mesmo evento.

## Criar a base no Supabase

1. Crie um novo projeto no Supabase.
2. Abra `SQL Editor`.
3. Cole e execute o conteúdo de `supabase/schema.sql`.
4. Em `Project Settings > API`, copie:
   - `Project URL`
   - `anon public key`

## Rodar localmente

Crie um arquivo `.env` na raiz usando `.env.example` como base:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-public
```

Depois rode:

```bash
npm install
npm run dev
```

## Deploy na Vercel

1. Suba este projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Cadastre as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `Settings > Environment Variables`.
4. Faça o deploy.
