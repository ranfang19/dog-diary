function randomCode() {
  // 生成一个 6 位数字暗号
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/sync") {
      const method = request.method;
      const code = url.searchParams.get("code");

      // 1. 生成新的家庭共享暗号（首次开启同步时调用）
      if (method === "POST" && !code) {
        let shareCode;
        let exists;
        do {
          shareCode = randomCode();
          exists = await env.DOG_DIARY_KV.get("sync:" + shareCode);
        } while (exists); // 极小概率撞码，撞了就重新生成

        let body;
        try {
          body = await request.json();
        } catch (e) {
          return jsonResponse({ error: "请求数据格式不对" }, 400);
        }
        await env.DOG_DIARY_KV.put("sync:" + shareCode, JSON.stringify(body));
        return jsonResponse({ shareCode });
      }

      // 2. 用已有暗号更新数据（每次改动后自动调用）
      if (method === "PUT" && code) {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return jsonResponse({ error: "请求数据格式不对" }, 400);
        }
        await env.DOG_DIARY_KV.put("sync:" + code, JSON.stringify(body));
        return jsonResponse({ ok: true });
      }

      // 3. 用暗号拉取数据（打开网页 / 手动刷新时调用）
      if (method === "GET" && code) {
        const data = await env.DOG_DIARY_KV.get("sync:" + code);
        if (!data) return jsonResponse(null, 404);
        return new Response(data, {
          headers: { "Content-Type": "application/json" },
        });
      }

      return jsonResponse({ error: "请求参数不对" }, 400);
    }

    // 不是 /api/sync 的请求，就是普通打开网页 —— 交给静态文件（index.html）处理
    return env.ASSETS.fetch(request);
  },
};
