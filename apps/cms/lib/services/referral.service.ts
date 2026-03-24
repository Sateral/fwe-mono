import prisma from "@/lib/prisma";

type CreateCodeInput = {
  ownerUserId: string;
  code: string;
  maxUses?: number | null;
};

export const referralService = {
  async createCode(input: CreateCodeInput) {
    return prisma.referralCode.create({
      data: {
        ownerUserId: input.ownerUserId,
        code: input.code,
        status: "ACTIVE",
        maxUses: input.maxUses ?? null,
      },
    });
  },

  async listCodes() {
    return prisma.referralCode.findMany({
      include: {
        ownerUser: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { uses: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getCodeWithUses(id: string) {
    return prisma.referralCode.findUnique({
      where: { id },
      include: {
        ownerUser: {
          select: { id: true, name: true, email: true },
        },
        uses: {
          include: {
            referredUser: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  async deactivateCode(id: string) {
    return prisma.referralCode.update({
      where: { id },
      data: { status: "DISABLED" },
    });
  },

  async activateCode(id: string) {
    return prisma.referralCode.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
  },
};
