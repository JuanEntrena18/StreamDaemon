import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider } from '@twurple/auth';

const clientId = process.env.TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';
const clientSecret = process.env.TWITCH_CLIENT_SECRET || 'your_secret'; // Actually I can just mock or see if I can use authProvider

import { authProvider } from './src/auth/index.js';
import { getRawData } from '@twurple/common';

async function test() {
  if (!authProvider) { console.log('no auth'); return; }
  const api = new ApiClient({ authProvider });
  const user = await api.users.getUserByName('JuanEntrena18');
  if(!user) return;
  const videos = await api.videos.getVideosByUser(user.id, { limit: 1 });
  if (videos.data.length > 0) {
    console.log(getRawData(videos.data[0]));
  } else {
    console.log('no videos');
  }
}
test().catch(console.error);
