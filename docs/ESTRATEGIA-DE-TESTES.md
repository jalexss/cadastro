# Estratégia de testes

## Como executar

Com Node.js 24.11+ e npm 11:

```bash
npm test
npm run typecheck
npm run build
npm run test:cov
```

`npm test` executa, em sequência, contratos compartilhados, testes unitários da API, testes HTTP da API e testes React. A suíte deve ser executada com o runtime declarado no `package.json`; Node 20 não é suportado neste projeto.

Com Compose iniciado, rode separadamente `npm run test:sql --workspace @cadastro/api` e `npm run test:integration --workspace @cadastro/api`. O primeiro usa um banco temporário descartável; o segundo faz chamadas à API e ao SQL Server ativos. Para percorrer a aplicação pelo navegador, instale o Chromium com `npx playwright install chromium` e execute `npm run test:e2e:browser`. A prova cria uma conta recrutadora sintética temporária com hash Argon2id e um candidato sintético, ambos no SQL Server; usa a interface pública, faz login, abre lista e detalhe e confirma por consulta SQL a linha armazenada. A fixture evita alterar a conta inicial persistente. Ao final, remove os dois registros usando e-mails aleatórios. O teste exige `STORAGE_MODE=sqlserver`, Docker Compose ativo e o Chromium instalado; não faz parte de `npm test`.

## Cobertura executada nesta revisão

Resultado em 2026-09-29: **74 testes aprovados** — 17 de contratos, 25 unitários da API, 21 HTTP/e2e e 11 de frontend. A integração SQL executou mais **1 teste separado** contra um SQL Server real; o smoke de API + SQL também passou e é um script de verificação, não um teste Vitest. `npm run build` concluiu para contratos, API e frontend. Os comandos foram executados na imagem Docker com Node 24.

Nesta atualização, a prova Playwright navegador–API–SQL Server também passou (**1 teste E2E**). A instalação limpa baseada no lockfile final auditou 590 pacotes e encontrou **zero vulnerabilidades**.

`npm run test:cov` usa V8, mede os workspaces separadamente e não inclui os testes HTTP/e2e nem o teste SQL separado. Nesta execução, contratos ficaram em **100%** de instruções, ramos, funções e linhas; API em **86,86% / 74,53% / 69,09% / 92,30%** (instruções/ramificações/funções/linhas); frontend em **70,48% / 71,29% / 56,86% / 76,98%**. A página `LoginPage` ficou em **100%** de instruções e linhas, com 80% dos ramos cobertos. Esses percentuais não são metas configuradas: o comando informa cobertura, mas não falha abaixo de um limiar.

### Contratos e validação de entrada — 17

- Cadastro exige nome e e-mail válidos, remove espaços externos antes da validação do e-mail e rejeita campos não declarados.
- Nomes com acentos, hífen e apóstrofo são aceitos; nome vazio ou só com espaços e nome acima de 160 caracteres são rejeitados.
- E-mails inválidos cobrem vazio, ausência de `@`, domínio incompleto, pontos consecutivos, espaços internos, mais de um `@`, domínio local e sufixo HTML. Também é verificado o limite de 254 caracteres.
- Telefone, área de interesse e resumo são opcionais; são verificados os limites de 40, 140 e 3.000 caracteres.
- A resposta parcial da extração PDF é aceita; e-mail malformado e campos extras são rejeitados.
- Login verifica e-mail válido, espaços externos, senha vazia ou composta apenas por espaços, limite de 128 caracteres e rejeição de propriedades adicionais. Espaços dentro de uma senha não são removidos.

### Regras de negócio e autenticação — 25 unitários da API

- Persistência em memória: criação, paginação, detalhe e normalização do e-mail.
- Serviço de candidatos: normaliza e-mail, converte opcionais vazios em valores nulos, retorna detalhes encontrados e gera NotFound para identificadores inexistentes.
- Autenticação: compara senha com Argon2id, normaliza e-mail para busca, emite JWT e não retorna hash. Senha incorreta, conta inexistente e hash Argon2 corrompido recebem a mesma mensagem; eventos de auditoria não registram e-mail nem senha. Logout registra evento sem dados pessoais.
- Guard de sessão: sessão válida, expirada ou token inválido.
- Extração PDF/OCR: campos parciais, formatos de telefone, cargo, resumo delimitado por seção, PDF inválido e fallback para OCR.
- Logger SQL e cliente OCR: metadados sem conteúdo pessoal, resposta de erro e timeout.

### API HTTP — 21 e2e

- Cadastro público com e-mail válido e rejeição de formatos inválidos.
- Lista e detalhe protegidos por sessão; paginação validada.
- Upload de PDF inválido ou acima de 5 MB, sem chamar o extrator quando o limite é excedido.
- Login: cookie HttpOnly/SameSite, opção Secure, ausência de JWT no corpo, logout e validação do corpo antes do serviço.
- Limitação de login: cinco tentativas aceitas e a sexta bloqueada pela regra configurada no endpoint.

As rotas e dependências de persistência são simuladas nos testes HTTP; eles não substituem testes de integração contra uma instância real do SQL Server.

### SQL Server real e fluxo integrado

- `test/integracao-sql.spec.ts` cria uma base exclusiva com nome aleatório, executa as migrations de candidatos e recrutadores, cria três candidatos, verifica normalização de e-mail, paginação e detalhe, fecha a conexão e abre outra para confirmar persistência. Ao terminar, fecha e remove somente a base temporária.
- `test/fluxo-api-sql.mjs` verifica com a API/SQL do Compose: bloqueio anônimo da lista, cadastro público, login do recrutador inicial, presença na lista, detalhe e linha correspondente no SQL. Remove o candidato sintético em `finally`.
- `test/e2e-navegador.spec.ts` usa Playwright Chromium para percorrer cadastro público, login, lista e detalhe no navegador; valida os status das chamadas HTTP e consulta SQL Server diretamente para confirmar a persistência. Cria e remove uma conta recrutadora temporária e um candidato sintético, sem alterar o usuário inicial.
- Esses testes confirmam o fluxo navegador/API/SQL e persistência após reconexão. Não reiniciam o contêiner da API.
- O serviço OCR tem quatro testes Python executados dentro da imagem OCR, incluindo o fixture PDF escaneado, PDF inválido, healthcheck e timeout do processo OCR. Eles não fazem parte de `npm test`.

### Interface React — 11

- Cadastro recebe campos sugeridos do PDF, mantém edição manual e exibe erros de validação.
- Login local impede enviar e-mail malformado à API e mostra a mensagem genérica quando as credenciais são recusadas.
- Login válido navega até a lista de candidatos.
- Navegação pública/protegida e confirmação de cadastro anônimo.

## Critérios deliberados

- Não há whitelist ASCII para nome, cargo ou resumo: acentos, apóstrofos, hífens e sinais comuns de tecnologia (por exemplo, `C++` e `C#`) são legítimos. Os campos de texto têm limites e o contrato rejeita chaves não previstas.
- A validação do e-mail confere formato, não existência da caixa postal nem propriedade do endereço.
- Telefone é opcional e limita tamanho, mas não impõe uma máscara única porque pode vir em formatos nacionais ou internacionais.
- Senhas são sensíveis a maiúsculas/minúsculas e espaços internos. Apenas senha vazia ou composta exclusivamente de espaços é inválida no contrato de login.

## Lacunas conhecidas

- A integração com SQL Server real e as migrations em uma base descartável agora têm teste dedicado. Falta automatizar persistência após reinício do contêiner da API e idempotência do seeder.
- A automação Playwright verifica uma credencial válida e as rotas protegidas em conjunto com a API e SQL reais. Login inválido e validação de e-mail continuam cobertos nas suítes unitária e HTTP.
- Os percentuais mais baixos estão em funções auxiliares de auditoria/TypeORM, abstração de seleção de persistência, diagnóstico de desempenho e componentes menos exercitados de `App`. Priorizar teste de integração SQL e caminhos completos dessas áreas.
- A limitação de tentativas é verificada por HTTP para o endpoint de login. O armazenamento do limitador é em memória por instância; ambientes com várias réplicas precisam de armazenamento compartilhado.
- Não há teste de renderização contra payload XSS na tela de detalhe nem corpus amplo de PDFs reais. Campos são apresentados como texto React e a extração continua heurística.
- A checagem visual sistemática nos tamanhos 320, 375, 768 px e desktop e um benchmark com volume representativo seguem pendentes.
- Os casos de e-mail cobrem formatos comuns incorretos, não toda a gramática possível (por exemplo, domínios internacionalizados ou comentários raros).
