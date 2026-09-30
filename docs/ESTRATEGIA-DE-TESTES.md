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

## Cobertura executada nesta revisão

Resultado em 2026-09-29: **73 testes aprovados** — 17 de contratos, 25 unitários da API, 21 HTTP/e2e e 10 de frontend. `npm run build` também concluiu para contratos, API e frontend. Os testes da API foram executados na imagem Docker com Node 24.

`npm run test:cov` usa V8, mede os workspaces separadamente e não inclui os testes HTTP/e2e. Nesta execução, contratos ficaram em **100%** de instruções, ramos, funções e linhas; API em **86,86% / 74,53% / 69,09% / 92,30%** (instruções/ramificações/funções/linhas); frontend em **69,27% / 70,37% / 56,86% / 76,19%**. A página `LoginPage` ficou em 95,65% de instruções e 95,23% de linhas. Esses percentuais não são metas configuradas: o comando informa cobertura, mas não falha abaixo de um limiar.

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

### Interface React — 10

- Cadastro recebe campos sugeridos do PDF, mantém edição manual e exibe erros de validação.
- Login local impede enviar e-mail malformado à API e mostra a mensagem genérica quando as credenciais são recusadas.
- Navegação pública/protegida e confirmação de cadastro anônimo.

## Critérios deliberados

- Não há whitelist ASCII para nome, cargo ou resumo: acentos, apóstrofos, hífens e sinais comuns de tecnologia (por exemplo, `C++` e `C#`) são legítimos. Os campos de texto têm limites e o contrato rejeita chaves não previstas.
- A validação do e-mail confere formato, não existência da caixa postal nem propriedade do endereço.
- Telefone é opcional e limita tamanho, mas não impõe uma máscara única porque pode vir em formatos nacionais ou internacionais.
- Senhas são sensíveis a maiúsculas/minúsculas e espaços internos. Apenas senha vazia ou composta exclusivamente de espaços é inválida no contrato de login.

## Lacunas conhecidas

- Ainda não há teste automatizado de integração com SQL Server real, persistência após reinício, migrations completas em banco descartável ou seeder idempotente.
- A interface de login tem testes para entrada inválida e credencial recusada; falta um teste React do caminho feliz e do redirecionamento após login.
- Os percentuais mais baixos estão em funções auxiliares de auditoria/TypeORM, abstração de seleção de persistência, diagnóstico de desempenho e componentes menos exercitados de `App`. Priorizar teste de integração SQL e caminhos completos dessas áreas.
- A limitação de tentativas é verificada por HTTP para o endpoint de login. O armazenamento do limitador é em memória por instância; ambientes com várias réplicas precisam de armazenamento compartilhado.
- Não há teste de renderização contra payload XSS na tela de detalhe nem corpus amplo de PDFs reais. Campos são apresentados como texto React e a extração continua heurística.
- Os casos de e-mail cobrem formatos comuns incorretos, não toda a gramática possível (por exemplo, domínios internacionalizados ou comentários raros).
