# RDA 0003 — Compatibilidade do Docker Compose para demonstração local

- **Estado:** aceita para uso local
- **Data:** 2026-09-29
- **Contexto:** o runtime Docker disponível rejeita `no-new-privileges` com `operation not permitted` ao iniciar os contêineres da API e do OCR.

## Decisão

Manter `no-new-privileges` no `docker-compose.yml`, que é a configuração base. Criar `docker-compose.demo.yml` para removê-lo somente dos serviços `api` e `ocr` durante a demonstração neste runtime local.

## Controles mantidos

O override preserva filesystem somente leitura, descarte de capabilities, limites de CPU, memória e processos, `tmpfs` com opções restritivas, rede interna do OCR e ausência de porta publicada para o serviço OCR.

## Consequências e limites

- O override reduz uma proteção do kernel e deve ser usado somente em ambiente local controlado.
- Não combinar o override com implantação pública ou produção. Implantação deve usar o Compose base em um runtime que suporte `no-new-privileges`.
- Os comandos locais incluem os dois arquivos explicitamente para tornar visível a exceção.
