import type { User } from '$lib/types/types';

type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
};

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
    }

    interface PageData {
      user: User | null;
      session: Session | null;
    }

    interface Error {
      message: string;
    }
  }
}

export {};
