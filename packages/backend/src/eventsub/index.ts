import { EventSubWsListener } from '@twurple/eventsub-ws';
import { ApiClient } from '@twurple/api';
import { authProvider, currentUser } from '../auth/index.js';
import { getIO } from '../socket/index.js';
import { recordEvent } from '../activity/index.js';

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
