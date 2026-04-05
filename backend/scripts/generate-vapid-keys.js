import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('Add these to backend/.env (restart the server after saving):\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log(
  '\nThe frontend does not need these in Vite env: it loads the public key from GET /api/push/vapid-public-key.\n'
);
