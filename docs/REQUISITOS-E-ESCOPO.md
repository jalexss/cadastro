# Requisitos e escopo

## Objetivo

Entregar uma aplicação demonstrativa para recrutamento cadastrar candidatos sem login ou com login e permitir consultas somente a recrutadores autenticados. Documentação do sistema e da execução em português do Brasil.

## Requisitos funcionais

- Cadastro público manual ou iniciado por currículo PDF opcional, usando o mesmo formulário e validações compartilhadas.
- Nome completo e e-mail válidos obrigatórios; telefone, área/cargo e resumo profissional opcionais.
- PDF de até 5 MB: o backend tenta PDF.js e, quando não há texto suficiente, OCR local OCRmyPDF/Tesseract (`por+eng`). Campos parciais podem ser corrigidos. Falha não impede o cadastro manual.
- A extração tenta sugerir nome, e-mail, telefone, cargo/área próximo ao nome ou rotulado e resumo dentro de seções de perfil reconhecidas.
- Confirmação do cadastro; pessoa anônima recebe convite para login e não acessa o detalhe.
- Login local de recrutadores sem alta pública, logout e sessão em cookie HttpOnly.
- Lista paginada e detalhes protegidos no frontend e na API.
- PDF validado é armazenado ao salvar o cadastro ou pode ser anexado posteriormente ao registro existente por recrutador autenticado. A ação de visualização só aparece quando há arquivo; não é possível substituir o PDF já associado.
- Alternância por `.env` entre `STORAGE_MODE=sqlserver` (padrão persistente) e `memory` (temporário), com operações equivalentes. SQL Server possui migrations não destrutivas.
- Seeder idempotente para conta inicial baseada em segredos do ambiente. Dados sintéticos opcionais por `SEED_DEMO_DATA=true`.

## Requisitos não funcionais

- React/TypeScript, NestJS/TypeScript, SQL Server, Docker Compose, validação Zod compartilhada.
- Auditoria em logs diários UTC para requests, operações SQL, autenticação e etapas do OCR; sem payloads ou dados pessoais.
- Interface funcional e responsiva; diagnóstico local de tempos de requisição, Web Vitals e React Profiler sem telemetria externa.
- Consultas paginadas, seleção explícita de colunas e sem padrão N+1.
- Dependências fixadas e verificadas por `npm audit`.
- Testes unitários e HTTP devem cobrir campos obrigatórios/opcionais, limites de tamanho, e-mails malformados, login válido/inválido, tentativas excessivas, autorização e falhas recuperáveis no processamento de PDFs.

## Limitações e segurança

- É uma demonstração local, sem gestão de usuários, recuperação de senha, papéis ou cadastro público de recrutadores. Configure HTTPS e revisão de implantação antes de expor em rede.
- A extração de campos é heurística e não garante reconhecimento. Cargo depende de sua posição ou de um rótulo esperado; resumo depende de cabeçalhos conhecidos e termina no próximo cabeçalho reconhecido. PDFs protegidos, danificados, extensos, com baixa resolução, layouts atípicos e manuscritos podem falhar; a pessoa pode completar os dados manualmente.
- PDFs ficam retidos junto ao cadastro até a exclusão operacional do registro; a interface ainda não oferece exclusão ou retenção automática. OCRmyPDF não é uma barreira antimalware isolada; o processamento é executado em container restrito e com limites de recursos.
- Modo `memory` perde os registros ao reiniciar. Use SQL Server para persistência.
