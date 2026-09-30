# Talento — cadastro de candidatos

Aplicação demonstrativa para cadastro público de candidatos por formulário ou currículo PDF. Recrutadores autenticados podem consultar a lista e os detalhes. O cadastro, inclusive sem login, sempre passa pelas mesmas validações no frontend e na API.

> A aplicação não possui cadastro público de recrutadores. Use somente em ambiente local ou controlado; antes de publicar, configure HTTPS, segredos e controles operacionais adequados.

## Tecnologias e versões

| Camada | Tecnologia | Versão fixada |
|---|---|---:|
| Runtime | Node.js LTS | 24.11 ou superior, `<25` |
| Frontend | React + TypeScript | React 19.3.0 |
| Ferramenta frontend | Vite | 8.3.1 |
| Backend | NestJS | 12.1.1 |
| ORM | TypeORM | 1.1.1 |
| Banco | Microsoft SQL Server | 2022 Developer no Docker |
| Extração de texto | PDF.js | 6.3.289 |
| OCR local | OCRmyPDF + Tesseract | OCRmyPDF 17.12.1; idiomas `por+eng` |
| Senhas | Argon2id | argon2 0.45.1 |
| Sessões | JWT em cookie HttpOnly | jose 6.2.12 |
| Contratos | Zod | 4.6.5 |
| Linguagem | TypeScript | 5.9.3 |

As versões npm estão fixadas no `package-lock.json`. O runtime é Node 24 LTS. OCRmyPDF e Tesseract executam localmente em um contêiner isolado; currículos não são enviados a terceiros.

## Início rápido com Docker

1. Copie `.env.example` para `.env`.
2. Preencha segredos e credenciais locais. Gere um segredo JWT com `openssl rand -base64 48` e defina senha forte para SQL Server e para o recrutador inicial. Não reutilize estes valores em produção.
3. Inicie os serviços:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build
   ```

4. Acesse [http://localhost:5173](http://localhost:5173). O endpoint de saúde da API fica em [http://localhost:3000/api/health](http://localhost:3000/api/health).

O login inicial é criado pelo seeder com `AUTH_BOOTSTRAP_EMAIL` e `AUTH_BOOTSTRAP_PASSWORD`. Não há credenciais demonstrativas no repositório nem tela de criação de recrutador. A sessão dura oito horas e usa cookie `HttpOnly`; em produção configure HTTPS e `COOKIE_SECURE=true`.

O arquivo `docker-compose.demo.yml` remove `no-new-privileges` somente dos contêineres da API e OCR para compatibilidade com alguns runtimes locais. Ele mantém as demais restrições e é exclusivo para demonstração local. Não use esse override em produção; o arquivo base mantém a proteção.

Para encerrar preservando dados: `docker compose -f docker-compose.yml -f docker-compose.demo.yml down`. Para remover também volumes locais: `docker compose -f docker-compose.yml -f docker-compose.demo.yml down -v`.

## Modo de armazenamento

`STORAGE_MODE=sqlserver` é o padrão e mantém os candidatos entre reinícios, usando migrations não destrutivas e `synchronize` desativado. `STORAGE_MODE=memory` seleciona o adaptador temporário em memória; os dados somem ao reiniciar a API. Ambos expõem as mesmas operações. Reinicie os serviços após mudar `.env`:

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build -d
```

No Compose, SQL Server também é iniciado para ambos os modos; no modo `memory`, a API não consulta nem altera o banco. Para cadastrar candidatos sintéticos, defina `SEED_DEMO_DATA=true`; os dados usam endereços `.example.test` e são inseridos apenas se ainda não existirem.

## Desenvolvimento local

Requer Node.js 24.11+, npm 11, Docker (OCR) e SQL Server se usar o modo persistente. Para modo em memória, configure `STORAGE_MODE=memory`; execute:

```bash
npm ci
npm run dev
```

Comandos disponíveis: `npm test`, `npm run typecheck`, `npm run build`, `npm run audit` e `npm run test:cov`.

## Acesso e API

| Método e caminho | Acesso | Uso |
|---|---|---|
| `POST /api/auth/login` | Público | Autentica recrutador local e abre sessão |
| `POST /api/auth/logout` | Público | Encerra a sessão |
| `GET /api/auth/sessao` | Cookie de sessão | Consulta sessão atual |
| `POST /api/candidatos/extrair-curriculo` | Público | Extrai sugestões de currículo PDF de até 5 MB |
| `POST /api/candidatos` | Público | Cria candidato com dados validados |
| `GET /api/candidatos?pagina=1&limite=20` | Recrutador | Lista dados paginados |
| `GET /api/candidatos/:id` | Recrutador | Consulta detalhe por UUID |
| `GET /api/health` | Público | Verifica inicialização da API |

O backend protege lista e detalhe mesmo que alguém invoque a API diretamente. A criação não revela a tela de detalhe ao usuário anônimo: mostra confirmação e oferece o login.

## Leitura de currículo

O backend tenta extrair a camada de texto com PDF.js. Se o documento é digitalizado ou não tem texto suficiente, envia o arquivo ao serviço OCR local com OCRmyPDF/Tesseract em português e inglês. Há limites de arquivo, páginas, texto, duração e concorrência; arquivos temporários são apagados e o documento original não é persistido. A extração é heurística, não usa OCR de nuvem e pode falhar em PDFs protegidos, danificados, com baixa qualidade, rotação/layout incomum ou fontes manuscritas. Um teste manual com currículo real identificou o nome, mas não o e-mail e interpretou um número de ano como telefone; confirme e corrija os campos sugeridos antes de salvar. O documento real não faz parte do repositório.

OCRmyPDF declara que não foi projetado para proteger sozinho contra arquivos maliciosos. Por isso, o serviço é isolado em contêiner com limites de recursos, filesystem somente leitura, diretório temporário limitado e sem porta publicada ao host. Consulte [segurança do OCRmyPDF](https://ocrmypdf.readthedocs.io/en/latest/pdfsecurity.html) e [documentação do Tesseract](https://tesseract-ocr.github.io/tessdoc/).

## Segurança, auditoria e desempenho

- Senhas com Argon2id; acesso inicial exclusivamente via variáveis secretas do seeder; login limitado por tentativas.
- Cookie `HttpOnly`, `SameSite=Lax`, escopo `/api` e atributo `Secure` configurável.
- CORS restrito, Helmet, limites de upload e rate limit. Sem criação pública de contas.
- Logs diários JSONL em UTC com request ID, caminho, estado, duração, fingerprint/tempo/resultado das consultas e eventos de OCR/login. Não gravam corpo, currículo, texto extraído, credenciais ou dados pessoais. Retenção padrão de 30 dias (`LOG_RETENTION_DAYS`).
- O painel de diagnóstico local mede duração de requests, Web Vitals e React Profiler somente no browser de desenvolvimento; não envia métricas a terceiros.
- A listagem pagina e seleciona apenas colunas necessárias; os detalhes usam busca direta, sem carregamento preguiçoso por linha.

## Documentação e auditoria de dependências

O escopo, arquitetura, guia de execução, DER e decisões estão em [`docs/`](docs/). O histórico de desenvolvimento real e uso de IA consta em [`DESENVOLVIMENTO.md`](DESENVOLVIMENTO.md).

As decisões arquiteturais estão registradas em [`docs/REGISTRO-DECISOES-ARQUITETURAIS/`](docs/REGISTRO-DECISOES-ARQUITETURAIS/), incluindo a exceção do Compose para demonstração local. O repositório permanece local e não possui publicação remota configurada.

Execute `npm run audit` após instalar dependências e antes de entregar. Resultado observado durante esta implementação: auditoria npm sem vulnerabilidades de alta severidade; confirme novamente no ambiente de entrega porque o advisory database muda.
