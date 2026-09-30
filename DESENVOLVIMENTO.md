# Desenvolvimento

## Organização e execução

O trabalho foi organizado como monorepo npm com frontend React, API NestJS e pacote de contratos Zod. O fluxo atual usa Docker Compose para web, API, SQL Server e OCR local. A implementação foi feita em etapas: escopo/documentação, persistência e cadastro, autenticação e autorização, processamento de PDF/OCR, interface responsiva e verificação. O passo a passo está em [`docs/GUIA-DE-EXECUCAO.md`](docs/GUIA-DE-EXECUCAO.md).

## Controle de versão

Em 2026-09-29 foi inicializado um repositório Git local na branch `main`, a pedido do usuário, pois o diretório ainda não possuía histórico Git. As mudanças existentes foram registradas em commits separados por documentação, workspace/contratos, API, OCR, autenticação, frontend e Docker. Nenhum remoto foi configurado e nenhum repositório foi publicado. O currículo pessoal usado na validação manual não foi adicionado ao Git; somente o PDF sintético de teste faz parte dos fixtures.

## Decisões técnicas

- React, TypeScript e Vite entregam uma interface pequena e responsiva; NestJS organiza API, regras e integrações.
- Contratos Zod compartilhados mantêm obrigatoriedade e formato de e-mail iguais no browser e no servidor.
- Um contrato de persistência permite selecionar SQL Server durável por migrations ou memória descartável via `STORAGE_MODE`.
- Conta local de recrutador é criada por seeder a partir de `.env`; senha usa Argon2id e sessão usa cookie HttpOnly. Cadastro e leitura de currículo são públicos; listagem e detalhe exigem autenticação.
- PDF.js tenta camada textual; OCRmyPDF/Tesseract local em português e inglês é fallback. Isso evita enviar currículos a serviço externo. Limites e isolamento do container reduzem exposição, mas OCR não é um sandbox antimalware perfeito.
- Logs diários guardam metadados de request, banco, autenticação e OCR sem dados pessoais, conteúdo de currículo, credenciais ou payloads.
- Para performance, listas são paginadas e selecionam colunas explícitas. O painel de diagnóstico mede métricas apenas localmente.

## Uso de inteligência artificial

Foi utilizado **OpenAI Codex, modelo GPT-6**, como apoio de planejamento, implementação e revisão. Exemplos de solicitações e aproveitamento:

- “Organize o desafio em etapas com React, Node.js, SQL Server, Docker, auditoria e documentação.” A estrutura foi aproveitada após alinhar escopo e tecnologias com o pedido.
- “Implemente cadastro anônimo e proteja lista e detalhes para recrutadores autenticados; permita alternar memória e SQL por `.env`.” A resposta virou guard de API e rotas React, contrato de persistência e seeder; ajustes foram feitos para não revelar detalhe a usuários anônimos.
- “Adicione OCR local gratuito para currículos escaneados, com limites e sem incluir dados pessoais nos logs.” A abordagem PDF.js + OCRmyPDF/Tesseract foi revisada com documentação oficial; OCR em nuvem foi descartado. Foram adicionados limites de tamanho/páginas/tempo/concorrência, temporários e container interno restrito.
- “Atualize README, DESENVOLVIMENTO e documentos de arquitetura em português.” O texto foi reescrito para refletir a implementação e explicitar riscos, limitações e instruções de execução.

As respostas foram tratadas como sugestões. Dependências, código e documentação foram inspecionados; testes e auditoria são usados para confirmar o comportamento. Durante a primeira inicialização real da API, foi corrigido o registro de `OcrCurriculoClient` como provider de `CandidatosModule`, falha que não aparecia na compilação TypeScript. A decisão anterior de não ter autenticação/OCR foi substituída pela RDA 0002 após o novo escopo.

## Verificação

As verificações incluem testes unitários e HTTP, typecheck, build, auditoria npm, fluxo Docker/SQL Server e inspeção visual em larguras móveis e desktop. Cada item abaixo reflete a saída observada nesta execução.

### Resultado observado

- Testes de contratos: **3 aprovados**.
- Testes unitários da API: **15 aprovados**, cobrindo regras, sessão, OCR e auditoria sem PII.
- Testes HTTP/e2e da API: **10 aprovados**, incluindo login, rotas protegidas, cadastro público, PDF inválido e upload acima de 5 MB.
- Testes de interface: **8 aprovados**, incluindo cadastro anônimo, correção de sugestões e marcador obrigatório junto ao label.
- `npm run typecheck`: **concluído** nos três workspaces.
- `npm run build`: **concluído** nos três workspaces; imagens Docker de API, web e OCR também foram construídas.
- `npm run audit`: **0 vulnerabilidades**.
- Serviço OCR no contêiner oficial `v17.12.1`: **3 testes aprovados**, incluindo extração de nome e e-mail de PDF escaneado sintético, PDF inválido e healthcheck.
- Compose de demonstração com override local: **iniciado** com web, API, SQL Server e OCR saudáveis. `GET /api/health` e a rota web `/candidatos/novo` responderam com HTTP 200; a tela foi conferida visualmente no navegador. O override remove `no-new-privileges` somente da API e OCR; mantém as demais restrições e não deve ser usado em produção. O arquivo base conserva essa proteção.
- Validação manual posterior com um currículo real fornecido pelo usuário: nome identificado; e-mail não sugerido; número com aparência de ano interpretado como telefone. Esse caso evidencia um falso positivo da heurística atual e será tratado como próximo ajuste. O PDF e os dados pessoais não foram copiados para o projeto, fixtures ou logs.
- O host SQL local já usa a porta 1433; este projeto publica SQL Server em `SQL_PORT=1434`.
- Teste visual sistemático nos tamanhos 320, 375, 768 e desktop, persistência SQL após reinício e fluxo completo de cadastro/lista/detalhe: **não concluídos** nesta verificação.

## Tempo, dificuldades, limitações e melhorias

- Tempo aproximado: a rodada inicial foi estimada em cerca de 2 horas, sem cronômetro dedicado. O acompanhamento posterior não foi cronometrado e ainda não está somado; é uma aproximação, não uma medição automática.
- Dificuldades: o host tem Node.js 20, abaixo do runtime fixado pelo projeto; Vitest falha no binding opcional de Rolldown nesse host. Os comandos precisam rodar na imagem Node 24 usada no Docker.
- Limitações atuais: heurísticas de extração não garantem precisão; OCR manuscrito e PDFs degradados podem falhar. A autenticação não inclui MFA, recuperação de senha, gestão de contas ou papéis. O modo memória não persiste.
- Melhorias futuras: fluxo administrativo de troca/recuperação de senha, MFA/SSO para implantação, política de retenção dos dados de candidatos, testes adicionais com PDFs diversos, filtros de listagem e benchmark com volume representativo.
