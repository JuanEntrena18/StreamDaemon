import { EventSubWsListener } from '@twurple/eventsub-ws';
import { ApiClient } from '@twurple/api';
import { authProvider, currentUser } from '../auth/index.js';
import { getIO } from '../socket/index.js';

let listener: EventSubWsListener | null = null;

function emit(channel: string, event: string, data: unknown) {
  getIO().to(`channel:${channel}`).emit(event, data);
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

  try {
    listener.onChannelFollow(userId, userId, (e) => {
      emit(channelName, 'channel:follow', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        userId: e.userId,
        timestamp: Date.now(),
      });
    });
  } catch (e) { console.warn('⚠️ EventSub follow subscription failed:', e); }

  try {
    listener.onChannelSubscription(userId, (e) => {
      emit(channelName, 'channel:subscribe', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        tier: e.tier,
        isGift: e.isGift,
        timestamp: Date.now(),
      });
    });
  } catch (e) { console.warn('⚠️ EventSub subscription subscription failed:', e); }

  try {
    listener.onChannelSubscriptionMessage(userId, (e) => {
      emit(channelName, 'channel:subscription-message', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        tier: e.tier,
        cumulativeMonths: e.cumulativeMonths,
        streakMonths: e.streakMonths,
        messageText: e.messageText,
        timestamp: Date.now(),
      });
    });
  } catch (e) { console.warn('⚠️ EventSub subscription message subscription failed:', e); }

  try {
    listener.onChannelSubscriptionGift(userId, (e) => {
      const gifter = e.isAnonymous ? 'Anónimo' : e.gifterDisplayName;
      emit(channelName, 'channel:subgift', {
        gifterDisplayName: gifter,
        gifterName: e.isAnonymous ? 'anonymous' : e.gifterName,
        tier: e.tier,
        amount: e.amount,
        cumulativeAmount: e.cumulativeAmount,
        timestamp: Date.now(),
      });
    });
  } catch (e) { console.warn('⚠️ EventSub subgift subscription failed:', e); }

  try {
    listener.onChannelRedemptionAdd(userId, (e) => {
      emit(channelName, 'channel:redemption', {
        userDisplayName: e.userDisplayName,
        userName: e.userName,
        rewardTitle: e.rewardTitle,
        rewardCost: e.rewardCost,
        input: e.input,
        timestamp: Date.now(),
      });
    });
  } catch (e) { console.warn('⚠️ EventSub redemption subscription failed:', e); }

  try {
    listener.onChannelCheer(userId, (e) => {
      emit(channelName, 'channel:cheer', {
        userDisplayName: e.userDisplayName ?? 'Anónimo',
        userName: e.userName ?? 'anonymous',
        bits: e.bits,
        message: e.message,
        timestamp: Date.now(),
      });
    });
  } catch (e) { console.warn('⚠️ EventSub cheer subscription failed:', e); }

  console.log(`🎯 EventSub listener started for ${currentUser.displayName}`);
}

export async function stopEventSub() {
  if (listener) {
    await listener.stop();
    listener = null;
    console.log('🛑 EventSub listener stopped');
  }
}
