# RDA 0002 — Acesso, persistência selecionável e OCR local

- **Estado:** aceita
- **Contexto:** evoluir a demonstração para permitir cadastro público, proteger consultas de candidatos, alternar persistência e processar PDFs digitalizados. Esta decisão substitui as decisões de ausência de autenticação e OCR em texto puro da RDA 0001.

## Decisões

1. Recrutadores usam autenticação local, sem alta pública, Argon2id e sessão em cookie HttpOnly. Um seeder cria a conta inicial somente a partir de variáveis externas ao repositório. Lista e detalhe exigem sessão na interface e na API; cadastro e extração seguem públicos.
2. `STORAGE_MODE` escolhe `sqlserver` (padrão persistente) ou `memory` (temporário) por adapters que implementam o mesmo contrato. Migrations SQL são incrementais e mantêm os candidatos já existentes.
3. PDF.js tenta extrair texto primeiro. Currículos sem texto suficiente seguem para OCRmyPDF/Tesseract local (`por+eng`) sem serviço externo. Arquivos ficam em temporários apagados ao fim, com limites de tamanho, páginas, duração, concorrência e recursos do container.
4. Após cadastro anônimo, mostrar confirmação e caminho para login, sem conceder acesso ao detalhe. Após cadastro autenticado, abrir detalhe protegido.
5. Logs técnicos incluem resultado e duração dos processos, sem credenciais, cookies, payloads, dados pessoais, arquivo PDF ou conteúdo extraído.

## Consequências e riscos

- O armazenamento em memória serve para demonstração e testes e perde dados no reinício; SQL Server é necessário para retenção.
- A leitura continua heurística e pode errar ou não reconhecer PDFs com baixa qualidade, proteção, layout atípico ou escrita manual.
- Em uma validação manual, o PDF não continha e-mail nem telefone no contato; esses campos ficaram vazios como esperado e o falso positivo numérico foi corrigido com validação de tamanho, DDD brasileiro, prefixo internacional ou rótulo de contato. Cargo e resumo continuam manuais.
- O timeout do OCR encerra o grupo inteiro de processos, evitando que Tesseract continue ativo após o processo pai ser interrompido.
- OCRmyPDF não substitui isolamento de arquivos hostis. O container sem porta pública, com filesystem somente leitura, tmpfs e limites é parte obrigatória da arquitetura.
- Não há gestão completa de contas, papéis, recuperação de senha ou MFA. O uso segue local/controlado até uma revisão de implantação.

## Alternativas consideradas

- OAuth/OIDC: rejeitado para esta prova por não existir provedor requerido e por exigir configuração externa; login local atende o acesso controlado.
- OCR em nuvem: rejeitado para evitar transferir currículos pessoais e criar dependência externa.
- Guardar temporariamente o PDF em disco persistente: rejeitado porque não é necessário para a extração e ampliaria retenção de dados pessoais.
