import { Injectable } from "@nestjs/common";

const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

/**
 * Controle simples de tentativas de login por e-mail (spec §11: "5
 * tentativas inválidas bloqueiam temporariamente o login"). Implementação
 * em memória, suficiente para uma instância única; em produção com múltiplas
 * instâncias, mover para Redis.
 */
@Injectable()
export class LoginAttemptsService {
  private attempts = new Map<string, AttemptRecord>();

  isLocked(email: string): boolean {
    const record = this.attempts.get(email);
    if (!record) return false;
    if (Date.now() - record.firstAttemptAt > LOCK_WINDOW_MS) {
      this.attempts.delete(email);
      return false;
    }
    return record.count >= MAX_ATTEMPTS;
  }

  registerFailure(email: string): void {
    const record = this.attempts.get(email);
    if (!record || Date.now() - record.firstAttemptAt > LOCK_WINDOW_MS) {
      this.attempts.set(email, { count: 1, firstAttemptAt: Date.now() });
      return;
    }
    record.count += 1;
  }

  reset(email: string): void {
    this.attempts.delete(email);
  }
}
