import { prisma } from '../auth/index.js';

let activeSessions = new Map<string, string>(); // userId -> sessionId

export async function startStreamSession(userId: string, streamId: string | undefined, gameName: string) {
  try {
    // End any existing session just in case
    await endStreamSession(userId);

    const session = await prisma.streamSession.create({
      data: {
        userId,
        streamId,
        gameName: gameName || 'General',
      }
    });
    activeSessions.set(userId, session.id);
    console.log(`[KPI] Started stream session for ${gameName}`);
  } catch (err) {
    console.error(`[KPI] Failed to start stream session:`, err);
  }
}

export async function endStreamSession(userId: string) {
  try {
    const sessionId = activeSessions.get(userId);
    if (!sessionId) return;

    const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
    if (session) {
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
      
      await prisma.streamSession.update({
        where: { id: sessionId },
        data: {
          endedAt: now,
          durationSeconds
        }
      });
      console.log(`[KPI] Ended stream session ${session.gameName}`);
    }
    activeSessions.delete(userId);
  } catch (err) {
    console.error(`[KPI] Failed to end stream session:`, err);
  }
}

export async function updateStreamGame(userId: string, newGameName: string, streamId?: string) {
  try {
    const sessionId = activeSessions.get(userId);
    
    // If no active session, start one
    if (!sessionId) {
      await startStreamSession(userId, streamId, newGameName);
      return;
    }

    const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      await startStreamSession(userId, streamId, newGameName);
      return;
    }

    // If game changed, split the session
    if (session.gameName !== newGameName) {
      console.log(`[KPI] Category changed from ${session.gameName} to ${newGameName}, splitting session.`);
      await endStreamSession(userId);
      await startStreamSession(userId, streamId || session.streamId || undefined, newGameName);
    }
  } catch (err) {
    console.error(`[KPI] Failed to update stream game:`, err);
  }
}

export async function incrementSessionFollowers(userId: string) {
  try {
    const sessionId = activeSessions.get(userId);
    if (!sessionId) return;

    await prisma.streamSession.update({
      where: { id: sessionId },
      data: { followersGained: { increment: 1 } }
    });
  } catch (err) {
    console.error(`[KPI] Failed to increment session followers:`, err);
  }
}

export async function updateSessionViewers(userId: string, viewers: number) {
  try {
    const sessionId = activeSessions.get(userId);
    if (!sessionId) return;

    const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
    if (!session) return;

    if (viewers > session.viewersMax) {
      await prisma.streamSession.update({
        where: { id: sessionId },
        data: { viewersMax: viewers }
      });
    }
  } catch (err) {
    console.error(`[KPI] Failed to update session viewers:`, err);
  }
}
