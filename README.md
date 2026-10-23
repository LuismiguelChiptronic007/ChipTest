# ChipTest

Sistema web da Chiptronic para cadastro de códigos de veículos e acompanhamento de testes.

## Estrutura

- `frontend/`: aplicação Nuxt 3 e rotas de API Nitro, executadas como Cloudflare Worker.
- `backend/`: serviços e regras de negócio TypeScript compartilhadas pelas rotas.
- `database/migrations/`: migrations SQL compatíveis com SQLite/D1.

## Build na Vercel

O `frontend/nuxt.config.ts` seleciona o preset Nitro `vercel` quando a variável `VERCEL=1` está presente (definida automaticamente pela Vercel). Assim, `nuxt build` gera a saída de funções da Vercel em vez de uma saída Cloudflare que não contém a pasta estática `dist`. No projeto Vercel, use **Framework Preset: Nuxt.js**, **Root Directory: `frontend`**, comando de build `npm run build` e deixe **Output Directory** vazio/automático; não configure `dist`.

Na Vercel, o servidor acessa o mesmo D1 remoto pela API oficial do Cloudflare. Configure, no projeto Vercel, as variáveis de ambiente `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID` e `CLOUDFLARE_API_TOKEN`, além de `SESSION_SECRET` (mínimo de 32 caracteres), `APP_URL` com a URL pública da Vercel e `EMAIL_FROM`. `RESEND_API_KEY` é necessária para habilitar redefinição de senha. Crie um API Token Cloudflare com permissões D1 Read e D1 Write, restrinja-o à conta e ao banco sempre que a interface permitir, e armazene-o somente como variável secreta na Vercel; nunca o coloque no código ou no cliente. No Cloudflare Worker, a aplicação continua usando o binding D1 diretamente.

O adaptador Vercel usa a API `POST /accounts/{account_id}/d1/database/{database_id}/query`, enviando instruções preparadas e lotes; assim, não requer migrar o banco nem duplicar os dados. Se as variáveis do banco estiverem ausentes, as rotas retornam uma mensagem 503 indicando quais configurações faltam.

## Requisitos

- Node.js 20 ou superior e npm.
- Conta Cloudflare e Wrangler autenticado (`npx wrangler login`) para provisionar recursos remotos.
- Conta Resend e domínio/endereço verificado para enviar e-mails de redefinição de senha.

## Desenvolvimento local

1. Instale as dependências:

   ```powershell
   Set-Location backend
   npm install
   Set-Location ..\frontend
   npm install
   ```

2. Configure os valores secretos locais:

   ```powershell
   Copy-Item .dev.vars.example .dev.vars
   ```

   Defina `SESSION_SECRET` com uma string aleatória de pelo menos 32 caracteres. Configure `RESEND_API_KEY` para habilitar o envio de redefinição de senha. `.dev.vars` não deve ser versionado.

3. Aplique a migration no D1 local e inicie o Nuxt:

   ```powershell
   npm run db:local:migrate
   npm run dev
   ```

   A configuração do Worker e do binding D1 está em `frontend/wrangler.jsonc`. O servidor Nuxt de desenvolvimento carrega esse arquivo por meio de `nitro-cloudflare-dev`.

## D1 remoto e publicação

O arquivo Wrangler usa o nome `chiptest-db`, separado de outros bancos da conta. Crie esse banco remoto e copie o `database_id` exibido para `frontend/wrangler.jsonc`:

```powershell
Set-Location frontend
npx wrangler d1 create chiptest-db
```

Depois aplique as migrations:

```powershell
npm run db:remote:migrate
```

Configure `SESSION_SECRET` e `RESEND_API_KEY` como secrets do Worker (não em `vars` nem em arquivos versionados):

```powershell
npx wrangler secret put SESSION_SECRET --config wrangler.jsonc
npx wrangler secret put RESEND_API_KEY --config wrangler.jsonc
```

Antes de publicar, atualize `APP_URL` em `wrangler.jsonc` para o domínio público da aplicação; em produção, não mantenha `http://localhost:3000`.

Gere os tipos do Worker, valide e publique:

```powershell
npx wrangler types
npm run typecheck
npm run build
npx wrangler deploy --config wrangler.jsonc
```

## Primeiro administrador

O cadastro público sempre cria usuários com papel `campo` e `ativo = 0`. Para promover a primeira conta, cadastre-a normalmente e execute no console D1 o comando abaixo, substituindo o e-mail:

```sql
UPDATE usuarios
SET papel = 'admin', ativo = 1, atualizado_em = datetime('now')
WHERE email = 'admin@chiptronic.com.br';
```

O usuário poderá entrar e administrar os demais perfis pela tela `/admin/usuarios`. A autorização é feita nas rotas Nitro após validar a sessão e consultar o estado atual do usuário no D1; D1 não oferece RLS.

## Autenticação e e-mail

- As sessões usam cookie `HttpOnly`, `SameSite=Lax`, duração limitada e token assinado com `SESSION_SECRET`.
- Senhas são armazenadas com PBKDF2 e salt individual.
- Usuários inativos só podem aguardar a liberação do administrador.
- A redefinição de senha depende de `RESEND_API_KEY` e dos dados `APP_URL`/`EMAIL_FROM` em `wrangler.jsonc`.

## Banco de dados

O projeto usa Cloudflare D1 (SQLite), não Supabase/PostgreSQL. As rotas Nitro validam a sessão e o papel atual do usuário no banco antes de permitir operações. D1 não oferece RLS; portanto, o controle equivalente é aplicado no servidor:

- Todos os perfis ativos autenticados podem consultar os códigos.
- Admin e engenharia podem criar, editar, duplicar e excluir logicamente.
- Bancada e campo têm acesso de leitura.

Para aplicar todas as migrations no banco local, execute `npm run db:local:migrate` dentro de `frontend/`. O comando `npm run db:remote:migrate` altera o banco remoto e deve ser usado somente quando você decidir publicar as mudanças.

## Importação de documentos Word

A rota `/importacoes/nova` analisa arquivos `.docx` de até 10 MB e importa somente os nomes dos títulos nível 2 (`Heading 2`) sob cada seção nível 1 (`Heading 1`). Os nomes são classificados em “Original” e “Português” pelo separador `/DieselDiag:`. Seções não reconhecidas podem ser atribuídas manualmente; seções relacionadas a falhas são marcadas automaticamente como fora do escopo. Conteúdo normal abaixo dos títulos é ignorado.

Os itens ativos são armazenados em `codigo_itens` no D1. Na reimportação, o sistema compara por seção, nome completo e ocorrência; itens removidos passam para `ativo = 0`, sem apagar o registro. A confirmação registra o nome do arquivo e o resumo (novos, removidos, inalterados e seções ignoradas), mas **não armazena o DOCX original**. A migration `0004_codigo_itens_por_secao.sql` divide os tipos anteriores `sensores_estados` em `sensores` e `estados`, preservando “falhas” para uma importação futura; `0006_importacoes_sem_arquivo.sql` torna opcional a antiga chave de arquivo.

Admin e engenharia podem analisar e confirmar importações. Outros perfis ativos podem consultar o histórico de metadados e itens importados. Como o sistema usa D1, não há RLS do Supabase: as permissões são verificadas nas rotas de servidor.

Para validar o parser e a conversão real do documento de exemplo:

```powershell
Set-Location frontend
npm test
npm run db:local:migrate
npm run dev
```

Após entrar com um usuário admin ou de engenharia, abra `/importacoes/nova` e envie [`docs/exemplo-importacao.docx`](./docs/exemplo-importacao.docx). O exemplo contém seções independentes para sensores e estados, títulos nível 2 para os itens e um título de falhas exibido fora do escopo. Reimporte no mesmo código para conferir os itens novos, removidos e inalterados. Itens removidos ficam inativos e podem ser consultados no resumo da importação.

Somente texto de títulos nível 2 é importado. Parágrafos, listas, tabelas, negrito, itálico e outros conteúdos abaixo dos títulos são deliberadamente ignorados; imagens, caixas de texto, formas, SmartArt e elementos flutuantes também não são interpretados como itens.

## Catálogo e painel

A Fase 3 inclui lista paginada com busca, filtros por marca/status/setor, ordenação, sincronização pela URL, seleção em lote, exportação CSV, alternância tabela/cards e exclusão lógica com histórico. O detalhe do código exibe as seções técnicas, os itens ativos por seção, o histórico de alterações e os estados vazios de testes/importação. O painel busca métricas, distribuição de status e cadastros recentes diretamente do D1.

O filtro por setor considera o setor do usuário que cadastrou o código, pois o modelo atual não possui um setor próprio no registro do veículo.

### Dados locais de demonstração

Depois de aplicar as migrations localmente, gere 30 códigos fictícios para testar lista, painel e checklist:

```powershell
Set-Location frontend
npm run seed
```

Os registros usam identificadores e códigos `CT-DEMO-*`, são marcados em `codigos_demo_seed` e inseridos apenas no D1 local. Para ocultar esses registros do catálogo sem tocar nos demais cadastros:

```powershell
npm run seed:clear
```

O seed é idempotente: executar `npm run seed` novamente restaura/atualiza os mesmos registros de demonstração. `CT-DEMO-001` recebe dez itens de checklist distribuídos nos grupos técnicos, inclusive dois itens de sensor com o mesmo nome para testar snapshots independentes.

## Testes por item

A migration `0005_testes_por_item.sql` atualiza o modelo legado sem remover os testes existentes, adiciona os campos de veículo e início/fim, aceita cancelamento e armazena um snapshot por item em `teste_itens`. Itens repetidos permanecem independentes. O checklist é criado em lote a partir dos itens ativos no momento da abertura; reimportações posteriores não alteram execuções existentes.

Com um usuário ativo, abra `/codigos`, selecione `CT-DEMO-001` e use **Novo teste**. Crie uma execução de bancada, marque alguns itens aprovados e um reprovado (preenchendo a observação obrigatória), finalize com status reprovado e depois inicie o primeiro teste de campo. Na execução de campo, aprove o item anteriormente reprovado e finalize. O detalhe do código mostra a linha do tempo, o comparativo bancada/campo e os últimos resultados por item. `/testes` lista execuções em andamento e finalizadas.

O perfil bancada só pode iniciar/editar testes de bancada; campo só pode iniciar/editar testes de campo. Engenharia e admin podem trabalhar nos dois tipos. Todos os perfis ativos podem consultar os testes. Como o banco é Cloudflare D1, não existe RLS: as permissões são verificadas nas rotas Nitro; alterações administrativas em testes finalizados são registradas em `historico_alteracoes`.

Para validar o código localmente:

```powershell
Set-Location frontend
npm run db:local:migrate
npm run seed
npm test
npm run typecheck
npm run build
```

## Design system

Abra `/design-system` para visualizar os tokens, componentes de interface, estados e prévias dos temas claro e escuro. A interface usa Inter, JetBrains Mono e ícones Lucide; as cores semânticas e neutras estão centralizadas em `frontend/assets/css/main.css` e expostas como tokens Tailwind.

O tema padrão é Âmbar industrial escuro, com preferência inicial sincronizada ao sistema operacional. A marca oficial fica em `frontend/components/BrandLogo.vue` e `frontend/public/brand/`; a assinatura clara é usada em fundo claro, e a escura em superfícies escuras. O favicon está em `frontend/public/favicon.svg`. E-mails de redefinição e páginas impressas usam a assinatura apropriada para fundo claro.

As telas de autenticação compartilham o layout responsivo `AuthLayout`. As áreas autenticadas usam `AppShell`, com navegação adaptável, alternância de tema, busca global pelo atalho `Ctrl+K` e menu da conta. O painel apresenta dados reais do catálogo e dos testes D1. A integração de abertura de ocorrências a partir de um item reprovado será concluída na Fase 6.
