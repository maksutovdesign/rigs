import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { randomBytes } from 'crypto'

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCode(userId: string): Promise<string> {
    const existing = await this.prisma.referral.findFirst({
      where: { referrerId: userId, status: 'pending', refereeId: null },
    })
    if (existing) return existing.code

    // Try up to 5 times in case of collision (8 hex chars = ~4 billion combos)
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase()
      try {
        await this.prisma.referral.create({ data: { referrerId: userId, code } })
        return code
      } catch (err: any) {
        // Prisma unique constraint violation
        if (err?.code !== 'P2002') throw err
      }
    }
    throw new Error('Failed to generate unique referral code after 5 attempts')
  }

  async getStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referee: { select: { firstName: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const completed = referrals.filter((r) => r.status === 'completed')
    // Show the CURRENT pending code (the one a new invitee would use),
    // not the most-recently-created one which may already be claimed
    const currentCode = referrals.find((r) => r.status === 'pending' && !r.refereeId)?.code ?? null
    return {
      code: currentCode,
      totalInvited: referrals.length,
      totalCompleted: completed.length,
      totalBonus: completed.reduce((s, r) => s + Number(r.bonusAmount), 0),
      referrals,
    }
  }

  async applyReferral(refereeId: string, code: string): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: { code, status: 'pending', refereeId: null },
    })
    if (!referral || referral.referrerId === refereeId) return
    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { refereeId, status: 'completed', completedAt: new Date() },
    })
  }
}
