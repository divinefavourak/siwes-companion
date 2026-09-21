import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/core/shared/errors";
import type { TelegramLinkRepository } from "@/src/core/telegram/link-service";

export class PrismaTelegramRepository implements TelegramLinkRepository {
  async createToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    await prisma.telegramLinkToken.create({ data: input });
  }

  async consumeToken(input: { tokenHash: string; telegramUserId: string; username?: string; firstName?: string }) {
    return prisma.$transaction(async (transaction) => {
      const token = await transaction.telegramLinkToken.findUnique({ where: { tokenHash: input.tokenHash } });
      if (!token || token.usedAt || token.expiresAt <= new Date()) throw new AppError("CONFLICT", "This link has expired or was already used");
      const existingTelegram = await transaction.telegramIdentity.findUnique({ where: { telegramUserId: input.telegramUserId } });
      if (existingTelegram && existingTelegram.userId !== token.userId) throw new AppError("CONFLICT", "This Telegram account is already linked");
      const existingUserLink = await transaction.telegramIdentity.findUnique({ where: { userId: token.userId } });
      if (existingUserLink && existingUserLink.telegramUserId !== input.telegramUserId) throw new AppError("CONFLICT", "This account already has another Telegram link");
      await transaction.telegramLinkToken.update({ where: { id: token.id }, data: { usedAt: new Date(), telegramUserId: input.telegramUserId } });
      await transaction.telegramIdentity.upsert({
        where: { userId: token.userId },
        update: { telegramUserId: input.telegramUserId, username: input.username, firstName: input.firstName, lastSeenAt: new Date() },
        create: { userId: token.userId, telegramUserId: input.telegramUserId, username: input.username, firstName: input.firstName }
      });
      return token.userId;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findUserIdByTelegramUser(telegramUserId: string) {
    const identity = await prisma.telegramIdentity.findUnique({ where: { telegramUserId } });
    return identity?.userId ?? null;
  }

  async saveConversationState(input: { userId: string; telegramChatId: string; state: string; payload: Prisma.InputJsonValue }) {
    await prisma.botConversationState.upsert({
      where: { userId: input.userId },
      update: { telegramChatId: input.telegramChatId, state: input.state, payload: input.payload },
      create: { userId: input.userId, telegramChatId: input.telegramChatId, state: input.state, payload: input.payload }
    });
  }

  async getConversationState(userId: string) {
    return prisma.botConversationState.findUnique({ where: { userId } });
  }

  async clearConversationState(userId: string) {
    await prisma.botConversationState.deleteMany({ where: { userId } });
  }

  async recordUpdate(updateId: string): Promise<boolean> {
    try {
      await prisma.telegramUpdate.create({ data: { updateId } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  }
}
