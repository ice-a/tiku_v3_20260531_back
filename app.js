import app, { config } from './server/app.js';
import connectDB from './server/config/database.js';

await connectDB();

app.listen(config.port, () => {
  console.log(`服务器已启动，端口: ${config.port}`);
});
