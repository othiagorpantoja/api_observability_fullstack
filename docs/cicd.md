# CI/CD — Workflows

## CI (Build e Typecheck)
- Arquivo: `.github/workflows/ci.yml`
- Dispara em `push` e `pull_request` para `main`.
- Etapas:
  - `actions/checkout@v4`
  - `actions/setup-node@v4` (Node 20)
  - `npm install`
  - `npm run typecheck`
  - `npm run build`

## CD (Terraform)
- Arquivo: `.github/workflows/cd-terraform.yml`
- Disparo manual (`workflow_dispatch`).
- Etapas:
  - `hashicorp/setup-terraform@v3`
  - `terraform init`, `terraform validate`, `terraform plan`
- Habilitar `apply` exige backend remoto e segredos:
  - Configurar `TF_WORKSPACE`, credenciais (se usarmos cloud) e proteger ambientes.

## Melhorias Futuras
- Cache de `node_modules` e `dist` no CI.
- Publicação de imagens em registry.
- Pipeline de CD com approvals e `terraform apply` automatizado em ambientes.
- Linters e testes automatizados.
