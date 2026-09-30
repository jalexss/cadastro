# RDA 0004 — Sugestão heurística de cargo e resumo profissional

- **Estado:** aceita
- **Contexto:** a validação do currículo real mostrou que nome e campos de contato não bastam para iniciar o cadastro; cargo/área e resumo também devem ser sugeridos quando há texto reconhecível.

## Decisão

1. Usar o texto já extraído pelo PDF.js ou pelo OCR local, sem serviço externo nem nova dependência.
2. Sugerir cargo/área a partir de rótulos explícitos ou de uma linha curta próxima ao nome, ignorando contatos, links, datas e cabeçalhos conhecidos.
3. Sugerir resumo somente quando existir um cabeçalho reconhecido de resumo/perfil (`RESUMO PROFISSIONAL`, `PERFIL PROFISSIONAL`, `SOBRE MIM`, `SUMMARY` ou equivalentes). Encerrar o bloco no próximo título de seção reconhecido e limitar a 3.000 caracteres.
4. Estender o contrato compartilhado com os dois campos opcionais. O frontend usa o mesmo formulário já existente e permite editar as sugestões antes de salvar.
5. Manter o texto extraído fora dos logs e testes versionados. Validar com conteúdo sintético e, para este ajuste, processar o documento fornecido somente na API local.

## Consequências e limitações

- A heurística atende currículos que colocam o título próximo ao nome e usam seções com cabeçalhos reconhecidos. Layouts diferentes podem omitir ou classificar conteúdo incorretamente.
- O resumo não é inferido do currículo inteiro quando não há um cabeçalho; isso reduz a chance de misturar experiência, formação e habilidades em um único campo.
- A extração não comprova que o cargo seja a preferência atual do candidato. As sugestões devem ser revisadas antes do cadastro.
- Na validação local, nome, cargo e resumo foram identificados; e-mail e telefone ficaram ausentes. O registro de auditoria contém apenas resultado e duração, sem texto pessoal.

## Alternativas consideradas

- OCR/IA em nuvem para classificar o currículo: rejeitado para não transferir dados pessoais nem introduzir um fornecedor externo.
- Copiar todo o texto do currículo ao resumo: rejeitado por misturar seções e exceder o significado pretendido do campo.
- Adicionar biblioteca de NLP: rejeitado porque cabeçalhos e proximidade resolvem o caso atual sem dependência adicional.
