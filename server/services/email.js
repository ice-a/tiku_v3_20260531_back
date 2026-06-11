import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { getHitokoto } from './hitokoto.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

function assertSmtpConfig() {
  const missing = [];
  if (!config.smtp.host) missing.push('SMTP_HOST');
  if (!config.smtp.user) missing.push('SMTP_USER');
  if (!config.smtp.pass) missing.push('SMTP_PASS');
  if (!config.smtp.from) missing.push('SMTP_FROM');

  if (missing.length) {
    throw new Error(`邮件服务未配置完整，请检查 ${missing.join(', ')}`);
  }
}

function buildHitokotoHtml(quote) {
  const source = quote.from
    ? `${quote.fromWho ? quote.fromWho + ' ' : ''}《${quote.from}》`
    : '';
  return `
    <div style="margin-top:24px;padding:16px 20px;background:#f8f9fa;border-left:3px solid #6366f1;border-radius:4px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6366f1;font-weight:600;">今日一言</p>
      <p style="margin:0;font-size:14px;color:#475569;font-style:italic;line-height:1.6;">"${quote.text}"</p>
      ${source ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8;text-align:right;">—— ${source}</p>` : ''}
    </div>
  `;
}

function wrapTemplate(title, bodyHtml, quote) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">题库系统</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a2e;">${title}</h2>
      ${bodyHtml}
      ${buildHitokotoHtml(quote)}
    </div>
    <div style="padding:16px 32px;background:#f8f9fa;border-top:1px solid #e8ecf1;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">此邮件由系统自动发送，请勿直接回复</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendMail(to, subject, title, bodyHtml) {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAILS === '1') {
    return;
  }

  assertSmtpConfig();

  const quote = await getHitokoto({ refresh: true });
  const html = wrapTemplate(title, bodyHtml, quote);

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  });
}

export async function sendRegisterEmail(user) {
  const body = `
    <p style="margin:0 0 12px;color:#334155;line-height:1.6;">
      恭喜你，账号已注册成功。欢迎加入题库系统！
    </p>
    <p style="margin:0;color:#64748b;font-size:14px;">
      用户名：<strong>${user.username}</strong><br>
      邮箱：<strong>${user.email}</strong>
    </p>
  `;
  await sendMail(user.email, '欢迎注册题库系统', '欢迎加入！', body);
}

export async function sendLoginEmail(user) {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const body = `
    <p style="margin:0 0 12px;color:#334155;line-height:1.6;">
      你的账号刚刚成功登录。
    </p>
    <p style="margin:0;color:#64748b;font-size:14px;">
      登录时间：${now}
    </p>
    <p style="margin:12px 0 0;color:#94a3b8;font-size:13px;">
      如果这不是你本人操作，请立即修改密码。
    </p>
  `;
  await sendMail(user.email, '登录通知 - 题库系统', '登录通知', body);
}

export async function sendEmailVerificationEmail(user, verifyToken) {
  const verifyUrl = `${config.appUrl}/verify-email?token=${verifyToken}&userId=${user._id}`;
  const body = `
    <p style="margin:0 0 12px;color:#334155;line-height:1.6;">
      你正在绑定邮箱，点击下方按钮完成验证。链接 30 分钟内有效。
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${verifyUrl}"
         style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
        验证邮箱
      </a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;">
      如果按钮无法点击，请复制以下链接到浏览器打开：<br>
      <a href="${verifyUrl}" style="color:#6366f1;word-break:break-all;">${verifyUrl}</a>
    </p>
  `;
  await sendMail(user.email, '邮箱验证 - 题库系统', '验证你的邮箱', body);
}

export async function sendResetPasswordEmail(user, resetToken) {
  const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;
  const body = `
    <p style="margin:0 0 12px;color:#334155;line-height:1.6;">
      你正在重置密码，点击下方按钮设置新密码。链接 30 分钟内有效。
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
        重置密码
      </a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;">
      如果按钮无法点击，请复制以下链接到浏览器打开：<br>
      <a href="${resetUrl}" style="color:#6366f1;word-break:break-all;">${resetUrl}</a>
    </p>
  `;
  await sendMail(user.email, '重置密码 - 题库系统', '重置密码', body);
}
