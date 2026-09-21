import { randomUUID } from "node:crypto";

export interface IdGenerator {
  next(): string;
}

export const randomIdGenerator: IdGenerator = {
  next: () => randomUUID()
};
