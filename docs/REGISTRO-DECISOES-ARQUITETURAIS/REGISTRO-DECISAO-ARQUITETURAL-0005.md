# RDA 0005 — Exclusão de artefatos locais e documentos pessoais do Git

- **Estado:** aceita
- **Data:** 2026-09-29
- **Contexto:** o desenvolvimento local utiliza segredos de ambiente, currículos de validação, bancos temporários e relatórios de testes. Esses arquivos podem conter dados pessoais ou material específico da máquina e não devem ser publicados junto com o código.

## Decisão

1. Ignorar arquivos `.env` e configurações locais de credenciais, preservando apenas `.env.example` sem segredos.
2. Ignorar chaves privadas, certificados, diretórios de segredos, bancos locais, dumps, documentos e currículos usados manualmente.
3. Ignorar saídas geradas de cobertura e ferramentas de teste, mas manter no repositório o código dos testes automatizados.
4. Manter uma exceção explícita para `apps/ocr/fixtures/curriculo-digitalizado.pdf`: é um fixture sintético, pequeno e necessário para reproduzir a integração de OCR.
5. Não adicionar ao Git currículos reais usados para validação. O conteúdo do documento pessoal usado neste desafio permanece fora do repositório.

## Consequências e limites

- O `.gitignore` reduz inclusões acidentais, mas não remove arquivos que já estejam rastreados. Antes de publicar, revisar `git status`, os arquivos rastreados e o histórico.
- Dados reais nunca devem ser usados como fixture versionado; testes devem usar conteúdo sintético.
- O fixture permitido não contém currículo de uma pessoa real e pode ser executado pelos testes OCR locais.
