<script setup lang="ts">
import { Cpu } from '@lucide/vue'
</script>

<template>
  <main class="min-h-screen bg-canvas text-foreground lg:grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
    <aside class="auth-circuit relative hidden min-h-screen flex-col justify-between overflow-hidden p-10 text-auth-foreground lg:flex xl:p-14">
      <div class="relative z-10 flex items-center gap-3">
        <span class="grid h-11 w-11 place-items-center rounded-panel border border-auth-foreground/15 bg-auth-foreground/10 text-auth-accent">
          <Cpu :size="22" aria-hidden="true" />
        </span>
        <div>
          <p class="text-sm font-bold tracking-tight">ChipTest</p>
          <p class="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-auth-muted">Chiptronic</p>
        </div>
      </div>

      <div class="relative z-10 max-w-xl">
        <p class="inline-flex items-center gap-2 rounded-full border border-auth-accent/20 bg-auth-accent/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-auth-accent">
          <span class="h-1.5 w-1.5 rounded-full bg-auth-accent" />
          Diagnóstico e validação veicular
        </p>
        <h1 class="mt-7 text-5xl font-bold tracking-[-0.055em] xl:text-6xl">Precisão em cada teste.</h1>
        <p class="mt-5 max-w-md text-base leading-7 text-auth-muted">Testes de veículos por código, com informações técnicas e validações organizadas em um só lugar.</p>
      </div>

      <div class="relative z-10 flex items-center justify-between gap-6 border-t border-auth-foreground/10 pt-5 text-xs text-auth-muted">
        <span>Plataforma de engenharia da Chiptronic</span>
        <span class="font-mono">CHIPTEST / 01</span>
      </div>
    </aside>

    <section class="relative flex min-h-screen items-center justify-center px-5 py-14 sm:px-8 lg:px-12">
      <div class="absolute right-5 top-5 sm:right-8 sm:top-8">
        <UiThemeToggle />
      </div>
      <div class="w-full max-w-md">
        <div class="mb-9 lg:hidden">
          <div class="flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-card bg-primary text-primary-foreground"><Cpu :size="20" aria-hidden="true" /></span>
            <div>
              <p class="font-bold tracking-tight">ChipTest</p>
              <p class="text-xs text-foreground-muted">Chiptronic</p>
            </div>
          </div>
          <p class="mt-4 text-sm text-foreground-muted">Testes de veículos por código</p>
        </div>
        <slot />
        <p class="mt-10 text-center text-[11px] text-foreground-subtle">Ambiente seguro · Chiptronic</p>
      </div>
    </section>
  </main>
</template>
