import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nodemailer from "nodemailer";
import { send } from "../src/config/MailConfig";

describe("mail templates", () => {
  it("builds confirmation, reset, and registration messages", async (t) => {
    const messages: Record<string, unknown>[] = [];
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async (message: Record<string, unknown>) => {
        messages.push(message);
        return { messageId: `mail-${messages.length}` };
      },
    } as any));

    assert.equal(await send({ type: "email", data: { username: "new@example.com" }, email: "new@example.com", user: "Alice", expire: "soon" }), "Message sent: %s, mail-1");
    assert.equal(await send({ type: "reset", data: { username: "alice" }, email: "alice@example.com", user: "Alice", code: "1234", expire: "soon" }), "Message sent: %s, mail-2");
    assert.equal(await send({ type: "register", data: { username: "bob" }, email: "bob@example.com", user: "Bob", code: "5678", expire: "later" }), "Message sent: %s, mail-3");
    assert.equal(await send({ type: "register", data: { username: "anonymous" }, email: "anon@example.com", user: "", expire: "later" }), "Message sent: %s, mail-4");

    assert.match(String(messages[0].html), /#\/confirm\?/);
    assert.equal(messages[0].subject, "《慕课网前端全栈实践》确认修改邮件链接");
    assert.match(String(messages[1].html), /#\/reset\?/);
    assert.equal(messages[1].subject, "你好开发者，Alice！《慕课网前端全栈实践》重置密码链接！");
    assert.equal(messages[2].subject, "你好开发者，Bob！《慕课网前端全栈实践》注册码！");
    assert.equal(messages[3].subject, "《慕课网前端全栈实践》确认修改邮件链接");
  });
});
