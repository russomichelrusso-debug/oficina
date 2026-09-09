# @oficina/mobile

Wrapper Capacitor do app web (`apps/web`) para Android, reaproveitando praticamente todo o front-end (ver spec §2).

Este pacote não inclui o projeto nativo Android gerado (pasta `android/`) porque ele é criado localmente pelo Capacitor CLI, que baixa templates do Gradle — passo que precisa ser rodado no computador de quem for empacotar o app, não faz sentido versionar/gerar aqui no scaffold.

## Como gerar o projeto Android

```bash
pnpm --filter @oficina/web build      # gera apps/web/dist
cd apps/mobile
pnpm install
npx cap add android                   # cria a pasta android/ (uma vez)
npx cap sync android                  # copia o build web para o projeto nativo
npx cap open android                  # abre no Android Studio
```

Repita `cap sync android` sempre que o front-end (`apps/web`) for atualizado.
