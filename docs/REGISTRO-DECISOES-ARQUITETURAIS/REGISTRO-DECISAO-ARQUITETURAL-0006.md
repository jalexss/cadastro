# RDA 0006 — Armazenamento e visualização controlada do currículo

- **Estado:** aceita
- **Data:** 2026-09-30
- **Contexto:** a equipe solicitou visualizar o currículo nas telas da lista e do detalhe. As decisões anteriores descartavam o original após a extração, o que tornava essa visualização impossível.

## Decisão

1. Ao salvar um cadastro com PDF estruturalmente válido, armazenar o binário original no mesmo adapter do candidato: SQL Server em `varbinary(max)` ou memória no modo `STORAGE_MODE=memory`.
2. Manter o arquivo opcional. Cadastro manual, falha de leitura ou ausência de arquivo continuam permitindo o cadastro; nesses casos `tem_curriculo=false` e a interface omite a ação de visualização.
3. Validar o PDF no backend antes de persistir e limitar a 5 MB. O frontend só envia o arquivo ao salvar se a leitura do currículo tiver sido concluída sem erro.
4. Expor o conteúdo somente por `GET /api/candidatos/:id/curriculo`, protegido por sessão. Responder inline, sem cache, com nome genérico gerado pela aplicação. Listagem e detalhe recebem apenas o indicador de disponibilidade, nunca a coluna binária.
5. Para registros criados antes da retenção do arquivo, permitir que um recrutador autenticado anexe um PDF ao cadastro existente por `PUT /api/candidatos/:id/curriculo`. Validar tamanho, tipo, assinatura e estrutura no backend. O endpoint aceita apenas o primeiro anexo e não oferece substituição, evitando sobrescrita acidental.
6. Registrar metadados técnicos do processamento e da requisição, sem incluir o arquivo ou o conteúdo extraído nos logs. A migração é aditiva e define os registros existentes como sem currículo.

## Consequências e riscos

- O SQL Server aumenta em até 5 MB por currículo anexado, além do custo de índices/backups; o modo memória perde os arquivos ao reiniciar.
- O arquivo permanece associado ao candidato enquanto o registro existir. A demonstração não oferece exclusão na interface nem retenção automática; antes de uso real, é necessário definir política de retenção, exclusão, backup e proteção do banco.
- A rota autenticada reduz exposição, mas não substitui HTTPS, controle operacional de contas nem criptografia de armazenamento configurada no SQL Server.
- Um navegador ainda pode não renderizar determinado PDF mesmo após validação estrutural básica; a visualização depende do suporte do navegador.

## Alternativas consideradas

- Continuar descartando todos os PDFs e esconder sempre o botão: preservaria a retenção mínima, mas não atenderia à solicitação de consulta do currículo.
- Armazenar em diretório de arquivos fora do banco: adicionaria uma segunda persistência, política de volumes e reconciliação entre arquivo e cadastro; foi preferido o mesmo adapter para manter o ciclo de vida ligado ao candidato.
