import { EventSubWsListener } from '@twurple/eventsub-ws';
import { ApiClient } from '@twurple/api';
import { authProvider, currentUser } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import { recordEvent } from '../activity/index.js';
import { getActiveGiveaway } from '../giveaways/index.js';
import { getAddTicketsFn } from '../chat/index.js';
import { checkFollow } from '../security/index.js';
import { addSubathonTime } from '../subathon/index.js';
import { startStreamSession, endStreamSession, updateStreamGame, incrementSessionFollowers } from '../kpi/session.js';
import crypto from 'crypto';

let listener: EventSubWsListener | null = null;

function emit(channel: string, event: string, data: unknown) {
  getIO().to(`channel:${channel}`).emit(event, data);
}

function trySubscribe(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ EventSub: ${label}`);
  } catch (e) {
    console.warn(`  ⚠️ EventSub: ${label} failed — ${(e as Error)?.message ?? e}`);
  }
}

export async function setupEventSub() {
  if (!authProvider || !currentUser) {
    console.log('⏳ No user logged in, skipping EventSub setup');
    return;
  }

  if (listener) {
    await listener.stop();
    listener = null;
  }

  const apiClient = new ApiClient({ authProvider });
  listener = new EventSubWsListener({ apiClient });
  listener.start();

  const userId = currentUser.id;
  const channelName = currentUser.login;

  console.log(`🎯 Setting up EventSub subscriptions for ${currentUser.displayName}...`);

  trySubscribe('channel.follow', () => {
    listener!.onChannelFollow(userId, userId, (e) => {
      emit(channelName, 'channel:follow', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        userId: e.userId,
        timestamp: Date.now(),
      });
      recordEvent(channelName, 'follow', e.userDisplayName, 'siguió el canal');
      checkFollow(e.userId, e.userName).catch(() => {});
      incrementSessionFollowers(userId);
      addSubathonTime(channelName, {
        id: crypto.randomUUID(), type: 'follow',
        user: e.userDisplayName, amount: 1, timeAdded: 0,
        note: 'New follower', timestamp: Date.now(),
      });
    });
  });

  trySubscribe('channel.subscription', () => {
    listener!.onChannelSubscription(userId, (e) => {
      const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[e.tier] ?? e.tier;
      emit(channelName, 'channel:subscribe', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        tier: e.tier,
        isGift: e.isGift,
        timestamp: Date.now(),
      });
      recordEvent(channelName, 'sub', e.userDisplayName, `se suscribió (${tierLabel})`);
      addSubathonTime(channelName, {
        id: crypto.randomUUID(), type: 'sub',
        user: e.userDisplayName, amount: 1, timeAdded: 0,
        tier: e.tier,
        note: `${tierLabel} subscription`, timestamp: Date.now(),
      });
    });
  });

  trySubscribe('channel.subscription.message', () => {
    listener!.onChannelSubscriptionMessage(userId, (e) => {
      const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[e.tier] ?? e.tier;
      emit(channelName, 'channel:subscription-message', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        tier: e.tier,
        cumulativeMonths: e.cumulativeMonths,
        streakMonths: e.streakMonths,
        messageText: e.messageText,
        timestamp: Date.now(),
      });
      recordEvent(channelName, 'resub', e.userDisplayName, `renovó suscripción (${tierLabel}, ${e.cumulativeMonths} meses)`);
      addSubathonTime(channelName, {
        id: crypto.randomUUID(), type: 'sub',
        user: e.userDisplayName, amount: 1, timeAdded: 0,
        tier: e.tier,
        note: `${tierLabel} resub (${e.cumulativeMonths} meses)`, timestamp: Date.now(),
      });
    });
  });

  trySubscribe('channel.subscription.gift', () => {
    listener!.onChannelSubscriptionGift(userId, (e) => {
      const gifter = e.isAnonymous ? 'Anónimo' : e.gifterDisplayName;
      const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[e.tier] ?? e.tier;
      emit(channelName, 'channel:subgift', {
        gifterDisplayName: gifter,
        gifterName: e.isAnonymous ? 'anonymous' : e.gifterName,
        tier: e.tier,
        amount: e.amount,
        cumulativeAmount: e.cumulativeAmount,
        timestamp: Date.now(),
      });
      recordEvent(channelName, 'gift', gifter, `regaló ${e.amount} suscripción(es) (${tierLabel})`, e.amount);
      for (let i = 0; i < e.amount; i++) {
        addSubathonTime(channelName, {
          id: crypto.randomUUID(), type: 'sub',
          user: gifter, amount: 1, timeAdded: 0,
          tier: e.tier,
          note: `${tierLabel} gift sub`, timestamp: Date.now(),
        });
      }
    });
  });

  trySubscribe('channel.redemption.add', () => {
    listener!.onChannelRedemptionAdd(userId, (e) => {
      emit(channelName, 'channel:redemption', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        rewardTitle: e.rewardTitle,
        rewardCost: e.rewardCost,
        input: e.input,
        timestamp: Date.now(),
      });
      recordEvent(channelName, 'redemption', e.userDisplayName, `canjeó ${e.rewardTitle} (${e.rewardCost} pts)`);

      const active = getActiveGiveaway(channelName);
      console.log(`[Sorteo] Redención de "${e.rewardTitle}" (${e.rewardCost} pts) por ${e.userName}`);
      console.log(`[Sorteo] Sorteo activo:`, active ? `ticketCost=${active.ticketCost}, rewardTitle="${active.ticketRewardTitle}"` : 'ninguno');
      if (active && active.ticketCost > 0 && e.rewardTitle.trim().toLowerCase() === active.ticketRewardTitle.trim().toLowerCase()) {
        const tickets = Math.floor(e.rewardCost / active.ticketCost);
        console.log(`[Sorteo] Coincide! Añadiendo ${tickets} boletos a ${e.userName}`);
        if (tickets > 0) {
          const addTicketsFn = getAddTicketsFn();
          if (addTicketsFn) {
            addTicketsFn(channelName, e.userName, tickets);
          } else {
            console.log('[Sorteo] ERROR: addTicketsFn es null');
          }
        }
      } else if (active) {
        console.log(`[Sorteo] No coincide: "${e.rewardTitle}" !== "${active.ticketRewardTitle}" o ticketCost=${active.ticketCost}`);
      }

      addSubathonTime(channelName, {
        id: crypto.randomUUID(), type: 'tip',
        user: e.userDisplayName, amount: e.rewardCost, timeAdded: 0,
        note: e.rewardTitle, timestamp: Date.now(),
      });
    });
  });

  trySubscribe('channel.cheer', () => {
    listener!.onChannelCheer(userId, (e) => {
      const user = e.userDisplayName ?? 'Anónimo';
      emit(channelName, 'channel:cheer', {
        userDisplayName: user,
        userName: e.userName ?? 'anonymous',
        bits: e.bits,
        message: e.message,
        timestamp: Date.now(),
      });
      recordEvent(channelName, 'cheer', user, `donó ${e.bits} bits`, e.bits);
      addSubathonTime(channelName, {
        id: crypto.randomUUID(), type: 'bits',
        user: user ?? 'Anónimo', amount: e.bits, timeAdded: 0,
        note: `${e.bits} bits`, timestamp: Date.now(),
      });
    });
  });

  trySubscribe('channel.raid', () => {
    listener!.onChannelRaidTo(userId, (e) => {
      emit(channelName, 'channel:raid', {
        fromChannel: e.raidingBroadcasterName,
        fromDisplayName: e.raidingBroadcasterDisplayName,
        viewerCount: e.viewers,
        timestamp: Date.now(),
      });
      recordEvent(channelName, 'raid', e.raidingBroadcasterDisplayName, `hizo raid con ${e.viewers} espectadores`, e.viewers);
    });
  });

  trySubscribe('stream.online', () => {
    listener!.onStreamOnline(userId, async (e) => {
      console.log(`[Stream] ${channelName} is live!`);
      const stream = await e.getStream();
      startStreamSession(userId, e.id, stream?.gameName || 'General');
    });
  });

  trySubscribe('stream.offline', () => {
    listener!.onStreamOffline(userId, (e) => {
      console.log(`[Stream] ${channelName} is offline.`);
      endStreamSession(userId);
    });
  });

  trySubscribe('channel.update', () => {
    listener!.onChannelUpdate(userId, (e) => {
      updateStreamGame(userId, e.categoryName || 'General');
    });
  });

  console.log(`✅ EventSub listener started for ${currentUser.displayName}`);
}

export async function stopEventSub() {
  if (listener) {
    await listener.stop();
    listener = null;
    console.log('🛑 EventSub listener stopped');
  }
}
