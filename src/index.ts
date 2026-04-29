#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
    { name: "2captcha-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

const getApiKey = () => process.env.TWOCAPTCHA_API_KEY;

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_balance",
            description: "Check 2captcha account balance",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "solve_recaptcha_v2",
            description: "Solve ReCaptcha V2 and get the token",
            inputSchema: {
                type: "object",
                properties: {
                    url: { type: "string", description: "Target page URL" },
                    sitekey: { type: "string", description: "Google sitekey" }
                },
                required: ["url", "sitekey"]
            }
        }
    ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const apiKey = getApiKey();
    if (!apiKey) return { content: [{ type: "text", text: "Error: TWOCAPTCHA_API_KEY not set" }], isError: true };

    try {
        if (request.params.name === "get_balance") {
            const res = await fetch(`https://api.2captcha.com/res.php?key=${apiKey}&action=getbalance&json=1`);
            const data: any = await res.json();
            return { content: [{ type: "text", text: `Balance: $${data.request}` }] };
        }

        if (request.params.name === "solve_recaptcha_v2") {
            const { url, sitekey } = request.params.arguments as any;
            const inRes = await fetch(`https://api.2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${sitekey}&pageurl=${url}&json=1`);
            const inData: any = await inRes.json();
            
            if (inData.status !== 1) throw new Error(inData.request);

            const taskId = inData.request;
            // Polling
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const res = await fetch(`https://api.2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`);
                const outData: any = await res.json();
                if (outData.status === 1) return { content: [{ type: "text", text: outData.request }] };
                if (outData.request !== "CAPCHA_NOT_READY") throw new Error(outData.request);
            }
            throw new Error("Timeout");
        }
    } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: "Unknown tool" }], isError: true };
});

const transport = new StdioServerTransport();
await server.connect(transport);
