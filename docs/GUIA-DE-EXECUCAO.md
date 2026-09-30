# Guia de execução

## Docker Compose

Pré-requisitos: Docker Engine e Docker Compose V2. Na raiz:

```bash
cp .env.example .env
```

Preencha `SQL_SA_PASSWORD`, `AUTH_BOOTSTRAP_EMAIL`, `AUTH_BOOTSTRAP_PASSWORD` (mínimo 14 caracteres) e `JWT_SECRET` (por exemplo, `openssl rand -base64 48`). Esses valores são locais e não devem ser commitados. Para HTTPS configure `COOKIE_SECURE=true`; no localhost HTTP o padrão é `false`.

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build
```

A exceção local do override está registrada na [RDA 0003](REGISTRO-DECISOES-ARQUITETURAIS/REGISTRO-DECISAO-ARQUITETURAL-0003.md). Não use `docker-compose.demo.yml` em produção.

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Saúde: `http://localhost:3000/api/health`
- Login inicial: e-mail e senha definidos no `.env`.
- SQL Server: porta interna 1433 e porta local definida por `SQL_PORT` (1433 por padrão).

O override `docker-compose.demo.yml` é exclusivo para demonstração local: retira `no-new-privileges` somente da API e OCR para contornar runtimes que rejeitam essa opção. As restrições read-only, `cap_drop`, limites de recursos e rede isolada permanecem. Para implantação, use apenas o arquivo base `docker-compose.yml`, que mantém `no-new-privileges`.

O primeiro início pode demorar enquanto SQL Server inicializa e migrations são aplicadas. Use `docker compose -f docker-compose.yml -f docker-compose.demo.yml down` para parar preservando volumes; adicione `-v` também para remover os dados e logs locais.

## Armazenamento

O padrão `STORAGE_MODE=sqlserver` preserva candidatos entre reinícios. `STORAGE_MODE=memory` usa o adapter efêmero e perde os registros quando a API reinicia. Em Docker, edite `.env` e recrie os serviços:

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build -d
```

Compose mantém o SQL Server ligado também em modo `memory`; a API, porém, não acessa o banco neste modo. `SEED_DEMO_DATA=true` carrega registros sintéticos idempotentes. Eles não representam pessoas reais.

## Execução local

Requer Node.js 24.11+, npm 11; OCR continua executado pelo container Compose. Configure `.env`, dependências e banco se o modo persistente estiver ativo:

```bash
npm ci
npm run dev
```

Comandos: `npm test`, `npm run typecheck`, `npm run build`, `npm run audit`, `npm run test:cov`. A cobertura e as limitações dos testes estão detalhadas em [`ESTRATEGIA-DE-TESTES.md`](ESTRATEGIA-DE-TESTES.md).

## Migrations e seeder

Migrations são aplicadas na inicialização. `synchronize` permanece desligado. Mudanças de schema devem gerar migration revisável e não destrutiva. A migration de recrutadores adiciona tabela própria e não altera os candidatos existentes.

O seeder cria uma única conta de recrutador baseada no `.env` se o e-mail ainda não existir. Mudar a senha no `.env` não redefine hash já cadastrado; para recuperação local, implemente uma rotina administrativa segura ou recrie apenas o volume/conta de desenvolvimento.

## OCR e logs

O serviço OCR só é acessível pela rede interna do Compose. Ele aceita PDFs de até 5 MB, processa até 15 páginas e impõe timeout de 40 segundos e concorrência de duas tarefas. PDF.js atende PDFs com texto; OCRmyPDF/Tesseract (`por+eng`) é fallback para digitalizados. Um erro é recuperável: use o formulário manual. O OCR não lê manuscritos de forma confiável e não promete precisão universal.

Compose monta logs em volume; em ambiente local `LOG_DIRECTORY` escolhe o diretório. Arquivos `auditoria-AAAA-MM-DD.jsonl` usam UTC e retenção configurável em `LOG_RETENTION_DAYS` (30 dias). Conteúdo de currículo e dados pessoais não são registrados.

## Resolução de problemas

- **Conta inicial ausente:** confira e-mail e senha no `.env` e logs de inicialização; as variáveis não são exibidas nos logs.
- **SQL indisponível:** veja `docker compose ps` e `docker compose logs banco api`.
- **OCR indisponível:** confira `docker compose ps ocr` e `docker compose logs ocr`; o cadastro manual permanece funcional.
- **Portas ocupadas:** altere `API_PORT`, `WEB_PORT` ou `SQL_PORT` no `.env`; mantenha `CORS_ORIGIN` alinhada. A comunicação interna da API com o SQL continua na porta 1433.
- **Auditoria de dependências:** execute `npm run audit`, corrija vulnerabilidades aplicáveis e registre as exceções justificadas.
