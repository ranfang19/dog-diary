export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const kv = env.DOG_DIARY_KV;

    // 设置 CORS 跨域头
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { headers });
    }

    // 1. 创建共享暗号并初始化数据 (POST)
    if (request.method === "POST") {
        const data = await request.json();
        // 随机生成 6 位数字共享码
        const shareCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 将数据保存到 Cloudflare KV
        await kv.put(`dog_${shareCode}`, JSON.stringify(data));
        
        return new Response(JSON.stringify({ success: true, shareCode }), { headers });
    }

    // 2. 根据暗号拉取最新数据 (GET)
    if (request.method === "GET") {
        const code = url.searchParams.get("code");
        if (!code) return new Response(JSON.stringify({ error: "Missing code" }), { status: 400, headers });

        const rawData = await kv.get(`dog_${code}`);
        if (!rawData) {
            return new Response(JSON.stringify({ error: "口令不存在或已失效" }), { status: 444, headers });
        }
        return new Response(rawData, { headers });
    }

    // 3. 根据暗号更新数据 (PUT)
    if (request.method === "PUT") {
        const code = url.searchParams.get("code");
        if (!code) return new Response(JSON.stringify({ error: "Missing code" }), { status: 400, headers });

        const data = await request.json();
        await kv.put(`dog_${code}`, JSON.stringify(data));
        
        return new Response(JSON.stringify({ success: true }), { headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}