# Backend compartilhado

Esta pasta contém schemas Zod e serviços TypeScript usados pelas rotas Nitro em `frontend/server/api/`. A persistência fica no Cloudflare D1 e a autorização é aplicada no servidor, pois D1 não possui políticas RLS.

As rotas devem validar as entradas com os schemas daqui, obter o binding D1 pelo utilitário da aplicação e aplicar as verificações de sessão, papel e estado ativo antes de ler ou alterar dados.
