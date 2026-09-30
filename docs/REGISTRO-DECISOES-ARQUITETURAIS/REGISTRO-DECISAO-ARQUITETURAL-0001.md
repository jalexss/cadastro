# RDA 0001 — Stack e limites de processamento do currículo

- **Estado:** substituída pela RDA 0002 para autenticação e OCR; decisões de stack, SQL Server, contratos, auditoria e validação de PDF continuam vigentes.
- **Contexto:** a equipe precisa cadastrar candidatos manualmente ou começar por um PDF, persistir e consultar no SQL Server, demonstrar segurança e executar a solução com Docker.

## Decisões

1. Usar React + TypeScript + Vite no frontend e NestJS + TypeScript na API. A separação em módulos atende ao fluxo de cadastro e permite evoluir a aplicação.
2. Usar SQL Server com TypeORM e migrations explícitas. `synchronize` fica desativado para que alterações de schema sejam revisáveis.
3. Compartilhar contratos Zod entre browser e API, mantendo regras obrigatórias e formatos consistentes nos dois caminhos.
4. Extrair somente texto de PDF no backend, na memória, com limite de 5 MB, validação da assinatura PDF e descarte após uso. Não haverá OCR nem armazenamento do arquivo.
5. Registrar auditoria técnica em arquivos JSONL diários UTC sem valores SQL ou conteúdo pessoal; coletar duração de HTTP e consulta lenta e fingerprints de todas as consultas.
6. **Decisão original, posteriormente substituída:** não adicionar autenticação por não constar do requisito inicial. O novo escopo introduziu autenticação local e autorização conforme a RDA 0002.

## Consequências

- Uma leitura parcial ou fracassada não impede preencher e salvar o mesmo formulário manualmente.
- PDF escaneado e layouts fora das heurísticas podem não gerar dados; a equipe deve revisar os valores sugeridos.
- **Consequência original, superada pela implementação da RDA 0002:** sem autenticação e autorização, o serviço não estaria pronto para publicação pública. A recomendação atual continua sendo revisar controles operacionais e de implantação antes de expor a aplicação.
- Versões são fixadas no lockfile e verificadas com auditoria de dependências; a versão final do runtime precisa satisfazer engines dos pacotes escolhidos.
