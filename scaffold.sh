#!/usr/bin/env bash
set -euo pipefail

# Aegis monorepo scaffold.
# Creates the directory tree, root config files, and the plain-TypeScript
# package skeletons. The framework apps (web, api, workers) are created by
# their own generators afterward; this script only makes their dirs + .gitkeep.
# Safe to run in an empty folder. Uses mkdir -p and will not overwrite files
# that already exist.

ROOT="${1:-.}"
cd "$ROOT"

echo "Scaffolding Aegis monorepo in: $(pwd)"

# ---------- directories ----------
mkdir -p apps/web apps/api
mkdir -p packages/workers
mkdir -p packages/risk-engine/src
mkdir -p packages/connectors/src
mkdir -p packages/db/src packages/db/prisma
mkdir -p packages/shared/src
mkdir -p .vscode .github/workflows

# framework apps are filled by their generators; keep the dirs tracked for now
touch apps/web/.gitkeep apps/api/.gitkeep packages/workers/.gitkeep

# helper: write a file only if it does not already exist
write() { # write <path> ; reads content from stdin
  local path="$1"
  if [ -e "$path" ]; then
    echo "  skip (exists): $path"
  else
    cat > "$path"
    echo "  created: $path"
  fi
}

# ---------- root config ----------
write pnpm-workspace.yaml <<'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

write tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true
  }
}
EOF

write turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": {},
    "test": { "dependsOn": ["^build"] }
  }
}
EOF

write package.json <<'EOF'
{
  "name": "aegis",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "latest"
  }
}
EOF

write docker-compose.yml <<'EOF'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: aegis
      POSTGRES_PASSWORD: aegis
      POSTGRES_DB: aegis
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes:
  pgdata:
EOF

write .env.example <<'EOF'
DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis
REDIS_URL=redis://localhost:6379
META_APP_ID=
META_APP_SECRET=
KMS_KEY_ID=
STRIPE_SECRET_KEY=
RESEND_API_KEY=
EOF

write .gitignore <<'EOF'
node_modules/
dist/
.next/
.turbo/
.env
.env.*
!.env.example
*.log
.DS_Store
EOF

write .vscode/settings.json <<'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
EOF

write CLAUDE.md <<'EOF'
# CLAUDE.md

Placeholder. Fill this in before the second feature.
It should encode: the stack, directory structure, naming, the error model,
the testing approach, all locked decisions from AEGIS_README.md, explicit
non-goals per area, and the rule that architecture and final merge approval
stay human. See AEGIS_DEVELOPMENT.md section 10.
EOF

# ---------- plain-TS package skeletons ----------
make_ts_package() { # make_ts_package <dir> <pkgName>
  local dir="$1"
  local name="$2"

  write "$dir/package.json" <<EOF
{
  "name": "@aegis/${name}",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
EOF

  write "$dir/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

  write "$dir/src/index.ts" <<EOF
export {};
// @aegis/${name} entry point
EOF
}

make_ts_package packages/risk-engine risk-engine
make_ts_package packages/connectors  connectors
make_ts_package packages/db          db
make_ts_package packages/shared      shared

echo ""
echo "Skeleton done. Next steps (run from repo root):"
echo "  1) pnpm create next-app@latest apps/web --ts --tailwind --app --eslint --src-dir --use-pnpm"
echo "  2) pnpm dlx @nestjs/cli new apps/api --package-manager pnpm --skip-git"
echo "  3) pnpm dlx @nestjs/cli new packages/workers --package-manager pnpm --skip-git"
echo "  4) cd packages/db && pnpm add prisma @prisma/client && pnpm dlx prisma init"
echo "     then paste the schema from AEGIS_DATA_MODEL.md"
echo "  5) pnpm install"
echo "  (remove the .gitkeep files in apps/web, apps/api, packages/workers after generating)"