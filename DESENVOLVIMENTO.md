# Desenvolvimento

## Organização e execução

O trabalho foi organizado como monorepo npm com frontend React, API NestJS e pacote de contratos Zod. O fluxo atual usa Docker Compose para web, API, SQL Server e OCR local. A implementação foi feita em etapas: escopo/documentação, persistência e cadastro, autenticação e autorização, processamento de PDF/OCR, interface responsiva e verificação. O passo a passo está em [`docs/GUIA-DE-EXECUCAO.md`](docs/GUIA-DE-EXECUCAO.md).

## Controle de versão

Em 2026-09-29 foi inicializado um repositório Git local na branch `main`, a pedido do usuário, pois o diretório ainda não possuía histórico Git. As mudanças foram registradas em commits separados por documentação, workspace/contratos, API, OCR, autenticação, frontend e Docker e publicadas na branch `main` do repositório pessoal público [github.com/jalexss/cadastro](https://github.com/jalexss/cadastro). A identidade dos commits foi configurada localmente para este projeto e conferida antes da publicação. O currículo pessoal usado na validação manual não foi adicionado ao Git; somente o PDF sintético de teste faz parte dos fixtures.

O `.gitignore` mantém arquivos de teste automatizado que fazem parte da solução, mas exclui resultados gerados, bancos locais, credenciais e documentos pessoais. O fixture PDF de OCR é explicitamente permitido porque é sintético e necessário para reproduzir o teste de leitura.

## Decisões técnicas

- React, TypeScript e Vite entregam uma interface pequena e responsiva; NestJS organiza API, regras e integrações.
- Contratos Zod compartilhados mantêm obrigatoriedade e formato de e-mail iguais no browser e no servidor.
- Um contrato de persistência permite selecionar SQL Server durável por migrations ou memória descartável via `STORAGE_MODE`.
- Conta local de recrutador é criada por seeder a partir de `.env`; senha usa Argon2id e sessão usa cookie HttpOnly. Cadastro e extração de PDF são públicos; listagem, detalhe e visualização do PDF salvo exigem autenticação.
- PDF.js tenta camada textual; OCRmyPDF/Tesseract local em português e inglês é fallback. Isso evita enviar currículos a serviço externo. Limites e isolamento do container reduzem exposição, mas OCR não é um sandbox antimalware perfeito.
- Após solicitação de visualização do currículo no banco de talentos, a decisão inicial de descartar o PDF foi substituída: PDFs opcionais validados podem ser enviados no cadastro ou anexados depois ao registro existente por recrutador autenticado. SQL Server guarda o binário; no modo `memory`, o arquivo é efêmero. A API só o serve em rota autenticada e o botão depende do indicador `temCurriculo`.
- Logs diários guardam metadados de request, banco, autenticação e OCR sem dados pessoais, conteúdo de currículo, credenciais ou payloads.
- Para performance, listas são paginadas e selecionam colunas explícitas. O painel de diagnóstico mede métricas apenas localmente.

## Uso de inteligência artificial

Foi utilizado **OpenAI Codex, modelo GPT-6**, como apoio de planejamento, implementação e revisão. Exemplos de solicitações e aproveitamento:

- “Organize o desafio em etapas com React, Node.js, SQL Server, Docker, auditoria e documentação.” A estrutura foi aproveitada após alinhar escopo e tecnologias com o pedido.
- “Implemente cadastro anônimo e proteja lista e detalhes para recrutadores autenticados; permita alternar memória e SQL por `.env`.” A resposta virou guard de API e rotas React, contrato de persistência e seeder; ajustes foram feitos para não revelar detalhe a usuários anônimos.
- “Adicione OCR local gratuito para currículos escaneados, com limites e sem incluir dados pessoais nos logs.” A abordagem PDF.js + OCRmyPDF/Tesseract foi revisada com documentação oficial; OCR em nuvem foi descartado. Foram adicionados limites de tamanho/páginas/tempo/concorrência, temporários e container interno restrito.
- “Adicione um botão para visualizar o PDF nas telas da lista e do detalhe, somente quando o arquivo puder ser consultado.” A mudança substituiu a decisão anterior de descartar o original: o backend valida e associa o PDF opcional ao candidato, e a rota de leitura exige sessão. O binário não é incluído nas respostas comuns nem nos logs.
- “Atualize README, DESENVOLVIMENTO e documentos de arquitetura em português.” O texto foi reescrito para refletir a implementação e explicitar riscos, limitações e instruções de execução.
- “No meu currículo não estão funcionando cargo e resumo; atualize a documentação e implemente a extração.” A regra foi estendida para título próximo ao nome ou cargo rotulado e para um resumo limitado pelos cabeçalhos das seções. Foram criados testes com conteúdo sintético e a API foi validada localmente com o documento do usuário, sem imprimir nem armazenar o texto extraído.
- “Revise as provas unitárias e confirme casos extremos de campos, e-mails e login.” A revisão encontrou cobertura insuficiente de formatos inválidos e ausência de testes React da página de login. Foram acrescentados casos de limites, campos estritos, credencial inexistente, bloqueio por tentativas e respostas da interface; os testes também revelaram e ajudaram a corrigir a ordem de trim/validação do e-mail.

As respostas foram tratadas como sugestões. Dependências, código e documentação foram inspecionados; testes e auditoria são usados para confirmar o comportamento. Durante a primeira inicialização real da API, foi corrigido o registro de `OcrCurriculoClient` como provider de `CandidatosModule`, falha que não aparecia na compilação TypeScript. A decisão anterior de não ter autenticação/OCR foi substituída pela RDA 0002 após o novo escopo.

## Verificação

As verificações incluem testes unitários e HTTP, teste dedicado com SQL Server real, smoke test API + SQL, typecheck, build, auditoria npm, fluxo Docker e inspeção visual. Cada item abaixo indica se foi repetido nesta atualização ou pertence a uma execução anterior documentada.

### Resultado observado

- Testes de contratos: **17 aprovados**, incluindo limites, pontuação Unicode, e-mails malformados e formatos de login.
- Testes unitários da API: **25 aprovados**, cobrindo regras, sessão, OCR e auditoria sem PII; inclui conta inexistente, senha incorreta/hash corrompido com resposta genérica e candidato inexistente.
- Testes HTTP/e2e da API: **21 aprovados**, incluindo validação do login, cookie e logout, cinco tentativas antes do bloqueio, rotas protegidas, cadastro público e PDF inválido/grande.
- Testes de interface: **11 aprovados**, incluindo cadastro anônimo, campos sugeridos do PDF, validação de login, credencial recusada e login bem-sucedido até a listagem.
- Total da suíte padrão `npm test`: **74 aprovados** — 17 de contratos, 25 unitários da API, 21 HTTP/e2e e 11 React.
- `npm run test:sql --workspace @cadastro/api`: **1 teste aprovado contra SQL Server real**, com criação/remoção de base temporária, migrations, CRUD, paginação, detalhe e confirmação após fechar e reabrir a conexão.
- `npm run test:integration --workspace @cadastro/api`: **aprovado contra a API e o SQL Server ativos**. Cobriu bloqueio anônimo da lista, cadastro público, login, listagem, detalhe e leitura da linha no banco; removeu o candidato sintético criado.
- `npm run test:e2e:browser`: **1 teste Playwright aprovado** no Chromium 153.0.8010.12, de ponta a ponta pelo navegador, API e SQL Server (`1 passed`, 7,8 segundos na execução registrada). Criou candidato e conta de recrutador sintéticos, confirmou lista/detalhe e a linha no SQL, e removeu ambos ao terminar. A senha aleatória foi usada somente durante o teste e persistida apenas como hash Argon2id.
- `npm run test:cov`: contratos 100% em todas as métricas; API 86,86% instruções, 74,53% ramos, 69,09% funções e 92,30% linhas; frontend 70,48%, 71,29%, 56,86% e 76,98%, respectivamente. Os limiares de cobertura não bloqueiam o build. A estratégia, os casos e as lacunas estão em [`docs/ESTRATEGIA-DE-TESTES.md`](docs/ESTRATEGIA-DE-TESTES.md).
- `npm run typecheck`: **concluído** nos três workspaces.
- `npm run build`: **concluído** nos três workspaces; imagens Docker de API, web e OCR também foram construídas.
- `npm run audit`: **0 vulnerabilidades reportadas** nesta atualização; `npm ci` também auditou 587 pacotes e encontrou 0 vulnerabilidades.
- Serviço OCR no contêiner oficial `v17.12.1`: **4 testes aprovados**, incluindo extração de nome/e-mail de PDF escaneado sintético, PDF inválido, healthcheck e encerramento do grupo de processos no timeout.
- Compose de demonstração com override local: serviços web, API, SQL Server e OCR estavam saudáveis. `GET /api/health` e `/candidatos/novo` haviam respondido com HTTP 200 em inspeção anterior; o smoke test integrado desta atualização confirmou a API e o SQL. O override remove `no-new-privileges` somente da API e OCR; mantém as demais restrições e não deve ser usado em produção. O arquivo base conserva essa proteção.
- Validação manual com um currículo real fornecido pelo usuário, processado somente no endpoint local: foram sugeridos nome, cargo e resumo (477 caracteres); e-mail e telefone permaneceram vazios porque não foram encontrados no documento. O teste imprimiu somente as chaves identificadas, a presença dos campos e o tamanho do resumo. O PDF e o conteúdo pessoal não foram copiados para o projeto, fixtures ou logs.
- O host SQL local já usa a porta 1433; este projeto publica SQL Server em `SQL_PORT=1434`.
- Teste visual sistemático nos tamanhos 320, 375, 768 e desktop e persistência após reinício do contêiner da API: **não concluídos** nesta atualização. O fluxo API + SQL foi exercitado sem reiniciar a API; o teste SQL separado fechou e reabriu a conexão e confirmou que os registros permaneceram no banco.

## Tempo, dificuldades, limitações e melhorias

- Tempo aproximado: a rodada inicial foi estimada em cerca de 2 horas, sem cronômetro dedicado. O acompanhamento posterior não foi cronometrado e ainda não está somado; é uma aproximação, não uma medição automática.
- Dificuldades: o host tem Node.js 20, abaixo do runtime fixado pelo projeto; Vitest falha no binding opcional de Rolldown nesse host. Os comandos precisam rodar na imagem Node 24 usada no Docker.
- Limitações atuais: heurísticas de extração não garantem precisão; OCR manuscrito e PDFs degradados podem falhar. A autenticação não inclui MFA, recuperação de senha, gestão de contas ou papéis. O modo memória não persiste.
- Melhorias futuras: fluxo administrativo de troca/recuperação de senha, MFA/SSO para implantação, política de retenção dos dados de candidatos, testes adicionais com PDFs diversos, filtros de listagem e benchmark com volume representativo.

### Atualização: visualização do currículo

A pedido do usuário, foi adicionada persistência opcional do PDF com o cadastro, uma migration aditiva, validação estrutural no backend e rota de visualização restrita a recrutadores. A lista e o detalhe recebem apenas um indicador de disponibilidade. Após identificar que um registro antigo poderia não ter arquivo, foi incluída a rota autenticada `PUT /api/candidatos/:id/curriculo` e uma ação de anexo na tela de detalhes; isso permite associar o arquivo ao cadastro existente, sem criar outro candidato. O endpoint não substitui um PDF já associado.

Nesta atualização, `npm run typecheck` e `git diff --check` passaram; as imagens Docker de API e frontend foram reconstruídas e iniciaram, e os logs do Nest confirmaram o mapeamento da nova rota `PUT`. A tela pública foi recarregada no navegador; o fluxo autenticado de anexo não foi percorrido nesta verificação e não foram executados testes automatizados. A captura atualizada dos detalhes mostra a confirmação e a ação de visualização após anexar o arquivo. A política de retenção/exclusão continua pendente para uso real.
