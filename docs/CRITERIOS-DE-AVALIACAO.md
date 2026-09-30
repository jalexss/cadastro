# Critérios de avaliação do desafio

Este documento relaciona os critérios do desafio ao comportamento verificável da aplicação, aos comandos de demonstração e às limitações conhecidas. A avaliação abaixo descreve o estado observado em 2026-09-29; resultados de testes são separados quando não fazem parte da suíte padrão.

## 1. Funcionamento dos cadastros, listagem e detalhes

**Estado: implementado e exercitado por testes e fluxo integrado.** O cadastro manual e o iniciado por PDF usam o mesmo formulário e contrato de validação. A criação e a extração do currículo são públicas; lista e detalhe exigem sessão de recrutador, conforme o escopo adicional decidido para o projeto. O candidato sintético usado no smoke test aparece na lista e no detalhe e é removido do banco ao final.

- Testes de React cobrem cadastro público, validações, sugestão editável do PDF, login recusado e login bem-sucedido.
- O smoke test `npm run test:integration --workspace @cadastro/api` exercita cadastro público, login, listagem e detalhe na API ativa e confirma a linha no SQL Server.
- A extração usa PDF.js e OCR local como fallback. O fixture sintético comprova leitura OCR de nome e e-mail; heurísticas de telefone, cargo e resumo têm testes unitários. Um currículo real validado nesta execução não continha e-mail nem telefone, então esses dois campos não puderam ser comparados com valores reais conhecidos.
- A suíte não substitui uma demonstração visual completa do fluxo do browser até o banco. O teste automatizado do frontend simula a API.

## 2. Integração entre frontend, backend e SQL Server

**Estado: implementação presente; API + SQL Server exercitados; integração do browser até o SQL ainda não automatizada.** `STORAGE_MODE=sqlserver` é o padrão, as migrations são aplicadas pelo backend e os testes SQL usam um banco descartável com o mesmo mapeamento TypeORM. A listagem seleciona colunas explícitas e usa paginação; o detalhe faz busca direta.

Com Compose iniciado e `.env` configurado, execute:

```bash
npm run test:sql --workspace @cadastro/api
npm run test:integration --workspace @cadastro/api
```

O primeiro comando cria um banco SQL temporário exclusivo, aplica as migrations, testa criação, existência, paginação e detalhe, fecha e reabre a conexão para confirmar persistência e remove o banco temporário. Requer permissão SQL para criar e remover bancos. O segundo comando chama a API real, confirma que a linha foi gravada no SQL Server e remove somente o candidato sintético criado pelo teste. Ambos usam as credenciais locais do `.env`; nenhum segredo é impresso.

Esses testes agora verificam persistência e o fluxo API/SQL. Ainda não fazem restart automático dos contêineres durante o teste nem dirigem o navegador real. Os testes HTTP comuns usam persistência simulada e não devem ser descritos como integração SQL.

## 3. Clareza e organização do código

**Estado: atendido.** O monorepo separa `apps/web`, `apps/api` e `packages/contratos`. Módulos de NestJS isolam autenticação, candidatos, banco, OCR e auditoria; o contrato Zod compartilhado centraliza validações. Decisões técnicas e alternativas descartadas estão em `docs/REGISTRO-DECISOES-ARQUITETURAIS/`.

O projeto inclui OCR, autenticação local, modo de memória e diagnóstico de desempenho além do escopo mínimo. São recursos com justificativas documentadas, mas aumentam o que a pessoa que apresenta precisa saber explicar.

## 4. Validações e tratamento de erros

**Estado: bem coberto.** Nome e e-mail são obrigatórios; formato e limites são aplicados pelo mesmo schema no cliente e servidor. Os testes incluem nomes Unicode, entradas vazias, limites, e-mails malformados, campos não previstos, dados parciais de extração, e-mail inválido no login, credencial recusada e limite de tentativas. PDF é limitado a 5 MB e validado pelo tipo declarado, extensão e assinatura. Falha de leitura preserva o cadastro manual.

O parser é heurístico, não garante precisão universal, não usa OCR em nuvem e pode falhar em manuscritos, baixa resolução, documentos protegidos ou layouts incomuns. A validação de e-mail verifica formato, não existência da caixa postal.

## 5. Relevância dos testes

**Estado: boa cobertura funcional, com lacunas explícitas.** A execução em Node 24 nesta atualização aprovou **74 testes padrão**: 17 contratos, 25 unitários da API, 21 HTTP/e2e com dependências simuladas e 11 testes React. A integração SQL acrescenta um teste separado; o smoke API+SQL é um comando de verificação adicional, não contado como teste Vitest.

`npm run test:cov` reportou contratos em 100% para instruções, ramos, funções e linhas; API em 86,86% / 74,53% / 69,09% / 92,30%; frontend em 70,48% / 71,29% / 56,86% / 76,98%. Os limiares não estão configurados como bloqueio do build. Permanecem lacunas em teste XSS de detalhe, corpus diverso de currículos e cobertura de componentes de diagnóstico/auditoria.

## 6. Facilidade para configurar e executar

**Estado: atendido com pré-requisitos.** README e `docs/GUIA-DE-EXECUCAO.md` descrevem Docker Compose, arquivo `.env`, credenciais iniciais, modos SQL/memória, execução e testes. O `README.md` não contém credenciais reais; `.env.example` é o modelo de configuração.

A primeira inicialização exige definir senha do SQL Server, senha do recrutador e segredo JWT. Para consultar candidatos, a pessoa avaliadora precisa entrar com a conta criada pelo seeder; não há cadastro público de recrutadores. SQL Server Developer no Docker destina-se à demonstração local.

## 7. Clareza da documentação e explicação de decisões

**Estado: documentado.** O README resume tecnologia, versões e comandos. `DESENVOLVIMENTO.md` registra organização, decisões, uso de IA, exemplos de pedidos, correções, verificações, limitações e estimativa de tempo. Arquitetura, DER, requisitos, execução, estratégia de testes e decisões estão em `docs/`.

O repositório está publicado como público em `https://github.com/jalexss/cadastro`. A documentação informa essa situação; os commits publicados foram verificados com a identidade pessoal configurada para este projeto.

## Verificações observadas nesta atualização

- `npm test`: 74 testes aprovados no runtime Node 24.
- Testes OCR executados no contêiner isolado: 4 aprovados, incluindo leitura do PDF escaneado fictício.
- `npm run test:sql --workspace @cadastro/api`: aprovado contra SQL Server real, com banco temporário criado e removido.
- `npm run test:integration --workspace @cadastro/api`: aprovado contra API e SQL Server do Compose; o candidato de teste foi removido.
- `npm run typecheck` e `npm run build`: aprovados nos workspaces.
- `npm run audit`: 0 vulnerabilidades reportadas nesta execução.
- `npm run test:cov`: cobertura registrada acima; sem limiares obrigatórios.
- Inspeção responsiva sistemática em 320, 375, 768 px e desktop não foi repetida nesta atualização. Benchmark de carga representativo também não foi executado.

## Demonstração sugerida

1. Iniciar Compose conforme README e entrar no login com os dados locais do seeder.
2. Cadastrar um candidato manualmente e outro com o fixture PDF fictício; editar as sugestões e salvar.
3. Mostrar o registro na listagem e abrir o detalhe.
4. Demonstrar que visitante anônimo consegue cadastrar, mas recebe bloqueio ao consultar a lista.
5. Explicar que o smoke test automatizado valida API e SQL; a inspeção visual e a heurística do OCR têm limites documentados.
