# Arquitetura técnica

## Componentes

- **Web:** React + TypeScript + Vite. Formulário único, login, listagem/detalhe protegidos e painel local de desempenho.
- **Contratos:** Zod e tipos no workspace `packages/contratos`, compartilhados entre browser e API.
- **API:** NestJS. Autenticação local, autorização por sessão, candidatos, parsing de PDF, auditoria e adaptadores de persistência.
- **Persistência:** interface `Persistencia`; implementação TypeORM/SQL Server com migrations ou memória efêmera, selecionada por `STORAGE_MODE`.
- **OCR:** PDF.js é a primeira opção; OCRmyPDF/Tesseract em serviço interno isolado para documentos sem camada de texto.
- **Compose:** SQL Server, API, web e serviço OCR; volumes para dados/logs e filesystem/recursos restritos nos serviços da aplicação.

## Fluxos

### Cadastro

`Formulário → Zod no browser → POST público → Zod/API → serviço de domínio → adaptador ativo → confirmação`

O cadastro anônimo não recebe acesso ao registro detalhado; o frontend mostra confirmação e link para login. Candidato autenticado é levado ao detalhe, que exige sessão também na API.

### Leitura do currículo

`PDF ≤ 5 MB → validação MIME/assinatura → PDF.js no backend → OCR local se texto < limite mínimo → heurísticas → campos parciais → formulário editável`

O serviço OCR aceita apenas assinatura PDF, limita tamanho a 5 MB, 15 páginas, 40 segundos e duas tarefas concorrentes. Arquivos ficam em diretório temporário e são removidos ao terminar. Não há OCR remoto nem persistência do arquivo.

A identificação dos campos usa heurísticas sobre o texto extraído. E-mail e telefone permanecem vazios quando não aparecem no currículo. A validação manual revelou um falso positivo de telefone com uma sequência numérica de oito dígitos; a regra foi ajustada para exigir um número brasileiro plausível, prefixo internacional ou rótulo de telefone. O cargo/área é sugerido por rótulo explícito ou por uma linha curta próxima ao nome, ignorando contatos e títulos de seção. O resumo só é sugerido quando aparece um cabeçalho conhecido (como `RESUMO PROFISSIONAL`, `PERFIL PROFISSIONAL` ou `SUMMARY`) e termina no cabeçalho seguinte reconhecido. Ambos são opcionais e editáveis. Variações de layout, fragmentação do texto por PDF/OCR e nomes diferentes para os títulos podem omitir ou classificar conteúdo incorretamente. O PDF usado na validação não é distribuído no repositório.

### Sessão e autorização

`POST /auth/login → Argon2id → token assinado → cookie HttpOnly → guard da API`

O seed inicial usa `AUTH_BOOTSTRAP_EMAIL` e `AUTH_BOOTSTRAP_PASSWORD`. Não há endpoint de cadastro de conta. Sessão expira em oito horas; logout remove o cookie. A API protege GET de lista e detalhe, além das rotas React.

### Consulta

`GET lista paginada → seleção restrita de colunas e paginação no SQL Server ou adapter de memória`

`GET detalhe/:id → busca única por identificador`

## Persistência

`STORAGE_MODE` aceita `sqlserver` (padrão) e `memory`. O provider SQL usa migrations explícitas; `synchronize` fica desativado. O provider de memória implementa as mesmas operações e não promete retenção. A tabela de recrutadores guarda e-mail e hash Argon2id, nunca senha em texto.

## Segurança e auditoria

- Cookie `HttpOnly`, `SameSite=Lax`, `Path=/api`; `Secure` configurável (`COOKIE_SECURE=true` com HTTPS).
- CORS restrito, Helmet, throttling global e proteção de tentativas de login.
- Logs JSONL diários em UTC correlacionados por request ID: rota normalizada, HTTP status/duração, operação SQL/fingerprint/tempo, resultado de login e etapa/resultado/duração OCR. Sem cabeçalho Cookie, corpo, parâmetros SQL, arquivos, texto reconhecido, senha, e-mail ou dados de candidato.
- Retenção inicial 30 dias, configurável. Logs em volume local persistente.
- OCR em container interno sem porta publicada, filesystem root read-only, sem capabilities, tmpfs limitado, CPU/memória/processos limitados, sem shell interpolation e subprocesso com timeout que encerra o grupo de processos. O Compose base também ativa `no-new-privileges`; o override `docker-compose.demo.yml` o desativa somente para API e OCR durante execução local neste runtime incompatível e não deve ser usado em produção.

## Performance e responsividade

Listagem com limite de 100 registros e colunas explícitas; detalhe por consulta direta. O painel local usa Performance API/Web Vitals e React Profiler, sem enviar dados externos. A interface usa breakpoints para telas estreitas e campos obrigatórios indicados ao lado do label.
